/* AI Mosaic Studio - Download / Export */
(function () {
  function downloadImage() {
    const canvas = document.getElementById("resultCanvas");
    const qualityEl = document.getElementById("qualitySelect");
    const formatEl = document.getElementById("formatSelect");
    if (!canvas || !qualityEl || !formatEl) return;

    const quality = qualityEl.value;
    const format = formatEl.value;

    let exportCanvas = canvas;

    if (quality === "4k") {
      const tmp = document.createElement("canvas");
      const targetW = 3840;
      const ratio = canvas.height / canvas.width;
      tmp.width = targetW;
      tmp.height = Math.round(targetW * ratio);
      const ctx = tmp.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(canvas, 0, 0, tmp.width, tmp.height);
      exportCanvas = tmp;
    }

    const mime = "image/" + format;
    const link = document.createElement("a");
    link.download = "ai-mosaic." + (format === "jpeg" ? "jpg" : format);
    link.href = exportCanvas.toDataURL(mime, 0.95);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const btn = document.getElementById("downloadBtn");
  if (btn) btn.addEventListener("click", downloadImage);
})();