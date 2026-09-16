/* ===================================
   AI Mosaic Studio — Main App
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

  let baseImage  = null;               // HTMLImageElement
  let tileImages = [];                 // [{img, url}]
  let tilePixels = [];                 // [{data,width,height}]
  let basePixels = null;               // ImageData
  let lastGrid   = null;               // worker result
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
      // debounce regenerate
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

    // Prepare base pixels (800x800)
    const bCanvas = document.createElement("canvas");
    bCanvas.width = 800;
    bCanvas.height = 800;
    const bCtx = bCanvas.getContext("2d");
    bCtx.drawImage(baseImage, 0, 0, 800, 800);
    basePixels = bCtx.getImageData(0, 0, 800, 800);
    progress.style.width = "40%";

    // Prepare tile pixels (48x48 thumbs for speed)
    tilePixels = tileImages.map(function (obj) {
      const c = document.createElement("canvas");
      c.width = 48;
      c.height = 48;
      const cx = c.getContext("2d");
      cx.drawImage(obj.img, 0, 0, 48, 48);
      return { data: cx.getImageData(0, 0, 48, 48).data, width: 48, height: 48 };
    });
    progress.style.width = "70%";

    const worker = new Worker("worker.js");
    worker.postMessage({
      base: { data: basePixels.data, width: 800, height: 800 },
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

  /* ---------- Render ---------- */
  function render() {
    if (!lastGrid || !baseImage) return;
    const grid = lastGrid.grid;
    const cols = lastGrid.cols;
    const rows = lastGrid.rows;
    const cellW = lastGrid.cellW;
    const cellH = lastGrid.cellH;

    canvas.width = 800;
    canvas.height = 800;

    const baseOp = parseFloat(baseOpacityEl.value);
    const tileOp = parseFloat(tileOpacityEl.value);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // base with opacity
    ctx.globalAlpha = baseOp;
    ctx.drawImage(baseImage, 0, 0, 800, 800);
    ctx.globalAlpha = 1;

    // tiles with opacity
    ctx.globalAlpha = tileOp;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tileIdx = grid[y][x];
        const t = tileImages[tileIdx];
        if (t) ctx.drawImage(t.img, x * cellW, y * cellH, cellW, cellH);
      }
    }
    ctx.globalAlpha = 1;
  }

  baseOpacityEl.addEventListener("input", render);
  tileOpacityEl.addEventListener("input", render);

  function drawBasePreview() {
    if (!baseImage) return;
    canvas.width = 800;
    canvas.height = 800;
    ctx.clearRect(0, 0, 800, 800);
    ctx.drawImage(baseImage, 0, 0, 800, 800);
  }
})();