/* ===================================
   AI Mosaic Studio - AdSense Loader
=================================== */
(function () {
  function initAds() {
    if (!window.adsbygoogle) {
      console.warn("AdSense SDK not loaded. Add the pagead2 script in <head>.");
      return;
    }
    const ads = document.querySelectorAll("ins.adsbygoogle");
    if (!ads.length) return;

    ads.forEach(function () {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.log("AdSense error:", e);
      }
    });
  }

  window.addEventListener("load", function () {
    setTimeout(initAds, 1000);
  });
})();