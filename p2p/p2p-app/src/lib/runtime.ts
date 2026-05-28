import { DEFAULT_PAGE_SIZE, type Hash, type Peer, type TransferStats } from "./p2p";
import { UserlessDatabase, openUserlessDatabase } from "./database";
import { type UserlessEventSink } from "./events";
import { FileManager } from "./file-manager";
import { UserlessInspector } from "./inspector";
import { KeyManager } from "./key-manager";
import { PeerGateway, type EmergencyPayload } from "./peer-gateway";
import { PeerScanner } from "./peer-scanner";
import { ThreadResolver, type ResolvedThread } from "./thread-resolver";

export type UserlessRuntime = {
  db: UserlessDatabase;
  fileManager: FileManager;
  inspector: UserlessInspector;
  keyManager: KeyManager;
  peerGateway: PeerGateway;
  peerScanner: PeerScanner;
  threadResolver: ThreadResolver;
};

type CreateUserlessRuntimeArgs = {
  broadcastEmergency: (payload: EmergencyPayload) => void;
  emitEvent: UserlessEventSink["emit"];
  getConnectionCount: () => number;
  getPeers: () => Peer[];
  getTransferStats: () => TransferStats;
  listResolvedThreads: (
    cursor?: string,
    limit?: number,
  ) => Promise<{ items: ResolvedThread[]; next_cursor?: string }>;
};

export async function createUserlessRuntime(
  args: CreateUserlessRuntimeArgs,
): Promise<UserlessRuntime> {
  const db = await openUserlessDatabase();
  const serviceEventSink: UserlessEventSink = {
    emit: args.emitEvent,
  };

  const keyManager = new KeyManager(db, serviceEventSink);
  const peerGateway = new PeerGateway(
    db,
    args.getPeers,
    args.broadcastEmergency,
    (fingerprintOrId) => keyManager.getPublicKeyByFingerprintOrId(fingerprintOrId),
    (key) => keyManager.upsertPublicKeyWithAliases(key),
    serviceEventSink,
  );
  const peerScanner = new PeerScanner(db, args.getPeers, serviceEventSink);
  const threadResolver = new ThreadResolver(
    db,
    (fingerprintOrId) => peerGateway.queryPeersForPublicKeys(fingerprintOrId),
    serviceEventSink,
  );
  const fileManager = new FileManager(
    db,
    args.getPeers,
    (fingerprintOrId) => peerGateway.queryPeersForPublicKeys(fingerprintOrId),
    (key) => keyManager.upsertPublicKeyWithAliases(key),
    serviceEventSink,
  );
  const inspector = new UserlessInspector(
    db,
    args.getConnectionCount,
    args.getTransferStats,
    args.listResolvedThreads,
  );
  return {
    db,
    fileManager,
    inspector,
    keyManager,
    peerGateway,
    peerScanner,
    threadResolver,
  };
}