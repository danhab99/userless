import type { Hash, PublicKey, Thread } from "./p2p";
import type { Userless } from "./userless";

function extractReplyTarget(body: string): string | undefined {
  const patterns = [
    /in-reply-to\s*:\s*([a-f0-9]{8,64})/i,
    /replyto\s*=\s*"?([a-f0-9]{8,64})"?/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match?.[1]) {
      return match[1].toLowerCase();
    }
  }

  return undefined;
}

async function extractSigningFingerprint(
  thread: Thread,
): Promise<string | undefined> {
  const openpgp = await import("openpgp");
  try {
    const message = await openpgp.readCleartextMessage({
      cleartextMessage: thread.content,
    });
    return message.getSigningKeyIDs()[0]?.toHex()?.toLowerCase();
  } catch {
    return undefined;
  }
}

export class UserlessPublicKey {
  private userless: Userless;
  public fingerprint: string;

  constructor(userless: Userless, fingerprint: string) {
    this.userless = userless;
    this.fingerprint = fingerprint.toLowerCase();
  }

  async get(): Promise<PublicKey | undefined> {
    return this.userless.getPublicKey(this.fingerprint);
  }

  async getThreads(): Promise<UserlessThread[]> {
    const threads = await this.userless.getThreadClassesByPublicKey(
      this.fingerprint,
    );
    return threads;
  }

  async *iterateThreads(): AsyncGenerator<UserlessThread, void, undefined> {
    for (const thread of await this.getThreads()) {
      yield thread;
    }
  }
}

export class UserlessThread implements AsyncIterable<UserlessThread> {
  private userless: Userless;
  public hash: Hash;

  constructor(userless: Userless, hash: Hash) {
    this.userless = userless;
    this.hash = hash;
  }

  async get(): Promise<Thread | undefined> {
    return this.userless.getThread(this.hash);
  }

  async getParent(): Promise<UserlessThread | undefined> {
    const resolved = await this.userless.resolveThread(this.hash);
    const parentHash = extractReplyTarget(resolved.body);
    if (!parentHash) {
      return undefined;
    }

    return this.userless.getThreadClass(parentHash);
  }

  async getPublicKey(): Promise<UserlessPublicKey | undefined> {
    const thread = await this.get();
    if (!thread) {
      return undefined;
    }

    const fingerprint = await extractSigningFingerprint(thread);
    if (!fingerprint) {
      return undefined;
    }

    return this.userless.getPublicKeyClass(fingerprint);
  }

  async getReplies(): Promise<UserlessThread[]> {
    return this.userless.getReplyThreadClasses(this.hash);
  }

  async *iterateReplies(): AsyncGenerator<UserlessThread, void, undefined> {
    for (const reply of await this.getReplies()) {
      yield reply;
    }
  }

  [Symbol.asyncIterator](): AsyncGenerator<UserlessThread, void, undefined> {
    return this.iterateReplies();
  }
}