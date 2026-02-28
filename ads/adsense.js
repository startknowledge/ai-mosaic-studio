/* ===================================
   AI Mosaic Studio - AdSense Loader
=================================== */

(function () {

  function initAds() {

    if (!window.adsbygoogle) {
      console.warn("AdSense not loaded.");
      return;
    }

    const ads = document.querySelectorAll(".adsbygoogle");

    ads.forEach(ad => {
      try {
        (adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.log("AdSense error:", e);
      }
    });

  }

  // Wait for page load
  window.addEventListener("load", function () {
    setTimeout(initAds, 1000);
  });

})();