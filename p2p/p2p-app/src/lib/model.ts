import type { Hash } from "./p2p";
import type { Userless } from "./userless";

export class UserlessPublicKey {
  private userless: Userless;
  public fingerprint: string;

  constructor(userless: Userless, fingerprint: string) {
    this.userless = userless;
    this.fingerprint = fingerprint.toLowerCase();
  }

  async getThreads(): Promise<UserlessThread[]> {
    throw new Error(
      "UserlessPublicKey.getThreads is not available in the minimal Userless API.",
    );
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

  async getReplies(): Promise<UserlessThread[]> {
    const items: UserlessThread[] = [];
    let cursor: string | undefined;

    while (true) {
      const page = await this.userless.getReplies(this.hash, cursor);
      items.push(...page.items);

      if (!page.next_cursor) {
        break;
      }

      cursor = page.next_cursor;
    }

    return items;
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