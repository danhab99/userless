import { createHash } from "crypto";

export function digestHash(content: string | Buffer) {
  const hasher = createHash("sha256");
  hasher.write(content);
  return hasher.digest().toString("hex");
}
