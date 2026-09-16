/* ==================================================
   AI Mosaic Studio — Main App v3
   Features:
   - Base image upload + preview
   - Tile drag & drop with thumbnails + count
   - Radio: Auto / Manual mapping
   - Tile size slider (15 to 80)
   - Live opacity sliders
   - HD / 4K export (PNG/JPG/WEBP)
   - Clear tiles button
   - Sharp rendering (no stretching)
   - Cache-busted worker
================================================== */

(function () {
  /* ==================================================
     ELEMENT REFERENCES
  ================================================== */
  const baseInput   = document.getElementById("baseImage");
  const dropZone    = document.getElementById("dropZone");
  const generateBtn = document.getElementById("generateBtn");
  const progressBar = document.getElementById("progressBar");
  const progress    = document.getElementById("progress");
  const canvas      = document.getElementById("resultCanvas");
  const ctx         = canvas ? canvas.getContext("2d") : null;

  const baseOpacityEl = document.getElementById("baseOpacity");
  const tileOpacityEl = document.getElementById("tileOpacity");

  const tilePreview   = document.getElementById("tilePreview");
  const tileCountNum  = document.getElementById("tileCountNum");

  const tileSizeSlider = document.getElementById("tileSizeSlider");
  const tileSizeLabel  = document.getElementById("tileSizeLabel");

  const clearBtn = document.getElementById("clearBtn");

  /* Guard: agar page ke andar zaroori elements nahi hain to chup-chaap exit */
  if (!baseInput || !generateBtn || !canvas || !ctx) {
    console.warn("AI Mosaic Studio: required DOM elements missing.");
    return;
  }

  /* ==================================================
     CONFIG
  ================================================== */
  const CANVAS_SIZE = 2000;   // High-res output
  const BASE_SRC    = 2000;   // Base image working size
  const TILE_SRC    = 160;    // Tile sample size
  const WORKER_URL  = "worker.js?v=3";

  /* ==================================================
     STATE
  ================================================== */
  let baseImage       = null;      // HTMLImageElement
  let tileImages      = [];        // [{img, url, name}]
  let tilePixels      = [];        // [{data, width, height}]
  let basePixels      = null;      // ImageData
  let lastGrid        = null;      // Worker result
  let currentGridSize = 40;
  let rendering       = false;

  /* ==================================================
     TILE SIZE SLIDER
  ================================================== */
  function updateTileSizeLabel() {
    currentGridSize = parseInt(tileSizeSlider.value, 10) || 40;
    if (tileSizeLabel) {
      tileSizeLabel.textContent = currentGridSize + " × " + currentGridSize;
    }
  }

  if (tileSizeSlider) {
    updateTileSizeLabel();
    tileSizeSlider.addEventListener("input", function () {
      updateTileSizeLabel();
      // Auto-regenerate if we already have a base + tiles
      if (baseImage && tileImages.length && basePixels) {
        clearTimeout(window.__regenT);
        window.__regenT = setTimeout(generateMosaic, 350);
      }
    });
  }

  /* ==================================================
     HELPERS
  ================================================== */
  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload  = function () { resolve({ img: img, url: url, name: file.name }); };
      img.onerror = function (e) { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });
  }

  function setProgress(pct) {
    if (progress) progress.style.width = pct + "%";
  }

  function showProgress() {
    if (progressBar) progressBar.style.display = "block";
  }

  function hideProgress() {
    if (progressBar) progressBar.style.display = "none";
    setProgress(0);
  }

  /* ==================================================
     BASE IMAGE
  ================================================== */
  baseInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    loadImage(file).then(function (obj) {
      // Free previous URL
      if (baseImage && baseImage.__url) {
        try { URL.revokeObjectURL(baseImage.__url); } catch (err) {}
      }
      baseImage = obj.img;
      baseImage.__url = obj.url;
      drawBasePreview();
    }).catch(function () {
      alert("Could not load base image.");
    });
  });

  function drawBasePreview() {
    if (!baseImage || !ctx) return;
    canvas.width  = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  /* ==================================================
     TILES — add / preview / remove
  ================================================== */
  function addTileFiles(files) {
    const arr = Array.from(files).filter(function (f) {
      return f.type && f.type.startsWith("image/");
    });
    if (!arr.length) return;

    Promise.all(arr.map(loadImage)).then(function (objs) {
      objs.forEach(function (o) { tileImages.push(o); });
      renderTilePreview();
    }).catch(function () {
      alert("Some tile images could not be loaded.");
    });
  }

  function renderTilePreview() {
    if (!tilePreview || !tileCountNum) return;

    tilePreview.innerHTML = "";
    tileCountNum.textContent = tileImages.length;

    const dz = document.getElementById("dropZone");
    if (dz) dz.classList.toggle("has-tiles", tileImages.length > 0);

    tileImages.forEach(function (obj, idx) {
      const wrap = document.createElement("div");
      wrap.className = "tile-thumb";

      const img = document.createElement("img");
      img.src = obj.url;
      img.alt = obj.name || ("Tile " + (idx + 1));
      img.loading = "lazy";
      wrap.appendChild(img);

      const rm = document.createElement("button");
      rm.className = "remove";
      rm.type = "button";
      rm.textContent = "×";
      rm.title = "Remove tile";
      rm.addEventListener("click", function (ev) {
        ev.stopPropagation();
        try { URL.revokeObjectURL(obj.url); } catch (err) {}
        tileImages.splice(idx, 1);
        renderTilePreview();
      });
      wrap.appendChild(rm);

      tilePreview.appendChild(wrap);
    });
  }

  /* ---- DropZone: click to browse ---- */
  dropZone.addEventListener("click", function () {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.multiple = true;
    inp.accept = "image/*";
    inp.onchange = function (e) { addTileFiles(e.target.files); };
    inp.click();
  });

  /* ---- DropZone: keyboard support ---- */
  dropZone.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      dropZone.click();
    }
  });

  /* ---- DropZone: drag events ---- */
  ["dragenter", "dragover"].forEach(function (ev) {
    dropZone.addEventListener(ev, function (e) {
      e.preventDefault();
      dropZone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    dropZone.addEventListener(ev, function (e) {
      e.preventDefault();
      dropZone.classList.remove("dragover");
    });
  });
  dropZone.addEventListener("drop", function (e) {
    if (e.dataTransfer && e.dataTransfer.files) {
      addTileFiles(e.dataTransfer.files);
    }
  });

  /* ==================================================
     GENERATE MOSAIC
  ================================================== */
  function generateMosaic() {
    if (rendering) return;
    if (!baseImage) { alert("Please select a base image."); return; }
    if (!tileImages.length) { alert("Please add at least one tile image."); return; }

    rendering = true;
    generateBtn.disabled = true;
    showProgress();
    setProgress(10);

    /* ---- Prepare base pixels ---- */
    const bCanvas = document.createElement("canvas");
    bCanvas.width  = BASE_SRC;
    bCanvas.height = BASE_SRC;
    const bCtx = bCanvas.getContext("2d");
    bCtx.imageSmoothingEnabled = true;
    bCtx.imageSmoothingQuality = "high";
    bCtx.drawImage(baseImage, 0, 0, BASE_SRC, BASE_SRC);
    basePixels = bCtx.getImageData(0, 0, BASE_SRC, BASE_SRC);
    setProgress(40);

    /* ---- Prepare tile pixels (center-crop to square) ---- */
    tilePixels = tileImages.map(function (obj) {
      const img = obj.img;
      const iw  = img.naturalWidth  || img.width;
      const ih  = img.naturalHeight || img.height;
      const side = Math.min(iw, ih);
      const sx = (iw - side) / 2;
      const sy = (ih - side) / 2;

      const c = document.createElement("canvas");
      c.width  = TILE_SRC;
      c.height = TILE_SRC;
      const cx = c.getContext("2d");
      cx.imageSmoothingEnabled = true;
      cx.imageSmoothingQuality = "high";
      cx.drawImage(img, sx, sy, side, side, 0, 0, TILE_SRC, TILE_SRC);

      return {
        data: cx.getImageData(0, 0, TILE_SRC, TILE_SRC).data,
        width: TILE_SRC,
        height: TILE_SRC
      };
    });
    setProgress(70);

    /* ---- Launch worker ---- */
    let worker;
    try {
      worker = new Worker(WORKER_URL);
    } catch (err) {
      alert("Worker could not be started: " + err.message);
      generateBtn.disabled = false;
      rendering = false;
      hideProgress();
      return;
    }

    worker.postMessage({
      base: {
        data: basePixels.data,
        width: BASE_SRC,
        height: BASE_SRC
      },
      tiles: tilePixels,
      gridSize: currentGridSize
    });

    worker.onmessage = function (e) {
      if (!e.data || !e.data.ok) {
        alert("Error: " + ((e.data && e.data.error) || "Unknown"));
        hideProgress();
        generateBtn.disabled = false;
        rendering = false;
        worker.terminate();
        return;
      }

      lastGrid = e.data.result;
      render();
      setProgress(100);

      setTimeout(function () {
        hideProgress();
        generateBtn.disabled = false;
        rendering = false;
      }, 600);

      worker.terminate();
    };

    worker.onerror = function (err) {
      alert("Worker error: " + (err.message || "Unknown"));
      hideProgress();
      generateBtn.disabled = false;
      rendering = false;
      worker.terminate();
    };
  }

  generateBtn.addEventListener("click", generateMosaic);

  /* ==================================================
     RENDER — Sharp, no stretching
  ================================================== */
  function render() {
    if (!lastGrid || !baseImage || !ctx) return;

    const grid = lastGrid.grid;
    const cols = lastGrid.cols;
    const rows = lastGrid.rows;

    canvas.width  = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    const cellW = CANVAS_SIZE / cols;
    const cellH = CANVAS_SIZE / rows;

    const baseOp = parseFloat(baseOpacityEl ? baseOpacityEl.value : 1);
    const tileOp = parseFloat(tileOpacityEl ? tileOpacityEl.value : 1);

    /* ---- Base image (smooth) ---- */
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = baseOp;
    ctx.drawImage(baseImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

    /* ---- Tiles (center-cropped, no stretch) ---- */
    ctx.globalAlpha = tileOp;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tileIdx = grid[y][x];
        const t = tileImages[tileIdx];
        if (!t) continue;

        const img = t.img;
        const iw  = img.naturalWidth  || img.width;
        const ih  = img.naturalHeight || img.height;
        const side = Math.min(iw, ih);
        const sx = (iw - side) / 2;
        const sy = (ih - side) / 2;

        const dx = x * cellW;
        const dy = y * cellH;

        ctx.drawImage(img, sx, sy, side, side, dx, dy, cellW, cellH);
      }
    }

    ctx.globalAlpha = 1;
  }

  /* ---- Live opacity sliders ---- */
  if (baseOpacityEl) baseOpacityEl.addEventListener("input", render);
  if (tileOpacityEl) tileOpacityEl.addEventListener("input", render);

  /* ==================================================
     CLEAR TILES
  ================================================== */
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      lastGrid = null;

      canvas.width  = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (baseImage) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
      }

      if (baseOpacityEl) baseOpacityEl.value = 1;
      if (tileOpacityEl) tileOpacityEl.value = 1;
    });
  }

  /* ==================================================
     INIT
  ================================================== */
  // Set initial canvas size
  canvas.width  = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;

  console.log("AI Mosaic Studio v3 ready. Worker:", WORKER_URL);

})();