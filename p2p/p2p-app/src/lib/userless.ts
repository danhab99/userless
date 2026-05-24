import * as openpgp from "openpgp";
import {
  DEFAULT_PAGE_SIZE,
  type FileChunk,
  type Hash,
  normalizeLobbyUrl,
  type PageParams,
  type PageResult,
  type Peer,
  type PublicKey,
  Server,
  type Thread,
} from "./p2p";
import { AppService, type ReplyDraftRecord } from "./app-service";
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
  ReplyDraftRecord,
  ResolvedThread,
  UserlessSnapshot,
};

export { AppService, UserlessPublicKey, UserlessThread };

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
  private appSingleton: AppService;

  constructor(url: string, options: UserlessOptions = {}) {
    super(options.eventSink);

    this.appSingleton = new AppService({
      getAllFilesDetailed: () => this.getAllFilesDetailedInternal(),
      getSnapshot: () => this.getSnapshotInternal(),
      getSigningKey: () => this.getSigningKeyInternal(),
      addPrivateKey: (armoredKey) => this.addPrivateKeyInternal(armoredKey),
      getPrivateKeys: () => this.getPrivateKeysInternal(),
      deletePrivateKey: (fingerprint) => this.deletePrivateKeyInternal(fingerprint),
      saveSigningKey: (armoredKey) => this.saveSigningKeyInternal(armoredKey),
      deleteSigningKey: () => this.deleteSigningKeyInternal(),
      deletePublicKey: (fingerprint) => this.deletePublicKeyInternal(fingerprint),
      saveReplyDraft: (parentHash, body) =>
        this.saveReplyDraftInternal(parentHash, body),
      broadcastEmergency: (payload) => this.broadcastEmergencyInternal(payload),
      scanAllPeers: () => this.scanAllPeersInternal(),
      hideThread: (hash) => this.hideThreadInternal(hash),
      createThread: (body) => this.createThreadInternal(body),
      storeSignedThread: (signedMessage) =>
        this.storeSignedThreadInternal(signedMessage),
      addFile: (name, data) => this.addFileInternal(name, data),
    });

    this.server = new Server(url, ["threads", "files", "pks"], {
      getAllThreads: async (params) => {
        await this.ensureDB();
        return this.getAllThreads(params.cursor, params.limit);
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
      getFile: async ({ hash, offset, length }) => {
        await this.ensureDB();
        return this.fileManager.getFileChunk(hash, offset, length);
      },
      getAllPublicKeys: async (params) => {
        await this.ensureDB();
        return this.getAllPublicKeysPage(params);
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
      createThread: (body) => this.createThreadInternal(body),
      emitEvent: this.emit.bind(this),
      getConnectionCount: () => this.server.getPeers().length,
      getPeers: () => this.server.getPeers(),
      getTransferStats: () => this.server.getTransferStats(),
      hideThread: (hash) => this.hideThreadInternal(hash),
      listResolvedThreads: (cursor, limit) =>
        this.listResolvedThreads(cursor, limit),
      saveReplyDraft: (parentHash, body) =>
        this.saveReplyDraftInternal(parentHash, body),
      scanAllPeers: () => this.scanAllPeersInternal(),
      storeSignedThread: (signedMessage) =>
        this.storeSignedThreadInternal(signedMessage),
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

  private async getVisibleHiddenSet(): Promise<Set<Hash>> {
    await this.ensureDB();
    return this.db.getHiddenThreads();
  }

  private async getVisibleTopLevelThreadHashes(): Promise<Hash[]> {
    const [hidden, hashes] = await Promise.all([
      this.getVisibleHiddenSet(),
      this.threadResolver.getTopLevelThreadHashesAll(),
    ]);

    return hashes.filter((hash) => !hidden.has(hash));
  }

  private async getAllReplyThreadHashes(parentHash: Hash): Promise<Hash[]> {
    const hidden = await this.getVisibleHiddenSet();
    const hashes: Hash[] = [];
    let cursor: string | undefined;

    while (true) {
      const page = await this.threadResolver.getReplyThreadHashesPage(
        parentHash,
        cursor,
        DEFAULT_PAGE_SIZE,
      );
      hashes.push(...page.items.filter((hash) => !hidden.has(hash)));

      if (!page.next_cursor) {
        return hashes;
      }

      cursor = page.next_cursor;
    }
  }

  private async getReplyThreadHashesPage(
    parentHash: Hash,
    cursor?: string,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<PageResult<Hash>> {
    const hashes = await this.getAllReplyThreadHashes(parentHash);
    const { offset, limit: pageLimit } = getPageWindow({ cursor, limit });

    return toPageResult(
      hashes.slice(offset, offset + pageLimit),
      offset,
      pageLimit,
    );
  }

  private async getAllPublicKeysPage(
    params: PageParams,
  ): Promise<PageResult<PublicKey>> {
    const keys = (await this.db.getAllPublicKeys()).sort((left, right) =>
      left.fingerprint.localeCompare(right.fingerprint),
    );
    const { offset, limit } = getPageWindow(params);

    return toPageResult(keys.slice(offset, offset + limit), offset, limit);
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

  private async addPrivateKeyInternal(
    armoredKey: string,
  ): Promise<openpgp.PrivateKey> {
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

  private async createThreadInternal(body: string): Promise<Hash> {
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

  private async addFileInternal(name: string, data: ArrayBuffer): Promise<Hash> {
    await this.ensureDB();
    return this.fileManager.addFile(name, data);
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

  public getAppService(): AppService {
    return this.appSingleton;
  }

  public async getRootThreads(
    cursor?: string,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<PageResult<UserlessThread>> {
    const hashes = await this.getAllThreads(cursor, limit);

    return {
      items: hashes.items.map((hash) => this.getThreadClass(hash)),
      next_cursor: hashes.next_cursor,
    };
  }

  public async *iterateRootThreads(
    limit = DEFAULT_PAGE_SIZE,
  ): AsyncGenerator<UserlessThread, void, undefined> {
    let cursor: string | undefined;

    while (true) {
      const page = await this.getRootThreads(cursor, limit);
      for (const thread of page.items) {
        yield thread;
      }

      if (!page.next_cursor) {
        return;
      }

      cursor = page.next_cursor;
    }
  }

  public getThreadClass(hash: Hash): UserlessThread {
    return new UserlessThread(this, hash);
  }

  public getPublicKeyClass(fingerprint: string): UserlessPublicKey {
    return new UserlessPublicKey(this, fingerprint);
  }

  public async getPublicKey(
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

  public async getThread(hash: Hash): Promise<Thread | undefined> {
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

  public async getReplyThreadClasses(parentHash: Hash): Promise<UserlessThread[]> {
    const hashes = await this.getAllReplyThreadHashes(parentHash);
    return hashes.map((hash) => this.getThreadClass(hash));
  }

  public async getThreadClassesByPublicKey(
    fingerprint: string,
  ): Promise<UserlessThread[]> {
    const threads = await this.getThreadsByPublicKey(fingerprint);
    return threads.map((thread) => this.getThreadClass(thread.hash));
  }

  public async resolveThread(hash: Hash): Promise<ResolvedThread> {
    const thread = await this.getThread(hash);
    if (!thread) {
      throw new Error(`Thread not found: ${hash}`);
    }

    return this.threadResolver.resolveThread(hash, thread);
  }

  public async listResolvedThreads(
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
        const thread = await this.getThread(hash);
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

  public async getAllThreads(
    cursor?: string,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<PageResult<Hash>> {
    const hashes = await this.getVisibleTopLevelThreadHashes();
    const { offset, limit: pageLimit } = getPageWindow({ cursor, limit });

    return toPageResult(
      hashes.slice(offset, offset + pageLimit),
      offset,
      pageLimit,
    );
  }

  public async getReplyThreads(parentHash: Hash): Promise<ResolvedThread[]> {
    await this.ensureDB();
    const hidden = await this.db.getHiddenThreads();
    const replies = await this.threadResolver.getReplyThreads(parentHash);
    return replies.filter((thread) => !hidden.has(thread.hash));
  }

  public async getAllPublicKeysDetailed(): Promise<PublicKeyDetail[]> {
    await this.ensureDB();
    return this.inspector.getAllPublicKeysDetailed();
  }

  public async getThreadsByPublicKey(
    fingerprint: string,
  ): Promise<ResolvedThread[]> {
    await this.ensureDB();
    const hidden = await this.db.getHiddenThreads();
    const threads = await this.inspector.getThreadsByPublicKey(fingerprint);
    return threads.filter((thread) => !hidden.has(thread.hash));
  }

  public async getFileChunk(
    hash: Hash,
    offset: number,
    length: number,
  ): Promise<FileChunk> {
    await this.ensureDB();
    return this.fileManager.getFileChunk(hash, offset, length);
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

export function getAppService(options: UserlessOptions = {}): AppService {
  return getUserless(options).getAppService();
}
