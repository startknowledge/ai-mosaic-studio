/* AI Mosaic Studio - Web Worker */
importScripts("mosaic-engine.js");

self.onmessage = function (e) {
  try {
    const result = self.heavyMosaic(e.data);
    self.postMessage({ ok: true, result: result });
  } catch (err) {
    self.postMessage({ ok: false, error: err.message });
  }
};