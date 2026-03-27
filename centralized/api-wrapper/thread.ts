import { fetchFrom, fetchText, fetchWithRedirect } from "./fetch";
import { parse } from "smol-toml";
import {
  Info,
  Thread,
  ThreadByHash,
  Content,
  ResolvedThread,
  Owner,
} from "./types";
import { createContent } from "./content";
import * as openpgp from "openpgp";
import { spoofArmoredSignature } from "./utils";
import { getArmoredKey } from "./key";

export async function resolveThreadRef(
  threadRef: Thread,
): Promise<ThreadByHash> {
  if (threadRef.type === "hash") {
    return threadRef;
  }

  const { finalUrl } = await fetchWithRedirect(
    threadRef.url,
    `thread/${threadRef.ref}`,
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

export async function getThreadPolicy(threadRef: Thread): Promise<Info> {
  const resolved = await resolveThreadRef(threadRef);
  return parse(
    await fetchFrom(resolved.url, `thread/${resolved.hash}`, "policy"),
  );
}

export async function getThreadContent(threadRef: Thread): Promise<Content> {
  try {
    const resolved = await resolveThreadRef(threadRef);
    const text = await fetchFrom(resolved.url, `thread/${resolved.hash}`, "");
    return await createContent(text);
  } catch (error) {
    console.error("Error in getThreadContent:", error);
    
    // Return fallback content instead of crashing
    return {
      body: "Error loading content",
      original: "",
      timestamp: new Date()
    };
  }
}

export async function getThreadReplies(
  threadRef: Thread,
  skip?: number,
  take?: number,
): Promise<Thread[]> {
  const resolved = await resolveThreadRef(threadRef);
  const replies = await fetchFrom(
    resolved.url,
    `thread/${resolved.hash}`,
    "replies",
    { skip, take },
  );
  const hashs = replies.split("\n").filter((x) => x);
  return hashs.map(
    (h) => ({ type: "hash", url: resolved.url, hash: h }) as const,
  );
}

export async function getThreadParents(
  threadRef: Thread,
  count?: number,
): Promise<Thread[]> {
  const resolved = await resolveThreadRef(threadRef);
  const replies = await fetchFrom(
    resolved.url,
    `thread/${resolved.hash}`,
    "parents",
    { count },
  );
  const hashs = replies.split("\n").filter((x) => x);
  return hashs.map(
    (h) => ({ type: "hash", url: resolved.url, hash: h }) as const,
  );
}

export async function getThreadOwner(threadRef: Thread): Promise<Owner> {
  try {
    const content = await getThreadContent(threadRef);
    console.log("Thread content original:", content.original?.substring(0, 200));

    const sigArmored = spoofArmoredSignature(content.original);
    console.log("Extracted signature:", sigArmored);
    
    // Check if we actually found a signature
    if (!sigArmored || !sigArmored.includes("-----BEGIN PGP SIGNATURE-----")) {
      throw new Error(`No PGP signature found in thread content`);
    }

    const sig = await openpgp.readSignature({
      armoredSignature: sigArmored,
    });

    const ownerKey = await getArmoredKey(
      { url: threadRef.url },
      sig.getSigningKeyIDs()[0].toHex(),
    );

    const owner = await openpgp.readKey({ armoredKey: ownerKey });

    const name = owner.users[0].userID?.name ?? "";
    const email = owner.users[0].userID?.email ?? "";
    const comment = owner.users[0].userID?.comment ?? "";
    const timestamp =
      sig.packets.map((x) => x.created).filter((x) => x)[0] ?? new Date();

    const id = sig.getSigningKeyIDs()[0].toHex();

    return { name, email, comment, timestamp, fingerprint: id };
  } catch (error) {
    console.error("Error in getThreadOwner:", error);
    
    // Return fallback owner information instead of crashing
    return {
      name: "Unknown User",
      email: "unknown@example.com",
      comment: "",
      timestamp: new Date(),
      fingerprint: "unknown"
    };
  }
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
