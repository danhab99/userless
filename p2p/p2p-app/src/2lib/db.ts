import { Fingerprint, FingerPrintOrID, Hash } from "./types";
import * as openpgp from "openpgp";

type ThreadRecord = {
  hash: string;
  parentHash: string | null;
  data: string;
};

type KeyRecord = {
  fingerprint: string;
  keyId: string;
  data: string;
};

interface IterOpts {
  store: string;
  index?: string;
  key?: IDBValidKey | IDBKeyRange;
}

const DB_NAME = "userless-db";
const DB_VERSION = 1;

function idbRequest<T>(r: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result as T);
    r.onerror = () => reject(r.error);
  });
}

function idbTxDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function computeHash(data: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(data),
  );
  return [...new Uint8Array(buf)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

async function deserializeThread(
  r: ThreadRecord,
): Promise<openpgp.CleartextMessage | null> {
  try {
    return openpgp.readCleartextMessage({ cleartext: r.data });
  } catch {
    return null;
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("threads")) {
        const ts = db.createObjectStore("threads", { keyPath: "hash" });
        ts.createIndex("parentHash", "parentHash", { unique: false });
      }
      if (!db.objectStoreNames.contains("publicKeys")) {
        const ps = db.createObjectStore("publicKeys", { keyPath: "fingerprint" });
        ps.createIndex("keyId", "keyId", { unique: false });
      }
      if (!db.objectStoreNames.contains("privateKeys")) {
        db.createObjectStore("privateKeys", { keyPath: "fingerprint" });
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export class Database {
  private db: IDBDatabase | null = null;

  private async getDb(): Promise<IDBDatabase> {
    if (!this.db) this.db = await openDB();
    return this.db;
  }

  // Single iterator: yields records from any store/index with optional key filter
  private async *iterate<T>(opts: IterOpts): AsyncIterableIterator<T> {
    const db = await this.getDb();
    const os = db.transaction(opts.store, "readonly").objectStore(opts.store);
    const src: IDBIndex | IDBObjectStore = opts.index ? os.index(opts.index) : os;
    const records = opts.key
      ? await idbRequest<T[]>(src.getAll(opts.key))
      : await idbRequest<T[]>(src.getAll());
    for (const r of records) yield r;
  }

  // Unified write helper
  private async put<T>(store: string, value: T): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    await idbTxDone(tx);
  }

  // Collect threads from iterator, deserialize, discard failures
  private async collectThreads(opts?: IterOpts): Promise<openpgp.CleartextMessage[]> {
    const msgs: openpgp.CleartextMessage[] = [];
    for await (const r of this.iterate<ThreadRecord>({ store: "threads", ...opts })) {
      const msg = await deserializeThread(r);
      if (msg) msgs.push(msg);
    }
    return msgs;
  }

  async getThreadByHash(hash: Hash): Promise<openpgp.CleartextMessage | undefined> {
    for await (const r of this.iterate<ThreadRecord>({ store: "threads", key: IDBKeyRange.only(hash) })) {
      return deserializeThread(r);
    }
  }

  async getPublicKeyByFingerprintOrID(fid: FingerPrintOrID): Promise<openpgp.PublicKey | undefined> {
    for await (const r of this.iterate<KeyRecord>({ store: "publicKeys", index: "fingerprint", key: IDBKeyRange.only(fid) })) {
      return openpgp.readPublicKey({ armoredKey: r.data });
    }
    for await (const r of this.iterate<KeyRecord>({ store: "publicKeys", index: "keyId", key: IDBKeyRange.only(fid) })) {
      return openpgp.readPublicKey({ armoredKey: r.data });
    }
  }

  async getPrivateKeyByFingerprint(fid: Fingerprint): Promise<openpgp.PrivateKey | undefined> {
    for await (const r of this.iterate<KeyRecord>({ store: "privateKeys", key: IDBKeyRange.only(fid) })) {
      return openpgp.readPrivateKey({ armoredKey: r.data });
    }
  }

  async saveThread(t: openpgp.CleartextMessage): Promise<void> {
    const armored = t.armor();
    const hash = await computeHash(armored);
    const parentHash = t.getFields().find((f) => f[0] === "In-Reply-To")?.[1] || null;
    await this.put("threads", { hash, parentHash, data: armored });
  }

  async savePublicKey(p: openpgp.PublicKey): Promise<void> {
    const fingerprint = p.getFingerprint();
    const armored = await p.armor();
    const keyId = (await p.getKeyId()).toString();
    await this.put("publicKeys", { fingerprint, keyId, data: armored });
  }

  async getRootThreads(): Promise<openpgp.CleartextMessage[]> {
    return this.collectThreads({ index: "parentHash", key: IDBKeyRange.only(null) });
  }

  async getReplies(parentHash: Hash): Promise<openpgp.CleartextMessage[]> {
    return this.collectThreads({ index: "parentHash", key: IDBKeyRange.only(parentHash) });
  }

  async getThreadsByOwner(owner: Fingerprint): Promise<openpgp.CleartextMessage[]> {
    const msgs = await this.collectThreads();
    return msgs.filter((msg) => {
      const from = msg.getFields().find((f) => f[0] === "From");
      return from && from[1].includes(owner);
    });
  }
}
