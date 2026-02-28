import { fetchFrom, fetchText, fetchWithRedirect } from "./fetch";
import { parse } from "smol-toml";
import { Info, Thread, ThreadByHash, Content, ResolvedThread } from "./types";
import { createContent } from "./content";
import * as openpgp from "openpgp";

export async function resolveThreadRef(
  threadRef: Thread
): Promise<ThreadByHash> {
  if (threadRef.type === "hash") {
    return threadRef;
  }

  const { finalUrl } = await fetchWithRedirect(
    threadRef.url,
    `thread/${threadRef.ref}`
  );
  
  const hashMatch = finalUrl.match(/thread\/([a-f0-9]{64})/);
  if (!hashMatch || !hashMatch[1]) {
    throw new Error(`Could not resolve ref "${threadRef.ref}" to a hash`);
  }

  return {
    type: "hash",
    url: threadRef.url,
    hash: hashMatch[1],
  };
}

export async function getThreadPolicy(
  threadRef: Thread
): Promise<Info> {
  const resolved = await resolveThreadRef(threadRef);
  return parse(await fetchFrom(resolved.url, `thread/${resolved.hash}`, "policy"));
}

export async function getThreadContent(
  threadRef: Thread
): Promise<Content> {
  const resolved = await resolveThreadRef(threadRef);
  const text = await fetchFrom(resolved.url, `thread/${resolved.hash}`, "");
  return createContent(text);
}

export async function getThreadReplies(
  threadRef: Thread,
  skip?: number,
  take?: number
): Promise<Thread[]> {
  const resolved = await resolveThreadRef(threadRef);
  const replies = await fetchFrom(resolved.url, `thread/${resolved.hash}`, "replies", { skip, take });
  const hashs = replies.split("\n").filter((x) => x);
  return hashs.map((h) => ({ type: "hash", url: resolved.url, hash: h } as const));
}

export async function getThreadParents(
  threadRef: Thread,
  count?: number
): Promise<Thread[]> {
  const resolved = await resolveThreadRef(threadRef);
  const replies = await fetchFrom(resolved.url, `thread/${resolved.hash}`, "parents", { count });
  const hashs = replies.split("\n").filter((x) => x);
  return hashs.map((h) => ({ type: "hash", url: resolved.url, hash: h } as const));
}

export async function getThreadOwner(
  threadRef: Thread
): Promise<string> {
  const content = await getThreadContent(threadRef);
  const msg = await openpgp.readCleartextMessage({
    cleartextMessage: content.original,
  });

  const owner = msg.getSigningKeyIDs()[0].toHex();
  return owner;
}

function makeResolvedThread(thread: ThreadByHash): ResolvedThread {
  return {
    url: thread.url,
    hash: thread.hash,
    getContent: () => getThreadContent(thread),
    getPolicy: () => getThreadPolicy(thread),
    getReplies: async (skip?, take?) => {
      const threads = await getThreadReplies(thread, skip, take);
      return threads.map((t) => makeResolvedThread(t as ThreadByHash));
    },
    getParents: async (count?) => {
      const threads = await getThreadParents(thread, count);
      return threads.map((t) => makeResolvedThread(t as ThreadByHash));
    },
    getOwner: () => getThreadOwner(thread),
  };
}

export async function resolveThread(thread: Thread): Promise<ResolvedThread> {
  const resolved = await resolveThreadRef(thread);
  return makeResolvedThread(resolved);
}
