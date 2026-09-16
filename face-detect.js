/* ===================================
   AI Mosaic Studio — Manual body-part mapping
=================================== */
(function () {
  const dynamicInputs = document.getElementById("dynamicInputs");
  const manualRadio   = document.getElementById("manualMapping");
  const autoRadio     = document.getElementById("autoSet");
  if (!dynamicInputs || !manualRadio || !autoRadio) return;

  const parts = ["Eyes", "Nose", "Mouth", "Body"];

  function buildInputs() {
    dynamicInputs.innerHTML = "";
    if (!manualRadio.checked) return;

    parts.forEach(function (p) {
      const wrap = document.createElement("label");

      const span = document.createElement("span");
      span.textContent = "Upload for " + p + ": ";
      span.style.marginRight = "8px";

      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.dataset.part = p;

      wrap.appendChild(span);
      wrap.appendChild(input);
      dynamicInputs.appendChild(wrap);
    });
  }

  autoRadio.addEventListener("change", function () {
    if (autoRadio.checked) {
      manualRadio.checked = false;
      buildInputs();
    }
  });

  manualRadio.addEventListener("change", function () {
    if (manualRadio.checked) {
      autoRadio.checked = false;
      buildInputs();
    }
  });

  buildInputs();
})();