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
})();