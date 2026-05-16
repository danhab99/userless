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
import {
  UserlessEventEmitter,
  type UserlessEventSink,
} from "./userless-events";

type DBFile = {
  content: ArrayBuffer;
  signature: ArrayBuffer;
  sourceThreadHash?: Hash;
};

type DBPrivateKey = {
  armored: string;
};

type DBPublicKeyAlias = {
  fingerprint: string;
};

export type PrivateKeyDetail = {
  fingerprint: string;
  armor: string;
  userId: string;
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
  publickey_alias: {
    key: string;
    value: DBPublicKeyAlias;
  };
  privatekey: {
    key: Hash;
    value: DBPrivateKey;
  };
  file: {
    key: Hash;
    value: DBFile;
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

export type UserlessOptions = {
  eventSink?: UserlessEventSink;
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

function toPageResult<T>(
  items: T[],
  offset: number,
  limit: number,
): PageResult<T> {
  return {
    items,
    next_cursor:
      items.length < limit ? undefined : String(offset + items.length),
  };
}

function extractReplyTarget(body: string): string | undefined {
  const patterns = [/in-reply-to\s*:\s*([a-f0-9]{8,64})/i];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match?.[1]) {
      return match[1].toLowerCase();
    }
  }

  return undefined;
}

export class Userless extends UserlessEventEmitter {
  private server: Server;
  private db!: IDBPDatabase<UserlessDB>;
  private dbReady: Promise<void>;

  constructor(url: string, options: UserlessOptions = {}) {
    super(options.eventSink);

    this.dbReady = openDB<UserlessDB>("userless", 5, {
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
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains("privatekey")) {
            db.createObjectStore("privatekey");
          }
        }
        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains("publickey_alias")) {
            db.createObjectStore("publickey_alias");
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
        return toPageResult(
          hashes.slice(offset, offset + limit),
          offset,
          limit,
        );
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
        const key = await this.getPublicKeyByFingerprintOrId(fingerprint);
        if (!key) {
          throw new Error(`Public key not found: ${fingerprint}`);
        }
        return key;
      },
    });

    this.server.onPeerConnected = (peer) => {
      console.log(`[userless] peer connected (id=${peer.id})`);
      this.emit("peer_connected", { peerId: peer.id });
      void this.scanPeerForThreads(peer);
    };

    this.server.onPeerDisconnected = (fingerprint) => {
      console.log(`[userless] peer disconnected (id=${fingerprint})`);
      this.emit("peer_disconnected", { fingerprint });
    };

    this.server.onEmergency = (payload) => {
      this.emit("emergency", { payload });
    };
  }

  private async ensureDB() {
    await this.dbReady;
  }

  private async upsertPublicKeyWithAliases(publicKey: PublicKey): Promise<void> {
    await this.db.put("publickey", publicKey, publicKey.fingerprint);

    const parsed = await openpgp.readKey({ armoredKey: publicKey.armored });
    const anyParsed = parsed as any;
    const aliasValues = new Set<string>();

    const normalizedPrimaryFingerprint = parsed.getFingerprint().toLowerCase();
    aliasValues.add(normalizedPrimaryFingerprint);

    const primaryKeyId = parsed.getKeyID().toHex().toLowerCase();
    aliasValues.add(primaryKeyId);

    for (const keyId of parsed.getKeyIDs()) {
      aliasValues.add(keyId.toHex().toLowerCase());
    }

    for (const subkey of anyParsed.getSubkeys?.() ?? []) {
      const subFp = subkey.getFingerprint?.()?.toLowerCase?.();
      if (subFp) {
        aliasValues.add(subFp);
      }

      const subId = subkey.getKeyID?.()?.toHex?.()?.toLowerCase?.();
      if (subId) {
        aliasValues.add(subId);
      }
    }

    const canonicalFingerprint = publicKey.fingerprint.toLowerCase();
    for (const alias of aliasValues) {
      await this.db.put("publickey_alias", { fingerprint: canonicalFingerprint }, alias);
    }
  }

  private async removePublicKeyAliasesForFingerprint(fingerprint: string): Promise<void> {
    const canonical = fingerprint.toLowerCase();
    const aliases = (await this.db.getAllKeys("publickey_alias")) as string[];
    for (const alias of aliases) {
      const value = await this.db.get("publickey_alias", alias);
      if (value?.fingerprint === canonical) {
        await this.db.delete("publickey_alias", alias);
      }
    }
  }

  private async getPublicKeyByFingerprintOrId(
    fingerprintOrId: string,
  ): Promise<PublicKey | undefined> {
    const normalized = fingerprintOrId.toLowerCase();

    const exact = await this.db.get("publickey", normalized);
    if (exact) return exact;

    const mapped = await this.db.get("publickey_alias", normalized);
    if (mapped?.fingerprint) {
      const byAlias = await this.db.get("publickey", mapped.fingerprint);
      if (byAlias) {
        return byAlias;
      }
    }

    // Migration fallback: parse existing keys, backfill aliases, and retry.
    const allFingerprints = (await this.db.getAllKeys("publickey")) as string[];
    for (const fingerprint of allFingerprints) {
      const record = await this.db.get("publickey", fingerprint);
      if (!record) {
        continue;
      }

      try {
        await this.upsertPublicKeyWithAliases(record);
        const match = await this.db.get("publickey_alias", normalized);
        if (match?.fingerprint) {
          const byAlias = await this.db.get("publickey", match.fingerprint);
          if (byAlias) {
            return byAlias;
          }
        }
      } catch {
        continue;
      }
    }

    return undefined;
  }

  private getPeersInternal(): Peer[] {
    return this.server.getPeers();
  }

  private async scanPeerForThreads(peer: Peer) {
    let cursor: string | undefined;
    let totalScanned = 0;

    console.log(`[userless] scanning peer for threads (peer=${peer.id})`);
    while (true) {
      const page = await peer.getAllThreads({
        cursor,
        limit: DEFAULT_PAGE_SIZE,
      });
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
        console.log(`[userless] thread cached from peer (hash=${hash}, peer=${peer.id})`);
        this.emit("thread_cached", { hash });
        totalScanned++;
      }

      if (!page.next_cursor) {
        break;
      }
      cursor = page.next_cursor;
    }
    console.log(`[userless] scan complete (peer=${peer.id}, new=${totalScanned})`);
  }

  private async scanThreadForFilesAndKeys(thread: Thread, threadHash: Hash) {
    const msg = await openpgp.readCleartextMessage({
      cleartextMessage: thread.content,
    });

    const body = msg.getText();

    const signingKeys = msg.getSigningKeyIDs();

    for (const key of signingKeys) {
      const keyId = key.toHex();
      const keyExists = !!(await this.getPublicKeyByFingerprintOrId(keyId));
      if (!keyExists) {
        console.log(`[userless] fetching public key from peers (keyId=${keyId})`);
        const acquiredKey = await this.queryPeersForPublicKeys(keyId);
        if (acquiredKey) {
          await this.upsertPublicKeyWithAliases(acquiredKey);
          console.log(`[userless] public key cached (fingerprint=${acquiredKey.fingerprint})`);
          this.emit("public_key_cached", { fingerprint: acquiredKey.fingerprint });
        } else {
          console.warn(`[userless] public key not found on any peer (keyId=${keyId})`);
        }
      }
    }

    const files = body.match(FILE_REGEX) ?? [];
    const urls = files
      .map((x) => {
        const match = x.match(/userless:\/\/[^)]+/);
        return match ? new URL(match[0]) : null;
      })
      .filter((x): x is URL => x !== null);

    // Fetch all files referenced in the thread
    if (urls) {
      for (const url of urls) {
        const hash = url.pathname.split("/").pop();
        if (hash) {
          const fileExists = !!(await this.db.get("file", hash));
          if (!fileExists) {
            await this.queryPeersForFileWithSource(hash, threadHash);
          }
        }
      }
    }
  }

  private async queryPeersForFileWithSource(
    hash: string,
    sourceThreadHash: Hash,
  ): Promise<DBFile | undefined> {
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
        this.emit("file_cached", { hash, sourceThreadHash });
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
        this.emit("file_cached", { hash });
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
        this.emit("thread_cached", { hash });
      },
    );
  }

  public async queryPeersForPublicKeys(
    fingerprintOrId: string,
  ): Promise<PublicKey | undefined> {
    await this.ensureDB();

    return this.queryPeers(
      () => this.getPublicKeyByFingerprintOrId(fingerprintOrId),
      (peer) => peer.getPublicKeys({ fingerprint: fingerprintOrId }),
      async (key) => {
        await this.upsertPublicKeyWithAliases(key);
        this.emit("public_key_cached", { fingerprint: key.fingerprint });
      },
    );
  }

  public async saveReplyDraft(
    parentHash: Hash,
    body: string,
  ): Promise<ReplyDraftRecord> {
    const record: ReplyDraftRecord = {
      parentHash,
      body,
      createdAt: new Date().toISOString(),
    };

  this.emit("reply_draft_saved", { parentHash });

    return record;
  }

  public async getAllPeers(): Promise<Peer[]> {
    return this.getPeersInternal();
  }

  public async scanAllPeers(): Promise<void> {
    await this.ensureDB();
    await Promise.all(
      this.getPeersInternal().map((peer) => this.scanPeerForThreads(peer)),
    );
  }

  public async getAllThreads(
    cursor?: string,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<PageResult<Hash>> {
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
      items: await Promise.all(
        page.items.map((hash) => this.resolveThread(hash)),
      ),
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

  public async getThreadsByPublicKey(
    fingerprint: string,
  ): Promise<ResolvedThread[]> {
    await this.ensureDB();
    const matching: ResolvedThread[] = [];
    let cursor: string | undefined;

    while (true) {
      const page = await this.listResolvedThreads(cursor, DEFAULT_PAGE_SIZE);
      for (const thread of page.items) {
        if (
          thread.owner.fingerprint.toLowerCase() === fingerprint.toLowerCase()
        ) {
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

  public async getSigningKey(): Promise<openpgp.PrivateKey | undefined> {
    await this.ensureDB();
    // Use first available private key as signing key.
    const fingerprints = (await this.db.getAllKeys("privatekey")) as string[];
    const first = fingerprints[0];
    if (!first) {
      return undefined;
    }

    const key = await this.db.get("privatekey", first);
    if (!key) {
      return undefined;
    }

    try {
      return await openpgp.readPrivateKey({ armoredKey: key.armored });
    } catch {
      return undefined;
    }
  }

  public async addPrivateKey(armoredKey: string): Promise<openpgp.PrivateKey> {
    await this.ensureDB();
    const key = await openpgp.readPrivateKey({ armoredKey });
    const fingerprint = key.getFingerprint().toLowerCase();
    console.log(`[userless] adding private key (fingerprint=${fingerprint})`);
    await this.db.put("privatekey", { armored: armoredKey }, fingerprint);
    const publicKey: PublicKey = { fingerprint, armored: key.toPublic().armor() };
    await this.upsertPublicKeyWithAliases(publicKey);
    return key;
  }

  public async getPrivateKeys(): Promise<PrivateKeyDetail[]> {
    await this.ensureDB();
    const fingerprints = (await this.db.getAllKeys("privatekey")) as string[];
    const details: PrivateKeyDetail[] = [];
    for (const fingerprint of fingerprints) {
      const record = await this.db.get("privatekey", fingerprint);
      if (!record) continue;
      let userId = "";
      try {
        const parsed = await openpgp.readPrivateKey({ armoredKey: record.armored });
        userId = parsed.getUserIDs()[0] ?? "";
      } catch {
        // ignore parse errors
      }
      details.push({ fingerprint, armor: record.armored, userId });
    }
    return details;
  }

  public async deletePrivateKey(fingerprint: string): Promise<void> {
    console.log(`[userless] deleting private key (fingerprint=${fingerprint})`);
    await this.ensureDB();
    const normalized = fingerprint.toLowerCase();
    await this.db.delete("privatekey", normalized);
    await this.db.delete("publickey", normalized);
    await this.removePublicKeyAliasesForFingerprint(normalized);
  }

  public async saveSigningKey(armoredKey: string): Promise<openpgp.PrivateKey> {
    const key = await this.addPrivateKey(armoredKey);
    console.log(`[userless] signing key set (fingerprint=${key.getFingerprint()})`);
    this.emit("signing_key_changed", { fingerprint: key.getFingerprint().toLowerCase() });
    return key;
  }

  public async deleteSigningKey(): Promise<void> {
    console.log("[userless] deleting signing key");
    const existing = await this.getSigningKey();
    if (existing) {
      await this.deletePrivateKey(existing.getFingerprint());
    }
    this.emit("signing_key_changed", { fingerprint: undefined });
  }

  public async deletePublicKey(fingerprint: string): Promise<void> {
    await this.ensureDB();
    const normalized = fingerprint.toLowerCase();
    await this.db.delete("publickey", normalized);
    await this.removePublicKeyAliasesForFingerprint(normalized);
  }

  public async createThread(body: string): Promise<Hash> {
    await this.ensureDB();

    const signingKey = await this.getSigningKey();
    if (!signingKey) {
      throw new Error("No signing key configured. Import or create a private key first.");
    }

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
      new TextEncoder().encode(signedMessage),
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    await this.db.put("threads", thread, hash);
    console.log(`[userless] thread created (hash=${hash})`);
    this.emit("thread_created", { hash });

    return hash;
  }

  /** Store a pre-signed cleartext thread message without re-signing. */
  public async storeSignedThread(signedMessage: string): Promise<Hash> {
    await this.ensureDB();

    const thread: Thread = { content: signedMessage };

    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(signedMessage),
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    await this.db.put("threads", thread, hash);
    console.log(`[userless] signed thread stored (hash=${hash})`);
    this.emit("thread_created", { hash });

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
    console.log(`[userless] file added (name=${name}, hash=${hash}, size=${data.byteLength})`);
    this.emit("file_added", { name, hash });

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
  return normalizeLobbyUrl(
    `${protocol}://${window.location.hostname}:4445/lobby`,
  );
}

export function getUserless(options: UserlessOptions = {}) {
  if (!singleton) {
    singleton = new Userless(defaultLobbyUrl(), options);
  }

  return singleton;
}

