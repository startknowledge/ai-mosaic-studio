/* ===================================
   AI Mosaic Studio — Theme + Info icons
=================================== */
(function () {
  /* ---------- Theme (dark default) ---------- */
  const toggle = document.getElementById("themeToggle");

  // Default: dark (no class = dark from :root)
  // Light mode = body.light
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.body.classList.add("light");
      if (toggle) toggle.textContent = "🌙";
    } else {
      if (toggle) toggle.textContent = "☀️";
    }
  } catch (e) {}

  if (toggle) {
    toggle.addEventListener("click", function () {
      document.body.classList.toggle("light");
      const isLight = document.body.classList.contains("light");
      toggle.textContent = isLight ? "🌙" : "☀️";
      try { localStorage.setItem("theme", isLight ? "light" : "dark"); } catch (e) {}
    });
  }

  /* ---------- Info icon toggle ---------- */
  document.querySelectorAll(".info-icon").forEach(function (icon) {
    icon.addEventListener("click", function () {
      const id = "info-" + icon.dataset.info;
      const panel = document.getElementById(id);
      if (panel) panel.hidden = !panel.hidden;
    });
    icon.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        icon.click();
      }
    });
  });
    /* ---------- Master collapse: About section ---------- */
  const masterBtn  = document.getElementById("toggleAllDetails");
  const masterBody = document.getElementById("longContentBody");

  if (masterBtn && masterBody) {
    // Restore from localStorage
    try {
      const saved = localStorage.getItem("aboutOpen");
      if (saved === "1") {
        masterBody.hidden = false;
        masterBtn.setAttribute("aria-expanded", "true");
        masterBtn.innerHTML = '<span class="arrow">▶</span> Hide Details';
      }
    } catch (e) {}

    masterBtn.addEventListener("click", function () {
      const isOpen = masterBtn.getAttribute("aria-expanded") === "true";

      if (isOpen) {
        // Collapse
        masterBody.hidden = true;
        masterBtn.setAttribute("aria-expanded", "false");
        masterBtn.innerHTML = '<span class="arrow">▶</span> Show Details';
        try { localStorage.setItem("aboutOpen", "0"); } catch (e) {}
      } else {
        // Expand
        masterBody.hidden = false;
        masterBtn.setAttribute("aria-expanded", "true");
        masterBtn.innerHTML = '<span class="arrow">▶</span> Hide Details';
        try { localStorage.setItem("aboutOpen", "1"); } catch (e) {}
      }
    });
  }
})();