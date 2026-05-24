import type { Hash, Peer, PublicKey, Thread } from "./p2p";
import { UserlessDatabase } from "./database";
import { UserlessEventEmitter, type UserlessEventSink } from "./events";

export type EmergencyPayload = {
  thread_hash?: string;
  file_hash?: string;
  pk_fingerprint?: string;
  reason: string;
  suggested_action: "remove" | "hide";
};

export class PeerGateway extends UserlessEventEmitter {
  private db: UserlessDatabase;
  private getPeers: () => Peer[];
  private broadcastEmergencyImpl: (payload: EmergencyPayload) => void;
  private getPublicKeyByFingerprintOrId: (
    fingerprintOrId: string,
  ) => Promise<PublicKey | undefined>;
  private upsertPublicKeyWithAliases: (key: PublicKey) => Promise<void>;

  constructor(
    db: UserlessDatabase,
    getPeers: () => Peer[],
    broadcastEmergencyImpl: (payload: EmergencyPayload) => void,
    getPublicKeyByFingerprintOrId: (
      fingerprintOrId: string,
    ) => Promise<PublicKey | undefined>,
    upsertPublicKeyWithAliases: (key: PublicKey) => Promise<void>,
    eventSink?: UserlessEventSink,
  ) {
    super(eventSink);
    this.db = db;
    this.getPeers = getPeers;
    this.broadcastEmergencyImpl = broadcastEmergencyImpl;
    this.getPublicKeyByFingerprintOrId = getPublicKeyByFingerprintOrId;
    this.upsertPublicKeyWithAliases = upsertPublicKeyWithAliases;
  }

  getAllPeers(): Peer[] {
    return this.getPeers();
  }

  broadcastEmergency(payload: EmergencyPayload): void {
    this.broadcastEmergencyImpl(payload);
  }

  async queryPeersForThread(hash: Hash): Promise<Thread | undefined> {
    return this.queryPeers(
      () => this.db.getThread(hash),
      (peer) => peer.getThread({ hash }),
      async (thread) => {
        await this.db.saveThread(hash, thread);
        this.emit("thread_cached", { hash });
      },
    );
  }

  async queryPeersForPublicKeys(
    fingerprintOrId: string,
  ): Promise<PublicKey | undefined> {
    return this.queryPeers(
      () => this.getPublicKeyByFingerprintOrId(fingerprintOrId),
      (peer) => peer.getPublicKeys({ fingerprint: fingerprintOrId }),
      async (key) => {
        await this.upsertPublicKeyWithAliases(key);
        this.emit("public_key_cached", { fingerprint: key.fingerprint });
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