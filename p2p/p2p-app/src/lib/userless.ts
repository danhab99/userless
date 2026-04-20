import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import * as openpgp from "openpgp";
import {
  FILE_CHUNK_SIZE,
  Peer,
  Server,
  normalizeLobbyUrl,
  type FileChunk,
  type Hash,
  type PublicKey,
  type Thread,
  type TransferStats,
} from "./p2p";

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

export type ResolvedThread = {
  hash: Hash;
  body: string;
  content: string;
  owner: {
    fingerprint: string;
    name: string;
    email: string;
  };
};

export type UserlessSnapshot = TransferStats & {
  connectionCount: number;
  threadCount: number;
  fileCount: number;
  keyCount: number;
};

const FILE_REGEX = /!\[[^\]]*\]\(userless:\/\/.*\/files\/[^\)]+\)/g;
const CHUNK_SIZE = FILE_CHUNK_SIZE;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }
  return btoa(binary);
}

function extractOwner(userId: string | undefined, fallbackFingerprint: string) {
  if (!userId) {
    return {
      fingerprint: fallbackFingerprint,
      name: fallbackFingerprint.slice(0, 16),
      email: "",
    };
  }

  const match = userId.match(/^(.*?)(?:\s*<([^>]+)>)?$/);
  return {
    fingerprint: fallbackFingerprint,
    name: match?.[1]?.trim() || fallbackFingerprint.slice(0, 16),
    email: match?.[2]?.trim() || "",
  };
}

export class Userless {
  private server: Server;
  private db!: IDBPDatabase<UserlessDB>;
  private dbReady: Promise<void>;

  constructor(url: string) {
    this.dbReady = openDB<UserlessDB>("userless", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("threads")) {
          db.createObjectStore("threads");
        }
        if (!db.objectStoreNames.contains("publickey")) {
          db.createObjectStore("publickey");
        }
        if (!db.objectStoreNames.contains("file")) {
          db.createObjectStore("file");
        }
      },
    }).then((database) => {
      this.db = database;
    });

    this.server = new Server(url, ["threads", "files", "pks"], {
      getAllPublicKeys: async ({ skip = 0, take = 50 }) => {
        await this.ensureDB();
        const keys = await this.db.getAll("publickey");
        return keys.slice(skip, skip + take);
      },
      getAllThreads: async ({ skip = 0, take = 50 }) => {
        await this.ensureDB();
        const hashes = (await this.db.getAllKeys("threads")) as Hash[];
        return hashes.slice(skip, skip + take);
      },
      getThread: async ({ hash }) => {
        await this.ensureDB();
        const thread = await this.db.get("threads", hash);
        if (!thread) {
          throw new Error(`Thread not found: ${hash}`);
        }
        return thread;
      },
      getFile: async ({ hash, offset, length }) => {
        await this.ensureDB();
        const file = await this.db.get("file", hash);
        if (!file) {
          throw new Error(`File not found: ${hash}`);
        }

        const content = new Uint8Array(file.content);
        const chunk = content.slice(offset, offset + length);

        return {
          data: bytesToBase64(chunk),
          total: content.byteLength,
        } satisfies FileChunk;
      },
      getPublicKeys: async ({ fingerprint }) => {
        await this.ensureDB();
        const key = await this.db.get("publickey", fingerprint);
        if (!key) {
          throw new Error(`Public key not found: ${fingerprint}`);
        }
        return key;
      },
    });

    this.server.onPeerConnected = (peer) => {
      void this.scanPeerForThreads(peer);
    };
  }

  private async ensureDB() {
    await this.dbReady;
  }

  private getPeersInternal(): Peer[] {
    return this.server.getPeers();
  }

  private async scanPeerForThreads(peer: Peer) {
    let offset = 0;

    while (true) {
      const hashes = await peer.getAllThreads({ skip: offset, take: 50 });
      if (hashes.length === 0) {
        break;
      }

      for (const hash of hashes) {
        const existing = await this.db.getKey("threads", hash);
        if (existing) {
          continue;
        }

        const thread = await peer.getThread({ hash });
        await this.db.put("threads", thread, hash);
      }

      if (hashes.length < 50) {
        break;
      }
      offset += hashes.length;
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
        const acquiredKey = await this.queryPeersForPublicKeys(key.toHex());
        if (acquiredKey) {
          await this.db.put("publickey", acquiredKey, key.toHex());
        }
      }
    }

    const files = body.match(FILE_REGEX) ?? [];
    const urls = files.map((x) => {
      const match = x.match(/userless:\/\/[^)]+/);
      return match ? new URL(match[0]) : null;
    }).filter((x): x is URL => x !== null);
    
    // Fetch all files referenced in the thread
    if (urls) {
      for (const url of urls) {
        const hash = url.pathname.split('/').pop();
        if (hash) {
          const fileExists = !!(await this.db.get("file", hash));
          if (!fileExists) {
            await this.queryPeersForFile(hash);
          }
        }
      }
    }
  }

  private async queryPeers<T>(
    lookupLocal: () => Promise<T | undefined>,
    lookupPeer: (peer: Peer) => Promise<T | undefined>,
    save: (value: T) => Promise<void>,
  ): Promise<T | undefined> {
    const local = await lookupLocal();
    if (local) {
      return local;
    }

    for (const peer of this.getPeersInternal()) {
      try {
        const value = await lookupPeer(peer);
        if (!value) {
          continue;
        }

        await save(value);
        return value;
      } catch {
        continue;
      }
    }

    return undefined;
  }

  public async queryPeersForFile(hash: string): Promise<DBFile | undefined> {
    await this.ensureDB();

    return this.queryPeers(
      () => this.db.get("file", hash),
      async (peer) => {
        const bytes = await peer.fetchFile(hash, CHUNK_SIZE);
        const copy = new Uint8Array(bytes);
        return {
          content: copy.buffer,
          signature: new ArrayBuffer(0),
        };
      },
      async (file) => {
        await this.db.put("file", file, hash);
      },
    );
  }

  public async queryPeersForThread(hash: string): Promise<Thread | undefined> {
    await this.ensureDB();

    return this.queryPeers(
      () => this.db.get("threads", hash),
      (peer) => peer.getThread({ hash }),
      async (thread) => {
        await this.db.put("threads", thread, hash);
      },
    );
  }

  public async queryPeersForPublicKeys(
    fingerprint: string,
  ): Promise<PublicKey | undefined> {
    await this.ensureDB();

    return this.queryPeers(
      () => this.db.get("publickey", fingerprint),
      (peer) => peer.getPublicKeys({ fingerprint }),
      async (key) => {
        await this.db.put("publickey", key, fingerprint);
      },
    );
  }

  public async getAllPeers(): Promise<Peer[]> {
    return this.getPeersInternal();
  }

  public async scanAllPeers(): Promise<void> {
    await this.ensureDB();
    await Promise.all(this.getPeersInternal().map((peer) => this.scanPeerForThreads(peer)));
  }

  public async getAllThreads(skip = 0, take = 100): Promise<Hash[]> {
    await this.scanAllPeers();
    const hashes = ((await this.db.getAllKeys("threads")) as Hash[]).sort();
    return hashes.slice(skip, skip + take);
  }

  public async getThread(hash: Hash): Promise<Thread | undefined> {
    await this.ensureDB();

    const cached = await this.db.get("threads", hash);
    const thread = cached ?? (await this.queryPeersForThread(hash));
    if (thread) {
      await this.scanThreadForFilesAndKeys(thread);
    }

    return thread;
  }

  public async resolveThread(hash: Hash): Promise<ResolvedThread> {
    const thread = await this.getThread(hash);
    if (!thread) {
      throw new Error(`Thread not found: ${hash}`);
    }

    const message = await openpgp.readCleartextMessage({
      cleartextMessage: thread.content,
    });
    const body = message.getText();
    const fingerprint = message.getSigningKeyIDs()[0]?.toHex() ?? "unknown";

    let owner = extractOwner(undefined, fingerprint);
    if (fingerprint !== "unknown") {
      const key = await this.queryPeersForPublicKeys(fingerprint);
      if (key) {
        const parsedKey = await openpgp.readKey({ armoredKey: key.armored });
        owner = extractOwner(parsedKey.getUserIDs()[0], fingerprint);
      }
    }

    return {
      hash,
      body,
      content: thread.content,
      owner,
    };
  }

  public async listResolvedThreads(
    skip = 0,
    take = 100,
  ): Promise<ResolvedThread[]> {
    const hashes = await this.getAllThreads(skip, take);
    return Promise.all(hashes.map((hash) => this.resolveThread(hash)));
  }

  public async getSnapshot(): Promise<UserlessSnapshot> {
    await this.ensureDB();

    const [threadCount, fileCount, keyCount] = await Promise.all([
      this.db.count("threads"),
      this.db.count("file"),
      this.db.count("publickey"),
    ]);

    const transfer = this.server.getTransferStats();

    return {
      connectionCount: this.server.getPeers().length,
      threadCount,
      fileCount,
      keyCount,
      uploadedBytes: transfer.uploadedBytes,
      downloadedBytes: transfer.downloadedBytes,
    };
  }
}

let singleton: Userless | undefined;

function defaultLobbyUrl(): string {
  const envUrl = import.meta.env.VITE_USERLESS_URL;
  if (envUrl) {
    return normalizeLobbyUrl(envUrl);
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return normalizeLobbyUrl(`${protocol}://${window.location.hostname}:4445/lobby`);
}

export function getUserless() {
  if (!singleton) {
    singleton = new Userless(defaultLobbyUrl());
  }

  return singleton;
}
