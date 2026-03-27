export function spoofArmoredSignature(clearText: string) {
  console.log("spoofArmoredSignature input:", clearText?.substring(0, 200));
  
  if (!clearText) {
    console.log("No clearText provided");
    return "";
  }
  
  const clearLine = clearText.split("\n");
  var armoredSignature = "";
  var seenStart = false;

  clearLine.forEach((line) => {
    if (line === "-----BEGIN PGP SIGNATURE-----") {
      seenStart = true;
      console.log("Found PGP signature start");
    }
    
    if (seenStart) {
      armoredSignature += line + "\n";
      
      if (line === "-----END PGP SIGNATURE-----") {
        console.log("Found PGP signature end");
        return; // Stop processing once we hit the end
      }
    }
  });

  // Only add the end marker if we didn't find one
  if (seenStart && !armoredSignature.endsWith("-----END PGP SIGNATURE-----\n")) {
    console.log("Adding missing end marker");
    armoredSignature += "-----END PGP SIGNATURE-----\n";
  }

  console.log("Final armored signature:", armoredSignature);
  return armoredSignature.trim();
}
