const parts = ["Eyes","Nose","Mouth","Body"];

parts.forEach(p=>{
  const input = document.createElement("input");
  input.type="file";
  input.placeholder="Upload for "+p;
  dynamicInputs.appendChild(input);
});