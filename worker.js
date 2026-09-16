/* ==================================================
   AI Mosaic Studio — Worker v3
   Self-contained. No importScripts. No dependencies.
   Handles: brightness + RGB color matching
================================================== */

/* ---------- Helper: Luma brightness ---------- */
function getBrightness(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/* ---------- Helper: Average color of a tile ---------- */
function avgColor(data) {
  let r = 0, g = 0, b = 0, n = 0;
  // Sample every 4th pixel (16 bytes = 4 px * 4 channels) for speed
  for (let i = 0; i < data.length; i += 16) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  if (!n) return { r: 0, g: 0, b: 0, lum: 0 };
  r /= n;
  g /= n;
  b /= n;
  return { r: r, g: g, b: b, lum: getBrightness(r, g, b) };
}

/* ---------- Main engine: build the mosaic grid ---------- */
function heavyMosaic(payload) {
  const base     = payload.base;
  const tiles    = payload.tiles;
  const gridSize = payload.gridSize || 40;

  if (!base || !tiles || !tiles.length) {
    throw new Error("Missing base image or tiles");
  }

  const cols  = gridSize;
  const rows  = gridSize;
  const cellW = base.width / cols;
  const cellH = base.height / rows;

  /* --- Pre-compute average color of every tile --- */
  const tileColors = tiles.map(function (t) {
    return avgColor(t.data);
  });

  /* --- Build grid: pick best tile for each cell --- */
  const grid = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {

      // Sample the center pixel of the target cell
      const px  = Math.floor(x * cellW + cellW / 2);
      const py  = Math.floor(y * cellH + cellH / 2);
      const idx = (py * base.width + px) * 4;

      const br = base.data[idx];
      const bg = base.data[idx + 1];
      const bb = base.data[idx + 2];
      const bLum = getBrightness(br, bg, bb);

      // Find tile with best color + brightness match
      let best = 0;
      let bestScore = Infinity;
      for (let i = 0; i < tileColors.length; i++) {
        const t = tileColors[i];
        const dr = t.r - br;
        const dg = t.g - bg;
        const db = t.b - bb;
        const colorDist = dr * dr + dg * dg + db * db;       // squared RGB
        const lumDist   = (t.lum - bLum) * (t.lum - bLum);   // brightness
        const score     = colorDist * 0.7 + lumDist * 0.3;   // weighted
        if (score < bestScore) {
          bestScore = score;
          best = i;
        }
      }
      row.push(best);
    }
    grid.push(row);
  }

  return {
    grid: grid,
    cols: cols,
    rows: rows,
    cellW: cellW,
    cellH: cellH
  };
}

/* ---------- Message handler ---------- */
self.onmessage = function (e) {
  try {
    const result = heavyMosaic(e.data);
    self.postMessage({ ok: true, result: result });
  } catch (err) {
    self.postMessage({ ok: false, error: err.message || String(err) });
  }
};