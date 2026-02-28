self.onmessage = function(e){
  const result = heavyMosaic(e.data);
  self.postMessage(result);
};