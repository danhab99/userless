import { fetchText, fetchFrom } from "./fetch";
import { Banner, Thread, UserlessConfig } from "./types";
import { DELIMITER } from "./const";
import { parse } from "smol-toml";
import { debug } from "./debug";
import { resolveThreadRef, getThreadContent, getThreadPolicy, getThreadReplies, getThreadOwner, getThreadParents } from "./thread";
import { getArmoredKey, getThreadsForKey, getFilesForKey, getPolicyForKey } from "./key";

export function createClient(config: UserlessConfig | string) {
  const url = typeof config === "string" ? config : config.url;
  
  return {
    getBanner: () => getBanner(url),
    getThread: (id: string) => getThread(url, id),
    resolveThread: (id: string) => resolveThread(url, id),
    getKey: (keyId: string) => ({
      getArmored: () => getArmoredKey(url, keyId),
      getThreads: (skip?: number, take?: number) => getThreadsForKey(url, keyId, skip, take),
      getFiles: () => getFilesForKey(url, keyId),
      getPolicy: () => getPolicyForKey(url, keyId),
    }),
    thread: (id: string) => {
      const thread = getThread(url, id);
      return {
        getContent: () => getThreadContent(thread),
        getPolicy: () => getThreadPolicy(thread),
        getReplies: (skip?: number, take?: number) => getThreadReplies(thread, skip, take),
        getParents: (count?: number) => getThreadParents(thread, count),
        getOwner: () => getThreadOwner(thread),
      };
    }
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
