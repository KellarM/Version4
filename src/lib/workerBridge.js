// Worker Bridge

export function runBetAuditWithAbort(params, onProgress) {
  return { promise: Promise.resolve({ success: true }), abort: () => {} };
}

export function runMicroscopeWithAbort(params) {
  return { promise: Promise.resolve({ success: true }), abort: () => {} };
}

export function runExportWithAbort(params, onChunk, onProgress) {
  return { promise: Promise.resolve({ total: 0 }), abort: () => {} };
}

export function resetPersistentWorker() {
  // placeholder
}