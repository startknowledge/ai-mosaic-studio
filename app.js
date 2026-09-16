/* ===================================
   AI Mosaic Studio — Main App (sharp)
=================================== */
(function () {
  const baseInput   = document.getElementById("baseImage");
  const dropZone    = document.getElementById("dropZone");
  const generateBtn = document.getElementById("generateBtn");
  const progressBar = document.getElementById("progressBar");
  const progress    = document.getElementById("progress");
  const canvas      = document.getElementById("resultCanvas");
  const ctx         = canvas.getContext("2d");

  const baseOpacityEl = document.getElementById("baseOpacity");
  const tileOpacityEl = document.getElementById("tileOpacity");

  const tilePreview   = document.getElementById("tilePreview");
  const tileCountNum  = document.getElementById("tileCountNum");

  const tileSizeSlider = document.getElementById("tileSizeSlider");
  const tileSizeLabel  = document.getElementById("tileSizeLabel");

  /* ---------- CONFIG ---------- */
  const CANVAS_SIZE = 2000;      // high-res canvas
  const TILE_SRC    = 160;       // source tile resolution (sharp)
  const BASE_SRC    = 2000;      // base image working resolution

  let baseImage  = null;
  let tileImages = [];
  let tilePixels = [];
  let basePixels = null;
  let lastGrid   = null;
  let currentGridSize = 40;
  let rendering = false;

  /* ---------- Tile size label ---------- */
  function updateTileSizeLabel() {
    currentGridSize = parseInt(tileSizeSlider.value, 10);
    tileSizeLabel.textContent = currentGridSize + " × " + currentGridSize;
  }
  updateTileSizeLabel();
  tileSizeSlider.addEventListener("input", function () {
    updateTileSizeLabel();
    if (baseImage && tileImages.length && basePixels) {
      clearTimeout(window.__regenT);
      window.__regenT = setTimeout(generateMosaic, 350);
    }
  });

  /* ---------- Load image helper ---------- */
  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload  = function () { resolve({ img: img, url: url, name: file.name }); };
      img.onerror = function (e) { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });
  }

  /* ---------- Base image ---------- */
  baseInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;
    loadImage(file).then(function (obj) {
      if (baseImage && baseImage.__url) URL.revokeObjectURL(baseImage.__url);
      baseImage = obj.img;
      baseImage.__url = obj.url;
      drawBasePreview();
    });
  });

  /* ---------- Tiles ---------- */
  function addTileFiles(files) {
    const arr = Array.from(files).filter(function (f) {
      return f.type && f.type.startsWith("image/");
    });
    if (!arr.length) return;

    Promise.all(arr.map(loadImage)).then(function (objs) {
      objs.forEach(function (o) { tileImages.push(o); });
      renderTilePreview();
    });
  }

  function renderTilePreview() {
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
      rm.addEventListener("click", function (e) {
        e.stopPropagation();
        URL.revokeObjectURL(obj.url);
        tileImages.splice(idx, 1);
        renderTilePreview();
      });
      wrap.appendChild(rm);

      tilePreview.appendChild(wrap);
    });
  }

  dropZone.addEventListener("click", function () {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.multiple = true;
    inp.accept = "image/*";
    inp.onchange = function (e) { addTileFiles(e.target.files); };
    inp.click();
  });

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
    addTileFiles(e.dataTransfer.files);
  });

  /* ---------- Generate ---------- */
  function generateMosaic() {
    if (rendering) return;
    if (!baseImage) { alert("Please select a base image."); return; }
    if (!tileImages.length) { alert("Please add at least one tile image."); return; }

    rendering = true;
    generateBtn.disabled = true;
    progressBar.style.display = "block";
    progress.style.width = "10%";

    /* --- Prepare base pixels (high-res) --- */
    const bCanvas = document.createElement("canvas");
    bCanvas.width = BASE_SRC;
    bCanvas.height = BASE_SRC;
    const bCtx = bCanvas.getContext("2d");
    bCtx.imageSmoothingEnabled = true;
    bCtx.imageSmoothingQuality = "high";
    bCtx.drawImage(baseImage, 0, 0, BASE_SRC, BASE_SRC);
    basePixels = bCtx.getImageData(0, 0, BASE_SRC, BASE_SRC);
    progress.style.width = "40%";

    /* --- Prepare tile pixels (sharp, high-res) --- */
        tilePixels = tileImages.map(function (obj) {
      const img = obj.img;
      const iw = img.naturalWidth  || img.width;
      const ih = img.naturalHeight || img.height;
      const side = Math.min(iw, ih);       // center-crop square
      const sx = (iw - side) / 2;
      const sy = (ih - side) / 2;

      const c = document.createElement("canvas");
      c.width = TILE_SRC;
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
    progress.style.width = "70%";

    const worker = new Worker("worker.js");
    worker.postMessage({
      base: { data: basePixels.data, width: BASE_SRC, height: BASE_SRC },
      tiles: tilePixels,
      gridSize: currentGridSize
    });

    worker.onmessage = function (e) {
      if (!e.data.ok) {
        alert("Error: " + e.data.error);
        progressBar.style.display = "none";
        generateBtn.disabled = false;
        rendering = false;
        return;
      }
      lastGrid = e.data.result;
      render();
      progress.style.width = "100%";
      setTimeout(function () {
        progressBar.style.display = "none";
        generateBtn.disabled = false;
        rendering = false;
      }, 600);
      worker.terminate();
    };

    worker.onerror = function (err) {
      alert("Worker error: " + err.message);
      progressBar.style.display = "none";
      generateBtn.disabled = false;
      rendering = false;
    };
  }

  generateBtn.addEventListener("click", generateMosaic);

  /* ---------- Render (SHARP) ---------- */
    /* ---------- Render (SHARP + no stretching) ---------- */
  function render() {
    if (!lastGrid || !baseImage) return;

    const grid = lastGrid.grid;
    const cols = lastGrid.cols;
    const rows = lastGrid.rows;

    canvas.width  = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    const cellW = CANVAS_SIZE / cols;
    const cellH = CANVAS_SIZE / rows;

    const baseOp = parseFloat(baseOpacityEl.value);
    const tileOp = parseFloat(tileOpacityEl.value);

    /* ---- Base image (smooth) ---- */
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = baseOp;
    ctx.drawImage(baseImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

    /* ---- Tiles (center-crop to square → NO stretching) ---- */
    ctx.globalAlpha = tileOp;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tileIdx = grid[y][x];
        const t = tileImages[tileIdx];
        if (!t) continue;

        const img = t.img;
        const iw = img.naturalWidth  || img.width;
        const ih = img.naturalHeight || img.height;

        /* Center-crop source to square (prevents stretch artifacts) */
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

  baseOpacityEl.addEventListener("input", render);
  tileOpacityEl.addEventListener("input", render);

  function drawBasePreview() {
    if (!baseImage) return;
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  /* ---------- Clear Tiles ---------- */
  const clearBtn = document.getElementById("clearBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      lastGrid = null;
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (baseImage) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
      }
      baseOpacityEl.value = 1;
      tileOpacityEl.value = 1;
    });
  }
})();