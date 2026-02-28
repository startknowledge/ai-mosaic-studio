async function compressImage(file){
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1000
  };
  return await imageCompression(file, options);
}