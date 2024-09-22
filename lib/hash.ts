import { createHash } from "crypto";

export function digestHash(content: any) {
  const hasher = createHash("sha256");
  hasher.write(content);
  return hasher.digest().toString("hex");
}
