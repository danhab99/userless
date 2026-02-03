import { fetchText, fetchFrom } from "./fetch";
import { Banner, Thread } from "./types";
import { DELIMITER } from "./const";
import { parse } from "smol-toml";
import { debug } from "./debug";
import { resolveThreadRef } from "./thread";

export async function getBanner(url: string): Promise<Banner> {
  const ret = await fetchText(url, "/");
  debug("get banner");
  const [info, body] = ret.split(DELIMITER, 2);
  return { body, info: parse(info) };
}

export function getThread(url: string, identifier: string): Thread {
  // Check if it's a valid hash (64 hex characters)
  if (identifier.length === 64 && /^[a-f0-9]{64}$/i.test(identifier)) {
    return { type: "hash", url, hash: identifier };
  }
  // Otherwise treat as a ref
  return { type: "ref", url, ref: identifier };
}

export async function resolveThread(
  url: string,
  identifier: string
): Promise<[Thread, string]> {
  const threadRef = getThread(url, identifier);
  const resolved = await resolveThreadRef(threadRef);
  return [resolved, resolved.hash];
}

export function getKey(url: string, keyId: string): { url: string; keyId: string } {
  return { url, keyId };
}
