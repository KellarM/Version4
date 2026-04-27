// Audit Worker — handles RUN, RUN_MICROSCOPE, RUN_EXPORT messages
let globalAuditBuffer = null;

self.onmessage = async (e) => {
  const { type, payload, callId } = e.data;

  try {
    if (type === 'RUN') {
      // Placeholder: run audit and store result in buffer
      globalAuditBuffer = { success: true, rounds: payload.rounds, callId };
      self.postMessage({ type: 'RESULT', callId, data: globalAuditBuffer });
    } else if (type === 'RUN_MICROSCOPE') {
      // Placeholder: read from buffer and return microscope log
      self.postMessage({ type: 'MICROSCOPE_RESULT', callId, data: globalAuditBuffer || { success: false } });
    } else if (type === 'RUN_EXPORT') {
      // Placeholder: export buffer as CSV chunks
      if (globalAuditBuffer) {
        self.postMessage({ type: 'EXPORT_CHUNK', callId, chunk: 'seq,result\n' });
        self.postMessage({ type: 'EXPORT_DONE', callId, data: { total: 0 } });
      } else {
        self.postMessage({ type: 'EXPORT_DONE', callId, data: { total: 0 } });
      }
    }
  } catch (err) {
    self.postMessage({ type: 'ERROR', callId, message: err.message });
  }
};