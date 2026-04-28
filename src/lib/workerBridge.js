// ============================================================
// WORKER BRIDGE — Persistent Audit Worker
//
// A single long-lived Worker instance is maintained so that the
// globalAuditBuffer survives across RUN → Microscope → Export calls.
//
// The persistent worker is recreated only when explicitly reset
// (e.g., when the user starts a new audit batch).
//
// Ephemeral workers (export, microscope) talk to the SAME persistent
// worker instance via a shared message-bus pattern, using correlation
// IDs to route responses back to the correct promise.
//
// PER-BET AUDIT CACHE:
// Each completed audit result is stored in _auditCache keyed by
// "betType:betKey". Before exporting, the system re-runs the audit
// for that exact bet using the same round count so the worker buffer
// always matches the UI's displayed win count.
// ============================================================

let _persistentWorker = null;
let _callId = 0;
const _pendingCalls = new Map(); // callId → { resolve, reject, onProgress, onChunk }

// Per-bet audit cache: stores { rounds, handPayouts, rankPayouts, colorPayouts, lhPayout }
// for each completed audit so exports can re-run with the exact same parameters.
const _auditCache = new Map(); // "betType:betKey" → audit params

function getPersistentWorker() {
  if (!_persistentWorker) {
    _persistentWorker = new Worker(
      new URL('../workers/auditWorker.js', import.meta.url),
      { type: 'module' }
    );
    _persistentWorker.onmessage = (e) => {
      const { type, callId, data, done, total, chunk, message } = e.data;

      // Route to the correct pending call
      const pending = callId !== undefined ? _pendingCalls.get(callId) : null;

      if (type === 'PROGRESS') {
        if (pending?.onProgress) pending.onProgress(done / total);
        return;
      }

      if (type === 'EXPORT_CHUNK') {
        if (pending?.onChunk) pending.onChunk(chunk);
        return;
      }

      if (type === 'RESULT' || type === 'MICROSCOPE_RESULT' || type === 'EXPORT_DONE') {
        if (pending) {
          _pendingCalls.delete(callId);
          pending.resolve(data ?? e.data);
        }
        return;
      }

      if (type === 'ERROR') {
        if (pending) {
          _pendingCalls.delete(callId);
          pending.reject(new Error(message));
        }
        return;
      }
    };
    _persistentWorker.onerror = (err) => {
      // Reject all pending calls and reset the worker
      for (const [id, pending] of _pendingCalls) {
        pending.reject(err);
      }
      _pendingCalls.clear();
      _persistentWorker = null;
    };
  }
  return _persistentWorker;
}

export function resetPersistentWorker() {
  if (_persistentWorker) {
    _persistentWorker.terminate();
    _persistentWorker = null;
  }
  for (const pending of _pendingCalls.values()) {
    pending.reject(new Error('Worker reset'));
  }
  _pendingCalls.clear();
}

export function clearAuditCache() {
  _auditCache.clear();
}

function callWorker(type, payload, { onProgress, onChunk } = {}) {
  const callId = ++_callId;
  const worker = getPersistentWorker();

  return new Promise((resolve, reject) => {
    _pendingCalls.set(callId, { resolve, reject, onProgress, onChunk });
    worker.postMessage({ type, payload: { ...payload, callId }, callId });
  });
}

// ── Run audit (RUN) ───────────────────────────────────────────
export function runBetAuditInWorker(params, onProgress) {
  return callWorker('RUN', params, { onProgress });
}

export function runBetAuditWithAbort(params, onProgress) {
  const callId = ++_callId;
  const worker = getPersistentWorker();
  let aborted = false;

  // Cache the audit params so exports can re-run with identical parameters
  const cacheKey = `${params.betType}:${params.betKey}`;
  _auditCache.set(cacheKey, {
    rounds: params.rounds,
    handPayouts: params.handPayouts,
    rankPayouts: params.rankPayouts,
    colorPayouts: params.colorPayouts,
    lhPayout: params.lhPayout,
  });

  const promise = new Promise((resolve, reject) => {
    _pendingCalls.set(callId, { resolve, reject, onProgress, onChunk: null });
    worker.postMessage({ type: 'RUN', payload: { ...params, callId }, callId });
  });

  return {
    promise,
    abort() {
      if (!aborted) {
        aborted = true;
        // Remove from cache since the audit was aborted
        _auditCache.delete(cacheKey);
        const pending = _pendingCalls.get(callId);
        if (pending) {
          _pendingCalls.delete(callId);
          pending.reject(new Error('Aborted'));
        }
        // Reset worker to stop current computation
        resetPersistentWorker();
      }
    },
  };
}

// ── Microscope (reads buffer) ─────────────────────────────────
export function runMicroscopeWithAbort(params) {
  const callId = ++_callId;
  const worker = getPersistentWorker();
  let aborted = false;

  const promise = new Promise((resolve, reject) => {
    _pendingCalls.set(callId, { resolve, reject, onProgress: null, onChunk: null });
    worker.postMessage({ type: 'RUN_MICROSCOPE', payload: { ...params, callId }, callId });
  });

  return {
    promise,
    abort() {
      if (!aborted) {
        aborted = true;
        const pending = _pendingCalls.get(callId);
        if (pending) {
          _pendingCalls.delete(callId);
          pending.reject(new Error('Aborted'));
        }
      }
    },
  };
}

// ── Export (re-runs audit to refresh buffer, then streams CSV) ─
// This guarantees the exported row counts EXACTLY match the UI's
// displayed win totals, regardless of which audit ran last.
export function runExportWithAbort(params, onChunk, onProgress) {
  const cacheKey = `${params.betType}:${params.betKey}`;
  const cached = _auditCache.get(cacheKey);
  let aborted = false;
  let currentAbort = null;

  const promise = (async () => {
    // Step 1: Re-run the audit for this exact bet to refresh the worker buffer.
    // Use cached round count if available, otherwise fall back to params.rows.
    const rerunRounds = cached?.rounds ?? params.rows ?? 100_000;
    const rerunParams = {
      rounds: rerunRounds,
      betType: params.betType,
      betKey: params.betKey,
      handPayouts: cached?.handPayouts ?? params.handPayouts,
      rankPayouts: cached?.rankPayouts ?? params.rankPayouts,
      colorPayouts: cached?.colorPayouts ?? params.colorPayouts,
      lhPayout: cached?.lhPayout ?? params.lhPayout,
      captureLog: false,
    };

    const rerun = runBetAuditWithAbort(rerunParams, null);
    currentAbort = rerun.abort;
    await rerun.promise;
    if (aborted) return;

    // Step 2: Stream the export from the freshly-populated buffer.
    const exportCallId = ++_callId;
    const worker = getPersistentWorker();

    return new Promise((resolve, reject) => {
      currentAbort = () => {
        const pending = _pendingCalls.get(exportCallId);
        if (pending) {
          _pendingCalls.delete(exportCallId);
          pending.reject(new Error('Aborted'));
        }
      };
      _pendingCalls.set(exportCallId, {
        resolve,
        reject,
        onProgress: onProgress ? (pct) => onProgress(pct) : null,
        onChunk: onChunk ? (chunk) => onChunk(chunk) : null,
      });
      worker.postMessage({
        type: 'RUN_EXPORT',
        payload: { ...params, rows: rerunRounds, callId: exportCallId },
        callId: exportCallId,
      });
    });
  })();

  return {
    promise,
    abort() {
      if (!aborted) {
        aborted = true;
        if (currentAbort) currentAbort();
      }
    },
  };
}