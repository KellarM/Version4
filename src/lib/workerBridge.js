// ============================================================
// WORKER BRIDGE — Persistent Audit Worker
//
// A single long-lived Worker instance is maintained so that the
// globalAuditBuffer survives across RUN → Microscope → Export calls.
//
// The persistent worker is recreated only when explicitly reset
// (e.g., when the user starts a new audit batch).
//
// SINGLE SOURCE OF TRUTH:
// The audit buffer is populated ONCE during RUN. Both the Microscope
// and Export read from that same buffer — no re-runs, no new random
// data. This guarantees UI win counts === export win counts exactly.
// ============================================================

let _persistentWorker = null;
let _callId = 0;
const _pendingCalls = new Map(); // callId → { resolve, reject, onProgress, onChunk }

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

  const promise = new Promise((resolve, reject) => {
    _pendingCalls.set(callId, { resolve, reject, onProgress, onChunk: null });
    worker.postMessage({ type: 'RUN', payload: { ...params, callId }, callId });
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

// ── Export (reads directly from the existing audit buffer — NO re-run) ──
// The buffer was populated by the original RUN. Reading it directly here
// guarantees the exported win counts are IDENTICAL to what the UI displayed.
// A re-run would generate a new random simulation and produce different numbers.
export function runExportWithAbort(params, onChunk, onProgress) {
  const callId = ++_callId;
  const worker = getPersistentWorker();
  let aborted = false;

  const promise = new Promise((resolve, reject) => {
    _pendingCalls.set(callId, {
      resolve,
      reject,
      onProgress: onProgress ? (pct) => onProgress(pct) : null,
      onChunk: onChunk ? (chunk) => onChunk(chunk) : null,
    });
    worker.postMessage({
      type: 'RUN_EXPORT',
      payload: { ...params, callId },
      callId,
    });
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