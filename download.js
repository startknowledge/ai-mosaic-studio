function downloadImage(){
  let quality = document.getElementById("qualitySelect").value;
  
  if(quality === "4k"){
    canvas.width = 3840;
    canvas.height = 2160;
  }

  let format = document.getElementById("formatSelect").value;

  let link = document.createElement("a");
  link.download = "mosaic."+format;
  link.href = canvas.toDataURL("image/"+format,1.0);
  link.click();
}