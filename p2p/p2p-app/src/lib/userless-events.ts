import type { Hash } from "./p2p";

export type UserlessEventMap = {
  peer_connected: { peerId: string };
  peer_disconnected: { fingerprint: string };
  emergency: { payload: unknown };
  thread_cached: { hash: Hash };
  public_key_cached: { fingerprint: string };
  file_cached: { hash: Hash; sourceThreadHash?: Hash };
  reply_draft_saved: { parentHash: Hash };
  thread_created: { hash: Hash };
  file_added: { name: string; hash: Hash };
};

export interface UserlessEventSink {
  emit<K extends keyof UserlessEventMap>(
    event: K,
    payload: UserlessEventMap[K],
  ): void | Promise<void>;
}

export type UserlessEventDispatcher = {
  emit<K extends keyof UserlessEventMap>(event: K, payload: UserlessEventMap[K]): void;
};

export function createUserlessEventDispatcher(
  sink?: UserlessEventSink,
): UserlessEventDispatcher {
  return {
    emit(event, payload) {
      if (!sink) {
        return;
      }

      // Event delivery should not block core P2P and storage paths.
      void Promise.resolve(sink.emit(event, payload)).catch(() => undefined);
    },
  };
}
