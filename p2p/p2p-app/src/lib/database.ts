import { openDB, type IDBPDatabase, type DBSchema } from "idb";
import * as openpgp from "openpgp";
import type {
  Hash,
  PublicKey,
  Thread,
} from "./p2p";

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

type DBHiddenThread = {
  hiddenAt: string;
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
  hidden_thread: {
    key: Hash;
    value: DBHiddenThread;
  };
}

function ensureStores(db: IDBPDatabase<UserlessDB>): void {
  if (!db.objectStoreNames.contains("hidden_thread")) {
    db.createObjectStore("hidden_thread");
  }
  if (!db.objectStoreNames.contains("privatekey")) {
    db.createObjectStore("privatekey");
  }
  if (!db.objectStoreNames.contains("threads")) {
    db.createObjectStore("threads");
  }
  if (!db.objectStoreNames.contains("publickey")) {
    db.createObjectStore("publickey");
  }
  if (!db.objectStoreNames.contains("publickey_alias")) {
    db.createObjectStore("publickey_alias");
  }
  if (!db.objectStoreNames.contains("file")) {
    db.createObjectStore("file");
  }
}

export async function openUserlessDatabase(): Promise<UserlessDatabase> {
  const database = await openDB<UserlessDB>("userless", 6, {
    upgrade(db) {
      ensureStores(db);
    },
  });

  return new UserlessDatabase(database);
}

/**
 * UserlessDatabase provides domain-specific access to IndexedDB storage.
 * It wraps an initialized IDBPDatabase with high-level CRUD methods
 * organized by entity type (threads, public keys, private keys, files, hidden threads).
 */
export class UserlessDatabase {
  constructor(private db: IDBPDatabase<UserlessDB>) {}

  // ============================================================================
  // Thread Operations
  // ============================================================================

  async getThread(hash: Hash): Promise<Thread | undefined> {
    return this.db.get("threads", hash);
  }

  async saveThread(hash: Hash, thread: Thread): Promise<void> {
    await this.db.put("threads", thread, hash);
  }

  async getAllThreadKeys(): Promise<Hash[]> {
    return (await this.db.getAllKeys("threads")) as Hash[];
  }

  async getThreadCount(): Promise<number> {
    return this.db.count("threads");
  }

  // ============================================================================
  // PublicKey Operations
  // ============================================================================

  /**
   * Get a public key by its primary fingerprint.
   * Normalizes input to lowercase for consistency.
   */
  async getPublicKeyByFingerprint(
    fingerprint: string,
  ): Promise<PublicKey | undefined> {
    const normalized = fingerprint.toLowerCase();
    return this.db.get("publickey", normalized);
  }

  /**
   * Get a public key by fingerprint or any of its aliases (key IDs, subkey fingerprints).
   * Performs lookups in both direct and alias stores.
   */
  async getPublicKeyByFingerprintOrAlias(
    fingerprintOrId: string,
  ): Promise<PublicKey | undefined> {
    const normalized = fingerprintOrId.toLowerCase();

    // Try direct lookup first
    const exact = await this.db.get("publickey", normalized);
    if (exact) return exact;

    // Try alias lookup
    const mapped = await this.db.get("publickey_alias", normalized);
    if (mapped?.fingerprint) {
      const byAlias = await this.db.get("publickey", mapped.fingerprint);
      if (byAlias) return byAlias;
    }

    return undefined;
  }

  /**
   * Save a public key with all its aliases (fingerprint, key IDs, subkey fingerprints).
   * This ensures the key can be looked up by any identifier derived from the key.
   */
  async savePublicKeyWithAliases(
    publicKey: PublicKey,
  ): Promise<void> {
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
      await this.db.put(
        "publickey_alias",
        { fingerprint: canonicalFingerprint },
        alias,
      );
    }
  }

  async getAllPublicKeys(): Promise<PublicKey[]> {
    return this.db.getAll("publickey");
  }

  async getPublicKeyCount(): Promise<number> {
    return this.db.count("publickey");
  }

  /**
   * Delete a public key and all its aliases by fingerprint.
   */
  async deletePublicKey(fingerprint: string): Promise<void> {
    const normalized = fingerprint.toLowerCase();
    await this.db.delete("publickey", normalized);
    await this.removeAliasesForFingerprint(normalized);
  }

  // ============================================================================
  // PublicKey Alias Operations
  // ============================================================================

  /**
   * Save an alias that points to a canonical fingerprint.
   * Used internally by savePublicKeyWithAliases.
   */
  async saveAlias(alias: string, canonicalFingerprint: string): Promise<void> {
    await this.db.put(
      "publickey_alias",
      { fingerprint: canonicalFingerprint.toLowerCase() },
      alias.toLowerCase(),
    );
  }

  /**
   * Remove all aliases pointing to a given fingerprint.
   * Called when deleting a public key to clean up its lookup index.
   */
  async removeAliasesForFingerprint(fingerprint: string): Promise<void> {
    const canonical = fingerprint.toLowerCase();
    const aliases = (await this.db.getAllKeys("publickey_alias")) as string[];
    for (const alias of aliases) {
      const value = await this.db.get("publickey_alias", alias);
      if (value?.fingerprint === canonical) {
        await this.db.delete("publickey_alias", alias);
      }
    }
  }

  /**
   * Get the canonical fingerprint for an alias.
   * Returns undefined if the alias doesn't exist.
   */
  async getAliasTarget(alias: string): Promise<string | undefined> {
    const record = await this.db.get("publickey_alias", alias.toLowerCase());
    return record?.fingerprint;
  }

  // ============================================================================
  // PrivateKey Operations
  // ============================================================================

  async getPrivateKey(fingerprint: string): Promise<DBPrivateKey | undefined> {
    return this.db.get("privatekey", fingerprint.toLowerCase());
  }

  async getAllPrivateKeyFingerprints(): Promise<string[]> {
    return (await this.db.getAllKeys("privatekey")) as string[];
  }

  async savePrivateKey(
    fingerprint: string,
    key: DBPrivateKey,
  ): Promise<void> {
    await this.db.put("privatekey", key, fingerprint.toLowerCase());
  }

  async deletePrivateKey(fingerprint: string): Promise<void> {
    const normalized = fingerprint.toLowerCase();
    await this.db.delete("privatekey", normalized);
  }

  // ============================================================================
  // File Operations
  // ============================================================================

  async getFile(hash: Hash): Promise<DBFile | undefined> {
    return this.db.get("file", hash);
  }

  async saveFile(hash: Hash, file: DBFile): Promise<void> {
    await this.db.put("file", file, hash);
  }

  async getAllFileKeys(): Promise<Hash[]> {
    return (await this.db.getAllKeys("file")) as Hash[];
  }

  async getFileCount(): Promise<number> {
    return this.db.count("file");
  }

  // ============================================================================
  // HiddenThread Operations
  // ============================================================================

  async hideThread(hash: Hash): Promise<void> {
    await this.db.put(
      "hidden_thread",
      { hiddenAt: new Date().toISOString() },
      hash,
    );
  }

  async getHiddenThreads(): Promise<Set<Hash>> {
    const keys = (await this.db.getAllKeys("hidden_thread")) as Hash[];
    return new Set(keys);
  }

  async isThreadHidden(hash: Hash): Promise<boolean> {
    const record = await this.db.get("hidden_thread", hash);
    return record !== undefined;
  }
}

export type { DBFile, DBPrivateKey, DBPublicKeyAlias, DBHiddenThread, UserlessDB };
