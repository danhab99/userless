import {
  Peer,
  Server,
  Hash,
  PublicKey,
  type Thread,
  type FileChunk,
} from "./p2p";
import { openDB, type DBSchema, IDBPDatabase } from "idb";
import * as openpgp from "openpgp";

type DBFile = {
  content: ArrayBuffer;
  signature: ArrayBuffer;
};

interface UserlessDB extends DBSchema {
  threads: {
    key: Hash;
    value: Thread;
  };
  publickey: {
    key: Hash;
    value: PublicKey;
  };
  file: {
    key: Hash;
    value: DBFile,
  };
}

const fileregex = /!\[[^\]]*\]\(userless:\/\/.*\/files\/[^\)]+\)/g.compile();
const CHUNK_SIZE = 1e5;

export class Userless {
  private server: Server;
  private db: IDBPDatabase<UserlessDB>;
  private peers: Peer[] = [];

  async constructor(url: string) {
    openDB<UserlessDB>("userless").then(d => { this.db = d });

    this.server = new Server(url, [], {
      // getAllPublicKeys = iterate("publickey",
      getAllPublicKeys: async (params) => {
        const tx = this.db.transaction("publickey");
        const cursor = await tx.store.openCursor();

        if (!cursor) {
          throw "no cursor";
        }

        if (params.skip) {
          cursor.advance(params.skip);
        }

        const out: PublicKey[] = [];

        for (let i = 0; i < (params.take ?? 50); i++) {
          out.push({
            armored: cursor.value,
            fingerprint: "",
          });

          cursor.continue();
        }

        return out;
      },

      getAllThreads: async (params) => {
        const tx = this.db.transaction("threads");
        const cursor = await tx.store.openCursor();

        if (!cursor) {
          throw "no cursor";
        }

        if (params.skip) {
          cursor.advance(params.skip);
        }

        const out: Hash[] = [];

        for (let i = 0; i < (params.take ?? 50); i++) {
          out.push(cursor.key);
          cursor.continue();
        }

        return out;
      },

      getThread: async (params) => {
        const content = await this.db.get("threads", params.hash);
        return { content } as Thread;
      },
    });

    this.server.onPeerConnected = (peer) => {
      this.peers.push(peer);
    };

    this.server.onPeerDisconnected = (peerid) => {
      this.peers = this.peers.filter((x) => x.id !== peerid);
    };
  }

  private async scanPeerForThreads(peer: Peer) {
    const TAKE = 50;
    let lastTake = TAKE;
    let page = 0;

    while (lastTake === TAKE) {
      const hashes = await peer.getAllThreads({
        skip: page * TAKE,
        take: TAKE,
      });

      lastTake = hashes.length;

      const existingHashes: string[] = (
        await Promise.all(hashes.map((hash) => this.db.getKey("threads", hash)))
      ).filter((x) => x);

      const missingHashes = hashes.filter((x) => !existingHashes.includes(x));

      const acquiredThreads = await Promise.all(
        missingHashes.map(async (hash) => {
          const thread = await peer.getThread({ hash });
          this.db.put("threads", thread.content, hash);
          return thread;
        }),
      );

      page++;
    }
  }

  private async scanThreadForFilesAndKeys(thread: Thread) {
    const msg = await openpgp.readCleartextMessage({
      cleartextMessage: thread.content,
    });

    const body = msg.getText();

    const signingKeys = msg.getSigningKeyIDs();

    for (const key of signingKeys) {
      const keyExists = !!(await this.db.get("publickey", key.toHex()));
      if (!keyExists) {
        const acquiredKey = await this.queryPeersForPublicKey(key.toHex());
        await this.db.put("publickey", acquiredKey, key.toHex());
      }
    }

    const files = fileregex.exec(body);
    let urls = files?.map((x) => new URL(x));
  }

  private async queryPeersForPublicKey(fingerprint: string) {
    return Promise.race(
      this.peers.map((peer) => {
        return peer.getPublicKeys({ fingerprint });
      }),
    );
  }

  private async queryPeers<T>(
    db: (x: T | undefined) => Promise<T | undefined>,
    query: (p: Peer) => Promise<boolean>,
    get: (p: Peer) => Promise<T | undefined>,
  ): Promise<T | undefined> {
    const d = await db(undefined);

    if (d) {
      return d;
    }

    const validPeer = await Promise.all(
      this.peers.map(async (peer) => {
        const ans = await query(peer);
        return ans ? peer : undefined;
      }),
    );

    const peer = validPeer.filter((x) => x)[0];

    if (peer) {
      const content = await get(peer);
      await db(content);
      return content;
    } else {
      return undefined;
    }
  }

  public queryPeersForFile(hash: string) {
    return this.queryPeers<ArrayBuffer>(
      async (save) => {
        if (save) {
          this.db.put("file", save, hash);
        }

        const a = await this.db.get("file", hash);
        return a;
      },
      async (p) =>
        (await p.getFile({ hash, length: 1, offset: 0 })) ? true : false,
      async (p) => {
        let buff = new Uint8Array();
        let chunk: FileChunk = {
          data: "",
          total: Number.POSITIVE_INFINITY,
        };
        let offset = 0;

        while (chunk.total >= CHUNK_SIZE) {
          chunk = await p.getFile({
            hash,
            length: CHUNK_SIZE,
            offset: buff.length,
          });
          buff.set(chunk.data, offset);
          offset += chunk.data.length;
        }

        return buff.buffer;
      },
    );
  }

  public queryPeersForThread(hash: string) {
    return this.queryPeers(
      async () => {
        return this.db.get("threads", hash);
      },
      async (p) => ((await p.getThread({ hash })) ? true : false),
      async (p) => {
        return p.getThread({ hash });
      },
    );
  }

  public queryPeersForPublicKeys(fingerprint: string) {
    return this.queryPeers(
      async () => {
        return this.db.get("publickey", fingerprint);
      },
      async (p) => ((await p.getPublicKeys({ fingerprint })) ? true : false),
      async (p) => {
        return p.getPublicKeys({ fingerprint });
      },
    );
  }
}
