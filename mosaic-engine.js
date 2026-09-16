/* ===================================
   AI Mosaic Studio - Mosaic Engine
=================================== */

function getBrightness(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function calculateGrid(tileCount) {
  return Math.max(1, Math.ceil(Math.sqrt(tileCount)));
}

/**
 * heavyMosaic — runs inside worker
 * payload: { base: {data, width, height}, tiles: [{data,width,height}], gridSize }
 */
function heavyMosaic(payload) {
  const { base, tiles, gridSize = 40 } = payload;
  if (!base || !tiles || !tiles.length) {
    throw new Error("Missing base image or tiles");
  }

  const cols = gridSize;
  const rows = gridSize;
  const cellW = base.width / cols;
  const cellH = base.height / rows;

  // 1. Compute brightness of each tile
  const tileBrightness = tiles.map(function (t) {
    const d = t.data;
    let sum = 0;
    const step = 4 * Math.max(1, Math.floor(d.length / 4000));
    let count = 0;
    for (let i = 0; i < d.length; i += step) {
      sum += getBrightness(d[i], d[i + 1], d[i + 2]);
      count++;
    }
    return sum / Math.max(1, count);
  });

  // 2. Build output grid
  const grid = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      const px = Math.floor(x * cellW + cellW / 2);
      const py = Math.floor(y * cellH + cellH / 2);
      const idx = (py * base.width + px) * 4;
      const b = getBrightness(base.data[idx], base.data[idx + 1], base.data[idx + 2]);

      // pick closest tile
      let best = 0;
      let bestDiff = Infinity;
      for (let i = 0; i < tileBrightness.length; i++) {
        const diff = Math.abs(tileBrightness[i] - b);
        if (diff < bestDiff) { bestDiff = diff; best = i; }
      }
      row.push(best);
    }
    grid.push(row);
  }

  return { grid, cols, rows, cellW, cellH };
}

// expose for worker importScripts
if (typeof self !== "undefined") {
  self.heavyMosaic = heavyMosaic;
  self.getBrightness = getBrightness;
  self.calculateGrid = calculateGrid;
}