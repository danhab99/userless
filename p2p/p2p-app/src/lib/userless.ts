import * as openpgp from "openpgp";
import {
  DEFAULT_PAGE_SIZE,
  type Hash,
  normalizeLobbyUrl,
  type PageParams,
  type PageResult,
  type Peer,
  type PublicKey,
  Server,
  type Thread,
} from "./p2p";
import { UserlessDatabase } from "./database";
import { UserlessEventEmitter, type UserlessEventSink } from "./events";
import type { FileDetail } from "./file-manager";
import { FileManager } from "./file-manager";
import type { PublicKeyDetail, UserlessSnapshot } from "./inspector";
import { UserlessInspector } from "./inspector";
import type { PrivateKeyDetail } from "./key-manager";
import { KeyManager } from "./key-manager";
import { UserlessPublicKey, UserlessThread } from "./model";
import { PeerGateway, type EmergencyPayload } from "./peer-gateway";
import { PeerScanner } from "./peer-scanner";
import { createUserlessRuntime } from "./runtime";
import { ThreadResolver, type ResolvedThread } from "./thread-resolver";

export type {
  FileDetail,
  PrivateKeyDetail,
  PublicKeyDetail,
  ResolvedThread,
  UserlessSnapshot,
};

export { UserlessPublicKey, UserlessThread };

export type ReplyDraftRecord = {
  parentHash: Hash;
  body: string;
  createdAt: string;
};

export type UserlessOptions = {
  eventSink?: UserlessEventSink;
};

function getPageWindow(params: PageParams) {
  const offset = params.cursor ? Number.parseInt(params.cursor, 10) || 0 : 0;
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  return { offset, limit };
}

function toPageResult<T>(items: T[], offset: number, limit: number): PageResult<T> {
  return {
    items,
    next_cursor:
      items.length < limit ? undefined : String(offset + items.length),
  };
}

async function hashSignedThreadContent(signedMessage: string): Promise<Hash> {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(signedMessage),
  );

  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function toServerEmergencyPayload(payload: EmergencyPayload) {
  return {
    thread_hash: payload.thread_hash ?? "",
    file_hash: payload.file_hash ?? "",
    pk_fingerprint: payload.pk_fingerprint ?? "",
    reason: payload.reason,
    suggested_action: payload.suggested_action,
  };
}

export class Userless extends UserlessEventEmitter {
  private server: Server;
  private db!: UserlessDatabase;
  private dbReady: Promise<void>;
  private peerScanner!: PeerScanner;
  private threadResolver!: ThreadResolver;
  private keyManager!: KeyManager;
  private fileManager!: FileManager;
  private peerGateway!: PeerGateway;
  private inspector!: UserlessInspector;

  constructor(url: string, options: UserlessOptions = {}) {
    super(options.eventSink);

    this.server = new Server(url, ["threads", "files", "pks"], {
      getAllThreads: async (params) => {
        await this.ensureDB();
        return this.getRootThreadHashesPage(params.cursor, params.limit);
      },
      getReplyThreads: async ({ parentHash, cursor, limit }) => {
        await this.ensureDB();
        return this.getReplyThreadHashesPage(parentHash, cursor, limit);
      },
      getThread: async ({ hash }) => {
        await this.ensureDB();
        const thread = await this.db.getThread(hash);
        if (!thread) {
          throw new Error(`Thread not found: ${hash}`);
        }
        return thread;
      },
      getFile: async ({ hash }) => {
        await this.ensureDB();
        return this.fileManager.getFilePayload(hash);
      },
      getAllPublicKeys: async (params) => {
        await this.ensureDB();
        const keys = (await this.db.getAllPublicKeys()).sort((left, right) =>
          left.fingerprint.localeCompare(right.fingerprint),
        );
        const { offset, limit } = getPageWindow(params);

        return toPageResult(keys.slice(offset, offset + limit), offset, limit);
      },
      getPublicKeys: async ({ fingerprint }) => {
        await this.ensureDB();
        const key = await this.keyManager.getPublicKeyByFingerprintOrId(
          fingerprint,
        );
        if (!key) {
          throw new Error(`Public key not found: ${fingerprint}`);
        }
        return key;
      },
    });

    this.server.onPeerConnected = (peer) => {
      this.emit("peer_connected", { peerId: peer.id });
      void this.handlePeerConnected(peer);
    };
    this.server.onPeerDisconnected = (id) => {
      this.emit("peer_disconnected", { fingerprint: id });
    };
    this.server.onEmergency = (payload) => {
      this.emit("emergency", { payload });
    };

    this.dbReady = this.initializeRuntime();
  }

  private async initializeRuntime(): Promise<void> {
    const runtime = await createUserlessRuntime({
      broadcastEmergency: (payload) =>
        this.server.broadcastEmergency(toServerEmergencyPayload(payload)),
      emitEvent: this.emit.bind(this),
      getConnectionCount: () => this.server.getPeers().length,
      getPeers: () => this.server.getPeers(),
      getTransferStats: () => this.server.getTransferStats(),
      listResolvedThreads: (cursor, limit) =>
        this.listResolvedThreadsInternal(cursor, limit),
    });

    this.db = runtime.db;
    this.fileManager = runtime.fileManager;
    this.inspector = runtime.inspector;
    this.keyManager = runtime.keyManager;
    this.peerGateway = runtime.peerGateway;
    this.peerScanner = runtime.peerScanner;
    this.threadResolver = runtime.threadResolver;
  }

  private async ensureDB(): Promise<void> {
    await this.dbReady;
  }

  private async handlePeerConnected(peer: Peer): Promise<void> {
    await this.ensureDB();
    await this.peerScanner.scanPeerForThreads(peer, DEFAULT_PAGE_SIZE);
  }

  private async getReplyThreadHashesPage(
    parentHash: Hash,
    cursor?: string,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<PageResult<Hash>> {
    await this.ensureDB();

    const hidden = await this.db.getHiddenThreads();
    const hashes: Hash[] = [];
    let nextCursor: string | undefined;

    while (true) {
      const page = await this.threadResolver.getReplyThreadHashesPage(
        parentHash,
        nextCursor,
        DEFAULT_PAGE_SIZE,
      );
      hashes.push(...page.items.filter((hash) => !hidden.has(hash)));

      if (!page.next_cursor) {
        break;
      }

      nextCursor = page.next_cursor;
    }

    const { offset, limit: pageLimit } = getPageWindow({ cursor, limit });

    return toPageResult(
      hashes.slice(offset, offset + pageLimit),
      offset,
      pageLimit,
    );
  }

  private async getRootThreadHashesPage(
    cursor?: string,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<PageResult<Hash>> {
    await this.ensureDB();

    const [hidden, hashes] = await Promise.all([
      this.db.getHiddenThreads(),
      this.threadResolver.getTopLevelThreadHashesAll(),
    ]);

    const visibleHashes = hashes.filter((hash) => !hidden.has(hash));
    const { offset, limit: pageLimit } = getPageWindow({ cursor, limit });

    return toPageResult(
      visibleHashes.slice(offset, offset + pageLimit),
      offset,
      pageLimit,
    );
  }

  private async getAllFilesDetailedInternal(): Promise<FileDetail[]> {
    await this.ensureDB();
    return this.fileManager.getAllFilesDetailed();
  }

  private async getSnapshotInternal(): Promise<UserlessSnapshot> {
    await this.ensureDB();
    return this.inspector.getSnapshot();
  }

  private async getSigningKeyInternal(): Promise<openpgp.PrivateKey | undefined> {
    await this.ensureDB();
    return this.keyManager.getSigningKey();
  }

  public async addPrivateKey(armoredKey: string): Promise<openpgp.PrivateKey> {
    await this.ensureDB();
    return this.keyManager.addPrivateKey(armoredKey);
  }

  private async getPrivateKeysInternal(): Promise<PrivateKeyDetail[]> {
    await this.ensureDB();
    return this.keyManager.getPrivateKeys();
  }

  private async deletePrivateKeyInternal(fingerprint: string): Promise<void> {
    await this.ensureDB();
    await this.keyManager.deletePrivateKey(fingerprint);
  }

  private async saveSigningKeyInternal(
    armoredKey: string,
  ): Promise<openpgp.PrivateKey> {
    await this.ensureDB();
    return this.keyManager.saveSigningKey(armoredKey);
  }

  private async deleteSigningKeyInternal(): Promise<void> {
    await this.ensureDB();
    await this.keyManager.deleteSigningKey();
  }

  private async deletePublicKeyInternal(fingerprint: string): Promise<void> {
    await this.ensureDB();
    await this.keyManager.deletePublicKey(fingerprint);
  }

  private broadcastEmergencyInternal(payload: EmergencyPayload): void {
    this.server.broadcastEmergency(toServerEmergencyPayload(payload));
  }

  private async scanAllPeersInternal(): Promise<void> {
    await this.ensureDB();
    await this.peerScanner.scanAllPeers(DEFAULT_PAGE_SIZE);
  }

  private async hideThreadInternal(hash: Hash): Promise<void> {
    await this.ensureDB();
    await this.db.hideThread(hash);
    this.emit("thread_hidden", { hash });
  }

  public async addThread(body: string): Promise<Hash> {
    await this.ensureDB();
    const signingKey = await this.keyManager.getSigningKey();
    if (!signingKey) {
      throw new Error(
        "No signing key configured. Import or create a private key first.",
      );
    }

    const cleartextMessage = await openpgp.createCleartextMessage({ text: body });
    const signedMessage = await openpgp.sign({
      message: cleartextMessage,
      signingKeys: signingKey,
    });

    return this.storeSignedThreadInternal(signedMessage);
  }

  private async storeSignedThreadInternal(signedMessage: string): Promise<Hash> {
    await this.ensureDB();

    const hash = await hashSignedThreadContent(signedMessage);
    const thread: Thread = {
      content: signedMessage,
    };

    await this.db.saveThread(hash, thread);
    await this.fileManager.scanThreadForFilesAndKeys(thread, hash);
    this.emit("thread_created", { hash });

    return hash;
  }

  public async addFile(name: string, data: ArrayBuffer): Promise<Hash> {
    await this.ensureDB();
    return this.fileManager.addFile(name, data);
  }

  public async storeSignedThread(signedMessage: string): Promise<Hash> {
    return this.storeSignedThreadInternal(signedMessage);
  }

  private async saveReplyDraftInternal(
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

  public async getAllThreads(
    cursor?: string,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<PageResult<UserlessThread>> {
    const hashes = await this.getRootThreadHashesPage(cursor, limit);

    return {
      items: hashes.items.map((hash) => this.getThread(hash)),
      next_cursor: hashes.next_cursor,
    };
  }

  public getThread(hash: Hash): UserlessThread {
    return new UserlessThread(this, hash);
  }

  public getPublicKey(fingerprintOrId: string): UserlessPublicKey {
    return new UserlessPublicKey(this, fingerprintOrId);
  }

  private async getPublicKeyDataInternal(
    fingerprintOrId: string,
  ): Promise<PublicKey | undefined> {
    await this.ensureDB();

    const local = await this.keyManager.getPublicKeyByFingerprintOrId(
      fingerprintOrId,
    );
    if (local) {
      return local;
    }

    return this.peerGateway.queryPeersForPublicKeys(fingerprintOrId);
  }

  private async getThreadDataInternal(hash: Hash): Promise<Thread | undefined> {
    await this.ensureDB();

    const local = await this.db.getThread(hash);
    if (local) {
      return local;
    }

    const thread = await this.peerGateway.queryPeersForThread(hash);
    if (thread) {
      await this.fileManager.scanThreadForFilesAndKeys(thread, hash);
    }

    return thread;
  }

  public async getReplies(
    parentHash: Hash,
    cursor?: string,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<PageResult<UserlessThread>> {
    const page = await this.getReplyThreadHashesPage(parentHash, cursor, limit);
    return {
      items: page.items.map((hash) => this.getThread(hash)),
      next_cursor: page.next_cursor,
    };
  }

  private async getResolvedThreadInternal(hash: Hash): Promise<ResolvedThread> {
    const thread = await this.getThreadDataInternal(hash);
    if (!thread) {
      throw new Error(`Thread not found: ${hash}`);
    }

    return this.threadResolver.buildResolvedThread(hash, thread);
  }

  private async listResolvedThreadsInternal(
    cursor?: string,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<PageResult<ResolvedThread>> {
    await this.ensureDB();

    const hidden = await this.db.getHiddenThreads();
    const hashes = (await this.db.getAllThreadKeys())
      .sort()
      .filter((hash) => !hidden.has(hash));
    const { offset, limit: pageLimit } = getPageWindow({ cursor, limit });
    const pageHashes = hashes.slice(offset, offset + pageLimit);
    const threads = await Promise.all(
      pageHashes.map(async (hash) => {
        const thread = await this.getThreadDataInternal(hash);
        if (!thread) {
          throw new Error(`Thread not found: ${hash}`);
        }
        return thread;
      }),
    );

    return this.threadResolver.listResolvedThreads(
      threads,
      pageHashes,
      undefined,
      pageLimit,
    );
  }

  private async getAllPublicKeysDetailedInternal(): Promise<PublicKeyDetail[]> {
    await this.ensureDB();
    return this.inspector.getAllPublicKeysDetailed();
  }

  private async getResolvedThreadsByPublicKeyInternal(
    fingerprint: string,
  ): Promise<ResolvedThread[]> {
    await this.ensureDB();
    const hidden = await this.db.getHiddenThreads();
    const threads = await this.inspector.getThreadsByPublicKey(fingerprint);
    return threads.filter((thread) => !hidden.has(thread.hash));
  }

  public async getFile(hash: Hash): Promise<ArrayBuffer> {
    await this.ensureDB();
    return this.fileManager.getFile(hash);
  }

  public async getSnapshot(): Promise<UserlessSnapshot> {
    return this.getSnapshotInternal();
  }

  public async getSigningKey(): Promise<openpgp.PrivateKey | undefined> {
    return this.getSigningKeyInternal();
  }

  public async getPrivateKeys(): Promise<PrivateKeyDetail[]> {
    return this.getPrivateKeysInternal();
  }

  public async saveSigningKey(armoredKey: string): Promise<openpgp.PrivateKey> {
    return this.saveSigningKeyInternal(armoredKey);
  }

  public async deleteSigningKey(): Promise<void> {
    await this.deleteSigningKeyInternal();
  }

  public async deletePrivateKey(fingerprint: string): Promise<void> {
    await this.deletePrivateKeyInternal(fingerprint);
  }

  public async deletePublicKey(fingerprint: string): Promise<void> {
    await this.deletePublicKeyInternal(fingerprint);
  }

  public async getAllFilesDetailed(): Promise<FileDetail[]> {
    return this.getAllFilesDetailedInternal();
  }

  public async getAllPublicKeysDetailed(): Promise<PublicKeyDetail[]> {
    return this.getAllPublicKeysDetailedInternal();
  }

  public async getResolvedThread(hash: Hash): Promise<ResolvedThread> {
    return this.getResolvedThreadInternal(hash);
  }

  public async getResolvedThreadsByPublicKey(
    fingerprint: string,
  ): Promise<ResolvedThread[]> {
    return this.getResolvedThreadsByPublicKeyInternal(fingerprint);
  }

  public broadcastEmergency(payload: EmergencyPayload): void {
    this.broadcastEmergencyInternal(payload);
  }

  public async scanAllPeers(): Promise<void> {
    await this.scanAllPeersInternal();
  }

  public async hideThread(hash: Hash): Promise<void> {
    await this.hideThreadInternal(hash);
  }

  public getKeyManager(): KeyManager {
    return this.keyManager;
  }

  public getFileManager(): FileManager {
    return this.fileManager;
  }

  public getInspector(): UserlessInspector {
    return this.inspector;
  }

  public getPeerGateway(): PeerGateway {
    return this.peerGateway;
  }

  public getPeerScanner(): PeerScanner {
    return this.peerScanner;
  }

  public getThreadResolver(): ThreadResolver {
    return this.threadResolver;
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

export function getUserless(options: UserlessOptions = {}): Userless {
  if (!singleton) {
    singleton = new Userless(defaultLobbyUrl(), options);
  }

  return singleton;
}
