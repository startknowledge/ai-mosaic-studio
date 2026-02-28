function getBrightness(r,g,b){
  return 0.299*r + 0.587*g + 0.114*b;
}

function calculateGrid(tileCount){
  return Math.ceil(Math.sqrt(tileCount));
}