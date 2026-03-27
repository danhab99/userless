import { fetchText } from "./fetch";
import { Banner, ResolvedThread, Thread, UserlessConfig } from "./types";
import { DELIMITER } from "./const";
import { parse } from "smol-toml";
import { debug } from "./debug";
import { resolveThread } from "./thread";
import { getArmoredKey, getThreadsForKey, getFilesForKey, getPolicyForKey } from "./key";

export function createClient(config: UserlessConfig | string) {
  const url = typeof config === "string" ? config : config.url;
  
  return {
    getBanner: () => getBanner(url),
    thread: (id: string) => getThread(url, id),
    resolveThread: (r: Thread) => resolveThread(r),
    getKey: (keyId: string) => ({
      getArmored: () => getArmoredKey(url, keyId),
      getThreads: (skip?: number, take?: number) => getThreadsForKey(url, keyId, skip, take),
      getFiles: () => getFilesForKey(url, keyId),
      getPolicy: () => getPolicyForKey(url, keyId),
    }),
  };
}

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

export function getKey(url: string, keyId: string): { url: string; keyId: string } {
  return { url, keyId };
}
