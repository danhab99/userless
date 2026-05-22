import { Server as P2PServer, Peer } from "./p2p";
import { Database } from "./db";
import type { FingerPrintOrID, Hash, HashOrRef } from "./types";
import * as openpgp from "openpgp";

type CursorIterator<T> = {
  items: T[];
  cursor: string;
};

export class Userless {
  public p2p: P2PServer;
  public db: Database;

  constructor(p2p: P2PServer, db: Database) {
    this.p2p = p2p;
    this.db = db;
  }

  public async iterate<T, C>(
    cls: new (u: Userless, d: T) => C,
    more: boolean,
    lookupLocal: () => Promise<T[]>,
    lookupPeer: (peer: Peer) => Promise<T[]>,
    save: (value: T) => Promise<void>,
  ): Promise<CursorIterator<C>> {
    const results = await lookupLocal();

    if (more) {
      const peers = this.p2p.getPeers();

      for (const peer of peers) {
        try {
          const values = await lookupPeer(peer);
          results.push(...values);
          values.forEach(save);
        } catch {
          continue;
        }
      }
    }

    return results.map((l) => new cls(this, l));
  }

  async getPublicKey(fid: FingerPrintOrID): Promise<PublicKey | undefined> {
    return this.iterate(
      PublicKey,
      true,
      async () => {
        const x = await this.db.getPublicKeyByFingerprintOrID(fid);
        return x ? [x] : [];
      },
      (peer) => peer.getPublicKeys({ fingerprint: fid }),
      (found) => this.db.savePublicKey(found),
    );
  }

  async resolveThread(hash: HashOrRef): Promise<Hash> {}

  async getThreadByHash(hash: Hash): Promise<Thread | undefined> {
    return (
      await this.iterate(
        Thread,
        true,
        async () => {
          const x = await this.db.getThreadByHash(hash);
          return x ? [x] : [];
        },
        (peer) => peer.getThread({ hash }),
        (found) => this.db.saveThread(found),
      )
    ).items[0];
  }

  async getRootThreads(
    hash: Hash,
    cursor?: string,
  ): Promise<CursorIterator<Thread>> {
    return this.iterate(
      Thread,
      true,
      async () => {
        return this.db.getRootThreads();
      },
      (peer) => {
        return peer.getAllThreads({});
      },
      (found) => {
        this.db.saveThread(found);
      },
    );
  }
}

export class Thread {
  private userless: Userless;
  private t: openpgp.CleartextMessage;

  constructor(userless: Userless, t: openpgp.CleartextMessage) {
    this.userless = userless;
    this.t = t;
  }

  async hash() {
    const h = await crypto.subtle.digest("sh256", Buffer.from(this.t.armor()));
    return [...new Uint8Array(h)]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  }

  async getReplies(cursor?: string): Promise<CursorIterator<Thread>> {
    return this.userless.iterate(
      Thread,
      true,
      async () => this.userless.db.getReplies(this.hash),
      (peer) =>
        peer.getReplyThreads({
          parentHash: await this.hash(),
          cursor,
          limit: 10,
        }),
      (found) => this.userless.db.saveThread(found),
    );
  }

  async getOwner(): Promise<PublicKey> {}
}

export class PublicKey {
  private userless: Userless;
  private k: openpgp.PublicKey;

  constructor(userless: Userless, k: openpgp.PublicKey) {
    this.userless = userless;
    this.k = k;
  }

  async getThreads(cursor?: string): Promise<CursorIterator<Thread>> {
    return this.userless.iterate(
      Thread,
      true,
      () => this.userless.db.getThreadsByOwner(this.k.getFingerprint()),
      (peer) => peer.getThreadByOwner({ owner: this.k.getFingerprint() }),
      (found) => this.db.savePublicKey(found),
    );
  }
}
