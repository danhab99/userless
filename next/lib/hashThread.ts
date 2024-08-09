import { Thread } from "api/types/graphql"
import { createHash } from "crypto"


export function hashThread(t: Thread): string {
  const hasher = createHash("sha256")

  const body = [
    t.body,
    t.parent?.hash,
    t.timestamp,
    ...t.files.map(x => x?.hash)
  ].join("");

  return hasher.update(body).digest("hex")
}
