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

export type UserlessEventListener<K extends keyof UserlessEventMap> = (
  payload: UserlessEventMap[K],
) => void;

export class UserlessEventEmitter {
  private readonly listeners = new Map<
    keyof UserlessEventMap,
    Set<(payload: unknown) => void>
  >();
  private readonly sink?: UserlessEventSink;

  constructor(sink?: UserlessEventSink) {
    this.sink = sink;
  }

  public on<K extends keyof UserlessEventMap>(
    event: K,
    listener: UserlessEventListener<K>,
  ): () => void {
    const eventListeners =
      this.listeners.get(event) ?? new Set<(payload: unknown) => void>();

    eventListeners.add(listener as (payload: unknown) => void);
    this.listeners.set(event, eventListeners);

    return () => {
      this.off(event, listener);
    };
  }

  public once<K extends keyof UserlessEventMap>(
    event: K,
    listener: UserlessEventListener<K>,
  ): () => void {
    const dispose = this.on(event, (payload) => {
      dispose();
      listener(payload);
    });

    return dispose;
  }

  public off<K extends keyof UserlessEventMap>(
    event: K,
    listener: UserlessEventListener<K>,
  ): void {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) {
      return;
    }

    eventListeners.delete(listener as (payload: unknown) => void);

    if (eventListeners.size === 0) {
      this.listeners.delete(event);
    }
  }

  public emit<K extends keyof UserlessEventMap>(
    event: K,
    payload: UserlessEventMap[K],
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const listener of [...eventListeners]) {
        listener(payload);
      }
    }

    if (!this.sink) {
      return;
    }

    // Event delivery should not block core P2P and storage paths.
    void Promise.resolve(this.sink.emit(event, payload)).catch(() => undefined);
  }
}
