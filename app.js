const worker = new Worker("worker.js");

worker.postMessage({
  baseImage: baseData,
  tiles: tileData
});

worker.onmessage = function(e){
  drawResult(e.data);
};

lottie.loadAnimation({
  container: document.getElementById("loader"),
  renderer: "svg",
  loop: true,
  autoplay: true,
  path: "assets/loader.json"
});

baseOpacity.oninput = render;
tileOpacity.oninput = render;
