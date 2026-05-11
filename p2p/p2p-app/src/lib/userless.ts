import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import * as openpgp from "openpgp";
import {
  FILE_CHUNK_SIZE,
  DEFAULT_PAGE_SIZE,
  Peer,
  Server,
  normalizeLobbyUrl,
  type FileChunk,
  type Hash,
  type PageParams,
  type PageResult,
  type PublicKey,
  type Thread,
  type TransferStats,
} from "./p2p";

type DBFile = {
  content: ArrayBuffer;
  signature: ArrayBuffer;
  sourceThreadHash?: Hash;
};

export type AuditLogRecord = {
  timestamp: string;
  event: string;
  details?: string;
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
  auditlog: {
    key: number;
    value: AuditLogRecord;
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

export type ReplyDraftRecord = {
  parentHash: Hash;
  body: string;
  createdAt: string;
};

export type PublicKeyDetail = {
  fingerprint: string;
  armor: string;
  userId: string;
  threadCount: number;
};

export type FileDetail = {
  hash: Hash;
  size: number;
  sourceThreadHash?: Hash;
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

function getPageWindow(params: PageParams) {
  const offset = params.cursor ? Number.parseInt(params.cursor, 10) || 0 : 0;
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  return { offset, limit };
}

function toPageResult<T>(items: T[], offset: number, limit: number): PageResult<T> {
  return {
    items,
    next_cursor: items.length < limit ? undefined : String(offset + items.length),
  };
}

function extractReplyTarget(body: string): string | undefined {
  const patterns = [
    /reply_to\s*:\s*([a-f0-9]{8,64})/i,
    /in-reply-to\s*:\s*([a-f0-9]{8,64})/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match?.[1]) {
      return match[1].toLowerCase();
    }
  }

  return undefined;
}

export class Userless {
  private server: Server;
  private db!: IDBPDatabase<UserlessDB>;
  private dbReady: Promise<void>;

  constructor(url: string) {
    this.dbReady = openDB<UserlessDB>("userless", 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains("threads")) {
            db.createObjectStore("threads");
          }
          if (!db.objectStoreNames.contains("publickey")) {
            db.createObjectStore("publickey");
          }
          if (!db.objectStoreNames.contains("file")) {
            db.createObjectStore("file");
          }
        }

        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains("auditlog")) {
            db.createObjectStore("auditlog", { autoIncrement: true });
          }
        }
      },
    }).then((database) => {
      this.db = database;
    });

    this.server = new Server(url, ["threads", "files", "pks"], {
      getAllPublicKeys: async (params) => {
        await this.ensureDB();
        const { offset, limit } = getPageWindow(params);
        const keys = await this.db.getAll("publickey");
        return toPageResult(keys.slice(offset, offset + limit), offset, limit);
      },
      getAllThreads: async (params) => {
        await this.ensureDB();
        const { offset, limit } = getPageWindow(params);
        const hashes = (await this.db.getAllKeys("threads")) as Hash[];
        return toPageResult(hashes.slice(offset, offset + limit), offset, limit);
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
      void this.appendAuditLog("peer_connected", peer.id);
      void this.scanPeerForThreads(peer);
    };

    this.server.onPeerDisconnected = (fingerprint) => {
      void this.appendAuditLog("peer_disconnected", fingerprint);
    };

    this.server.onEmergency = (payload) => {
      void this.appendAuditLog("emergency", JSON.stringify(payload));
    };
  }

  private async ensureDB() {
    await this.dbReady;
  }

  private async appendAuditLog(event: string, details?: string) {
    await this.ensureDB();
    await this.db.add("auditlog", {
      timestamp: new Date().toISOString(),
      event,
      details,
    });
  }

  private getPeersInternal(): Peer[] {
    return this.server.getPeers();
  }

  private async scanPeerForThreads(peer: Peer) {
    let cursor: string | undefined;

    while (true) {
      const page = await peer.getAllThreads({ cursor, limit: DEFAULT_PAGE_SIZE });
      if (page.items.length === 0) {
        break;
      }

      for (const hash of page.items) {
        const existing = await this.db.getKey("threads", hash);
        if (existing) {
          continue;
        }

        const thread = await peer.getThread({ hash });
        await this.db.put("threads", thread, hash);
        await this.appendAuditLog("thread_cached", hash);
      }

      if (!page.next_cursor) {
        break;
      }
      cursor = page.next_cursor;
    }
  }

  private async scanThreadForFilesAndKeys(thread: Thread, threadHash: Hash) {
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
          await this.appendAuditLog("public_key_cached", key.toHex());
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
            await this.queryPeersForFileWithSource(hash, threadHash);
          }
        }
      }
    }
  }

  private async queryPeersForFileWithSource(hash: string, sourceThreadHash: Hash): Promise<DBFile | undefined> {
    await this.ensureDB();

    return this.queryPeers(
      () => this.db.get("file", hash),
      async (peer) => {
        const bytes = await peer.fetchFile(hash, CHUNK_SIZE);
        const copy = new Uint8Array(bytes);
        return {
          content: copy.buffer,
          signature: new ArrayBuffer(0),
          sourceThreadHash,
        };
      },
      async (file) => {
        await this.db.put("file", file, hash);
        await this.appendAuditLog("file_cached", hash);
      },
    );
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
          sourceThreadHash: undefined,
        };
      },
      async (file) => {
        await this.db.put("file", file, hash);
        await this.appendAuditLog("file_cached", hash);
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
        await this.appendAuditLog("thread_cached", hash);
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
        await this.appendAuditLog("public_key_cached", fingerprint);
      },
    );
  }

  public async getAuditLog(): Promise<AuditLogRecord[]> {
    await this.ensureDB();
    return this.db.getAll("auditlog");
  }

  public async saveReplyDraft(parentHash: Hash, body: string): Promise<ReplyDraftRecord> {
    const record: ReplyDraftRecord = {
      parentHash,
      body,
      createdAt: new Date().toISOString(),
    };

    await this.appendAuditLog("reply_draft_saved", JSON.stringify(record));
    return record;
  }

  public async getAllPeers(): Promise<Peer[]> {
    return this.getPeersInternal();
  }

  public async scanAllPeers(): Promise<void> {
    await this.ensureDB();
    await Promise.all(this.getPeersInternal().map((peer) => this.scanPeerForThreads(peer)));
  }

  public async getAllThreads(cursor?: string, limit = DEFAULT_PAGE_SIZE): Promise<PageResult<Hash>> {
    await this.scanAllPeers();
    const offset = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
    const hashes = ((await this.db.getAllKeys("threads")) as Hash[]).sort();
    return toPageResult(hashes.slice(offset, offset + limit), offset, limit);
  }

  public async getThread(hash: Hash): Promise<Thread | undefined> {
    await this.ensureDB();

    const cached = await this.db.get("threads", hash);
    const thread = cached ?? (await this.queryPeersForThread(hash));
    if (thread) {
      await this.scanThreadForFilesAndKeys(thread, hash);
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
    cursor?: string,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<PageResult<ResolvedThread>> {
    const page = await this.getAllThreads(cursor, limit);
    return {
      items: await Promise.all(page.items.map((hash) => this.resolveThread(hash))),
      next_cursor: page.next_cursor,
    };
  }

  public async getReplyThreads(parentHash: Hash): Promise<ResolvedThread[]> {
    const lowerHash = parentHash.toLowerCase();
    const matching: ResolvedThread[] = [];
    let cursor: string | undefined;

    while (true) {
      const page = await this.listResolvedThreads(cursor, DEFAULT_PAGE_SIZE);
      for (const thread of page.items) {
        if (thread.hash.toLowerCase() === lowerHash) {
          continue;
        }

        const target = extractReplyTarget(thread.body);
        if (target === lowerHash) {
          matching.push(thread);
        }
      }

      if (!page.next_cursor) {
        break;
      }
      cursor = page.next_cursor;
    }

    return matching;
  }

  public async getAllPublicKeysDetailed(): Promise<PublicKeyDetail[]> {
    await this.ensureDB();
    const keys = await this.db.getAll("publickey");
    const allKeys = await this.db.getAllKeys("publickey");
    const details: PublicKeyDetail[] = [];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const fingerprint = allKeys[i] as string;

      let userId = "";
      try {
        const parsedKey = await openpgp.readKey({ armoredKey: key.armored });
        userId = parsedKey.getUserIDs()[0] || "";
      } catch {
        // Use empty userId if parsing fails
      }

      details.push({
        fingerprint,
        armor: key.armored,
        userId,
        threadCount: 0,
      });
    }

    return details;
  }

  public async getThreadsByPublicKey(fingerprint: string): Promise<ResolvedThread[]> {
    await this.ensureDB();
    const matching: ResolvedThread[] = [];
    let cursor: string | undefined;

    while (true) {
      const page = await this.listResolvedThreads(cursor, DEFAULT_PAGE_SIZE);
      for (const thread of page.items) {
        if (thread.owner.fingerprint.toLowerCase() === fingerprint.toLowerCase()) {
          matching.push(thread);
        }
      }

      if (!page.next_cursor) {
        break;
      }
      cursor = page.next_cursor;
    }

    return matching;
  }

  public async getAllFilesDetailed(): Promise<FileDetail[]> {
    await this.ensureDB();
    const keys = (await this.db.getAllKeys("file")) as Hash[];
    const details: FileDetail[] = [];

    for (const hash of keys) {
      const file = await this.db.get("file", hash);
      if (file) {
        details.push({
          hash,
          size: file.content.byteLength,
          sourceThreadHash: file.sourceThreadHash,
        });
      }
    }

    return details;
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

  public async getOrCreateSigningKey(): Promise<openpgp.PrivateKey> {
    const stored = localStorage.getItem("userless_signing_key");
    if (stored) {
      try {
        const key = await openpgp.readPrivateKey({ armoredKey: stored });
        return key;
      } catch {
        // Fall through to generate new key
      }
    }

    // Generate a new key
    const key = await openpgp.generateKey({
      type: "rsa",
      rsaBits: 2048,
      userIDs: [{ name: "Userless User", email: "user@userless.local" }],
      format: "armored",
    });

    const privateKey = await openpgp.readPrivateKey({ armoredKey: key.privateKey as string });
    localStorage.setItem("userless_signing_key", key.privateKey as string);

    return privateKey;
  }

  public async createThread(body: string): Promise<Hash> {
    await this.ensureDB();

    const signingKey = await this.getOrCreateSigningKey();

    const cleartextMessage = await openpgp.createCleartextMessage({
      text: body,
    });

    const signedMessage = await openpgp.sign({
      message: cleartextMessage,
      signingKeys: signingKey,
    });

    const thread: Thread = {
      content: signedMessage,
    };

    // Hash the content to create a deterministic hash
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(signedMessage)
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    await this.db.put("threads", thread, hash);
    await this.appendAuditLog("thread_created", hash);

    return hash;
  }

  public async addFile(name: string, data: ArrayBuffer): Promise<Hash> {
    await this.ensureDB();

    // Hash the file content to create a deterministic hash
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const file: DBFile = {
      content: data,
      signature: new ArrayBuffer(0),
    };

    await this.db.put("file", file, hash);
    await this.appendAuditLog("file_added", `${name} (${hash})`);

    return hash;
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
