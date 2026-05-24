import * as openpgp from "openpgp";
import type { PublicKey } from "./p2p";
import { UserlessDatabase } from "./database";
import { UserlessEventEmitter, type UserlessEventSink } from "./events";

export type PrivateKeyDetail = {
  fingerprint: string;
  armor: string;
  userId: string;
};

/**
 * KeyManager handles private key and public key management operations.
 * Manages signing key selection, key import/export, and key resolution.
 */
export class KeyManager extends UserlessEventEmitter {
  constructor(
    private db: UserlessDatabase,
    eventSink?: UserlessEventSink,
  ) {
    super(eventSink);
  }

  /**
   * Save a public key with all its aliases for lookup by fingerprint or key ID.
   */
  async upsertPublicKeyWithAliases(
    publicKey: PublicKey,
  ): Promise<void> {
    await this.db.savePublicKeyWithAliases(publicKey);
  }

  /**
   * Get a public key by fingerprint or any of its key IDs.
   * Includes migration fallback for backfilling aliases.
   */
  async getPublicKeyByFingerprintOrId(
    fingerprintOrId: string,
  ): Promise<PublicKey | undefined> {
    const normalized = fingerprintOrId.toLowerCase();

    const exact = await this.db.getPublicKeyByFingerprintOrAlias(normalized);
    if (exact) return exact;

    // Migration fallback: parse existing keys, backfill aliases, and retry.
    const allFingerprints = await this.db
      .getAllPublicKeys()
      .then((keys) => keys.map((k) => k.fingerprint));
    for (const fingerprint of allFingerprints) {
      try {
        const record = await this.db.getPublicKeyByFingerprint(fingerprint);
        if (!record) {
          continue;
        }
        await this.upsertPublicKeyWithAliases(record);
        const match = await this.db.getPublicKeyByFingerprintOrAlias(normalized);
        if (match) {
          return match;
        }
      } catch {
        continue;
      }
    }

    return undefined;
  }

  /**
   * Get the current signing key (first available private key).
   */
  async getSigningKey(): Promise<openpgp.PrivateKey | undefined> {
    const fingerprints = await this.db.getAllPrivateKeyFingerprints();
    const first = fingerprints[0];
    if (!first) {
      return undefined;
    }

    const key = await this.db.getPrivateKey(first);
    if (!key) {
      return undefined;
    }

    try {
      return await openpgp.readPrivateKey({ armoredKey: key.armored });
    } catch {
      return undefined;
    }
  }

  /**
   * Add a private key and its corresponding public key to storage.
   */
  async addPrivateKey(armoredKey: string): Promise<openpgp.PrivateKey> {
    const key = await openpgp.readPrivateKey({ armoredKey });
    const fingerprint = key.getFingerprint().toLowerCase();
    console.log(`[userless] adding private key (fingerprint=${fingerprint})`);
    await this.db.savePrivateKey(fingerprint, { armored: armoredKey });
    const publicKey: PublicKey = {
      fingerprint,
      armored: key.toPublic().armor(),
    };
    await this.upsertPublicKeyWithAliases(publicKey);
    return key;
  }

  /**
   * Get all private keys with their details.
   */
  async getPrivateKeys(): Promise<PrivateKeyDetail[]> {
    const fingerprints = await this.db.getAllPrivateKeyFingerprints();
    const details: PrivateKeyDetail[] = [];
    for (const fingerprint of fingerprints) {
      const record = await this.db.getPrivateKey(fingerprint);
      if (!record) continue;
      let userId = "";
      try {
        const parsed = await openpgp.readPrivateKey({
          armoredKey: record.armored,
        });
        userId = parsed.getUserIDs()[0] ?? "";
      } catch {
        // ignore parse errors
      }
      details.push({ fingerprint, armor: record.armored, userId });
    }
    return details;
  }

  /**
   * Delete a private key and its associated public key.
   */
  async deletePrivateKey(fingerprint: string): Promise<void> {
    console.log(`[userless] deleting private key (fingerprint=${fingerprint})`);
    const normalized = fingerprint.toLowerCase();
    await this.db.deletePrivateKey(normalized);
    await this.db.deletePublicKey(normalized);
  }

  /**
   * Set a key as the signing key (add and mark as active).
   * Emits signing_key_changed event.
   */
  async saveSigningKey(armoredKey: string): Promise<openpgp.PrivateKey> {
    const key = await this.addPrivateKey(armoredKey);
    console.log(
      `[userless] signing key set (fingerprint=${key.getFingerprint()})`,
    );
    this.emit("signing_key_changed", {
      fingerprint: key.getFingerprint().toLowerCase(),
    });
    return key;
  }

  /**
   * Delete the current signing key.
   * Emits signing_key_changed event with undefined fingerprint.
   */
  async deleteSigningKey(): Promise<void> {
    console.log("[userless] deleting signing key");
    const existing = await this.getSigningKey();
    if (existing) {
      await this.deletePrivateKey(existing.getFingerprint());
    }
    this.emit("signing_key_changed", { fingerprint: undefined });
  }

  /**
   * Delete a public key by fingerprint.
   */
  async deletePublicKey(fingerprint: string): Promise<void> {
    await this.db.deletePublicKey(fingerprint);
  }
}
