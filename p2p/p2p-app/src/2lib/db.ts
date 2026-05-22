import { Fingerprint, FingerPrintOrID } from "./types";
import * as openpgp from "openpgp";
import type { Thread } from "./userless";

export class Database {
  async getThreadByHash(
    hash: Hash,
  ): Promise<openpgp.CleartextMessage | undefined> {}

  async getPublicKeyByFingerprintOrID(
    fid: FingerPrintOrID,
  ): Promise<openpgp.PublicKey | undefined> {}

  async getPrivateKeyByFingerprint(
    fid: Fingerprint,
  ): Promise<openpgp.PrivateKey | undefined> {}

  async saveThread(t: openpgp.CleartextMessage) {}

  async savePublicKey(p: openpgp.PublicKey) {}

  async getRootThreads(): Promise<openpgp.CleartextMessage>[] {}

  async getReplies(Hash): Promise<openpgp.CleartextMessage>[] {}

  async getThreadsByOwner(owner: Fingerprint): Promise<openpgp.PublicKey> {};
}
