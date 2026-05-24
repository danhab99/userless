import * as openpgp from "openpgp";
import type { Hash } from "./p2p";
import type { FileDetail } from "./file-manager";
import type { UserlessSnapshot } from "./inspector";
import type { PrivateKeyDetail } from "./key-manager";
import type { EmergencyPayload } from "./peer-gateway";

export type ReplyDraftRecord = {
  parentHash: Hash;
  body: string;
  createdAt: string;
};

type AppServiceHandlers = {
  getAllFilesDetailed: () => Promise<FileDetail[]>;
  getSnapshot: () => Promise<UserlessSnapshot>;
  getSigningKey: () => Promise<openpgp.PrivateKey | undefined>;
  addPrivateKey: (armoredKey: string) => Promise<openpgp.PrivateKey>;
  getPrivateKeys: () => Promise<PrivateKeyDetail[]>;
  deletePrivateKey: (fingerprint: string) => Promise<void>;
  saveSigningKey: (armoredKey: string) => Promise<openpgp.PrivateKey>;
  deleteSigningKey: () => Promise<void>;
  deletePublicKey: (fingerprint: string) => Promise<void>;
  saveReplyDraft: (
    parentHash: Hash,
    body: string,
  ) => Promise<ReplyDraftRecord>;
  broadcastEmergency: (payload: EmergencyPayload) => void;
  scanAllPeers: () => Promise<void>;
  hideThread: (hash: Hash) => Promise<void>;
  createThread: (body: string) => Promise<Hash>;
  storeSignedThread: (signedMessage: string) => Promise<Hash>;
  addFile: (name: string, data: ArrayBuffer) => Promise<Hash>;
};

export class AppService {
  private handlers: AppServiceHandlers;

  constructor(handlers: AppServiceHandlers) {
    this.handlers = handlers;
  }

  public async getAllFilesDetailed(): Promise<FileDetail[]> {
    return this.handlers.getAllFilesDetailed();
  }

  public async getSnapshot(): Promise<UserlessSnapshot> {
    return this.handlers.getSnapshot();
  }

  public async getSigningKey(): Promise<openpgp.PrivateKey | undefined> {
    return this.handlers.getSigningKey();
  }

  public async addPrivateKey(armoredKey: string): Promise<openpgp.PrivateKey> {
    return this.handlers.addPrivateKey(armoredKey);
  }

  public async getPrivateKeys(): Promise<PrivateKeyDetail[]> {
    return this.handlers.getPrivateKeys();
  }

  public async deletePrivateKey(fingerprint: string): Promise<void> {
    return this.handlers.deletePrivateKey(fingerprint);
  }

  public async saveSigningKey(armoredKey: string): Promise<openpgp.PrivateKey> {
    return this.handlers.saveSigningKey(armoredKey);
  }

  public async deleteSigningKey(): Promise<void> {
    return this.handlers.deleteSigningKey();
  }

  public async deletePublicKey(fingerprint: string): Promise<void> {
    return this.handlers.deletePublicKey(fingerprint);
  }

  public async saveReplyDraft(
    parentHash: Hash,
    body: string,
  ): Promise<ReplyDraftRecord> {
    return this.handlers.saveReplyDraft(parentHash, body);
  }

  public broadcastEmergency(payload: EmergencyPayload): void {
    this.handlers.broadcastEmergency(payload);
  }

  public async scanAllPeers(): Promise<void> {
    return this.handlers.scanAllPeers();
  }

  public async hideThread(hash: Hash): Promise<void> {
    return this.handlers.hideThread(hash);
  }

  public async createThread(body: string): Promise<Hash> {
    return this.handlers.createThread(body);
  }

  public async storeSignedThread(signedMessage: string): Promise<Hash> {
    return this.handlers.storeSignedThread(signedMessage);
  }

  public async addFile(name: string, data: ArrayBuffer): Promise<Hash> {
    return this.handlers.addFile(name, data);
  }
}