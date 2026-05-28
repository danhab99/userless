import * as openpgp from "openpgp";
import {
  type FilePayload,
  type Hash,
  type Peer,
  type PublicKey,
  type Thread,
} from "./p2p";
import { UserlessDatabase, type DBFile } from "./database";
import { UserlessEventEmitter, type UserlessEventSink } from "./events";

export type FileDetail = {
  hash: Hash;
  size: number;
  sourceThreadHash?: Hash;
};

const FILE_REGEX = /!\[[^\]]*\]\(userless:\/\/.*\/files\/[^\)]+\)/g;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }
  return btoa(binary);
}

function hashBytes(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", buffer);
}

function hashText(text: string): Promise<ArrayBuffer> {
  return hashBytes(new TextEncoder().encode(text));
}

function toHex(buffer: ArrayBuffer): Hash {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export class FileManager extends UserlessEventEmitter {
  constructor(
    private db: UserlessDatabase,
    private getPeers: () => Peer[],
    private getPublicKeyByFingerprintOrId: (
      fingerprintOrId: string,
    ) => Promise<PublicKey | undefined>,
    private upsertPublicKeyWithAliases: (key: PublicKey) => Promise<void>,
    eventSink?: UserlessEventSink,
  ) {
    super(eventSink);
  }

  async getFilePayload(hash: Hash): Promise<FilePayload> {
    const file = await this.db.getFile(hash);
    if (!file) {
      throw new Error(`File not found: ${hash}`);
    }

    const content = new Uint8Array(file.content);
    return {
      data: bytesToBase64(content),
    } satisfies FilePayload;
  }

  async getFile(hash: Hash): Promise<ArrayBuffer> {
    const file = await this.queryPeersForFile(hash);
    if (!file) {
      throw new Error(`File not found: ${hash}`);
    }

    return file.content;
  }

  async scanThreadForFilesAndKeys(thread: Thread, threadHash: Hash): Promise<void> {
    const msg = await openpgp.readCleartextMessage({
      cleartextMessage: thread.content,
    });

    const body = msg.getText();
    const signingKeys = msg.getSigningKeyIDs();

    for (const key of signingKeys) {
      const keyId = key.toHex();
      const keyExists = !!(await this.db.getPublicKeyByFingerprintOrAlias(keyId));
      if (keyExists) {
        continue;
      }

      console.log(`[userless] fetching public key from peers (keyId=${keyId})`);
      const acquiredKey = await this.getPublicKeyByFingerprintOrId(keyId);
      if (acquiredKey) {
        await this.upsertPublicKeyWithAliases(acquiredKey);
        console.log(
          `[userless] public key cached (fingerprint=${acquiredKey.fingerprint})`,
        );
        this.emit("public_key_cached", {
          fingerprint: acquiredKey.fingerprint,
        });
        continue;
      }

      console.warn(`[userless] public key not found on any peer (keyId=${keyId})`);
    }

    const files = body.match(FILE_REGEX) ?? [];
    const urls = files
      .map((value) => {
        const match = value.match(/userless:\/\/[^)]+/);
        return match ? new URL(match[0]) : null;
      })
      .filter((value): value is URL => value !== null);

    for (const url of urls) {
      const hash = url.pathname.split("/").pop();
      if (!hash) {
        continue;
      }

      const fileExists = !!(await this.db.getFile(hash));
      if (!fileExists) {
        await this.queryPeersForFileWithSource(hash, threadHash);
      }
    }
  }

  async queryPeersForFile(hash: Hash): Promise<DBFile | undefined> {
    return this.queryPeers(
      () => this.db.getFile(hash),
      async (peer) => {
        const bytes = await peer.getFileBytes(hash);
        const copy = new Uint8Array(bytes);
        return {
          content: copy.buffer,
          signature: new ArrayBuffer(0),
          sourceThreadHash: undefined,
        } satisfies DBFile;
      },
      async (file) => {
        await this.db.saveFile(hash, file);
        this.emit("file_cached", { hash });
      },
    );
  }

  async queryPeersForFileWithSource(
    hash: Hash,
    sourceThreadHash: Hash,
  ): Promise<DBFile | undefined> {
    return this.queryPeers(
      () => this.db.getFile(hash),
      async (peer) => {
        const bytes = await peer.getFileBytes(hash);
        const copy = new Uint8Array(bytes);
        return {
          content: copy.buffer,
          signature: new ArrayBuffer(0),
          sourceThreadHash,
        } satisfies DBFile;
      },
      async (file) => {
        await this.db.saveFile(hash, file);
        this.emit("file_cached", { hash, sourceThreadHash });
      },
    );
  }

  async getAllFilesDetailed(): Promise<FileDetail[]> {
    const keys = await this.db.getAllFileKeys();
    const details: FileDetail[] = [];

    for (const hash of keys) {
      const file = await this.db.getFile(hash);
      if (!file) {
        continue;
      }

      details.push({
        hash,
        size: file.content.byteLength,
        sourceThreadHash: file.sourceThreadHash,
      });
    }

    return details;
  }

  async addFile(name: string, data: ArrayBuffer): Promise<Hash> {
    const hash = toHex(await hashBytes(data));
    const file: DBFile = {
      content: data,
      signature: new ArrayBuffer(0),
    };

    await this.db.saveFile(hash, file);
    console.log(
      `[userless] file added (name=${name}, hash=${hash}, size=${data.byteLength})`,
    );
    this.emit("file_added", { name, hash });
    return hash;
  }

  async hashSignedThreadContent(signedMessage: string): Promise<Hash> {
    return toHex(await hashText(signedMessage));
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

    for (const peer of this.getPeers()) {
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
}