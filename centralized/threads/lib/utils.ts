export function spoofArmoredSignature(clearText: string) {
  const clearLine = clearText.split("\n");
  var armoredSignature = "";
  var seenStart = false;
  var seenEnd = false;

  clearLine.forEach((line) => {
    seenStart = seenStart || line === "-----BEGIN PGP SIGNATURE-----";
    seenEnd = seenEnd || line === "-----END PGP SIGNATURE-----";

    if (seenStart && !seenEnd) {
      armoredSignature += line + "\n";
    }
  });

  armoredSignature += "-----END PGP SIGNATURE-----";

  return armoredSignature;
}

export type Policy = {
  allowReplies: boolean;
  banned: boolean;
  requireRecipients: string[];
};
