import {
  JSONRPCClient,
  JSONRPCServer,
  type TypedJSONRPCClient,
  type TypedJSONRPCServer,
} from "json-rpc-2.0";

export type Hash = string;
export type Thread = { content: string };
export type PublicKey = { fingerprint: string; armored: string };

export type Service = "threads" | "files" | "pks";
export type Services = Array<Service>;

export const DEFAULT_PAGE_SIZE = 100;
export const FILE_CHUNK_SIZE = 192 * 1024;

export type FileChunk = {
  data: string;
  total: number;
};

export type PageParams = {
  cursor?: string;
  limit?: number;
};

export type PageResult<T> = {
  items: T[];
  next_cursor?: string;
};

export type Methods = {
  getAllThreads(params: PageParams): Promise<PageResult<Hash>>;
  getThread(params: { hash: Hash }): Promise<Thread>;
  getFile(params: {
    hash: Hash;
    offset: number;
    length: number;
  }): Promise<FileChunk>;
  getAllPublicKeys(params: PageParams): Promise<PageResult<PublicKey>>;
  getPublicKeys(params: { fingerprint: string }): Promise<PublicKey>;
};

type EmergencyPayload = {
  thread_hash: string;
  file_hash: string;
  pk_fingerprint: string;
  reason: string;
  suggested_action: "remove" | "hide";
};

type LobbyPacket =
  | { action: "new_peer"; payload: { fingerprint: string; services: Services } }
  | { action: "emergency"; payload: EmergencyPayload }
  | {
      action: "rtc_offer";
      payload: { from: string; to: string; sdp: string; services: Services };
    }
  | { action: "rtc_answer"; payload: { from: string; to: string; sdp: string } }
  | {
      action: "rtc_ice";
      payload: { from: string; to: string; candidate: RTCIceCandidateInit };
    };

export type TransferStats = {
  uploadedBytes: number;
  downloadedBytes: number;
};

export function normalizeLobbyUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error("Lobby URL is empty");
  }

  const defaultProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
  const candidate = /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `${defaultProtocol}${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate, window.location.href);
  } catch {
    throw new Error(`Invalid lobby URL: ${trimmed}`);
  }

  if (parsed.protocol === "http:") {
    parsed.protocol = "ws:";
  } else if (parsed.protocol === "https:") {
    parsed.protocol = "wss:";
  }

  if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
    throw new Error(`Lobby URL must use ws:// or wss://: ${parsed.toString()}`);
  }

  if (parsed.pathname === "/") {
    parsed.pathname = "/lobby";
  }

  return parsed.toString();
}

async function fetchAll<T>(
  fetchPage: (cursor?: string) => Promise<PageResult<T>>,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;

  while (true) {
    const page = await fetchPage(cursor);
    all.push(...page.items);
    if (!page.next_cursor) {
      break;
    }
    cursor = page.next_cursor;
  }

  return all;
}

function countPayloadBytes(payload: string): number {
  return new TextEncoder().encode(payload).byteLength;
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((size, chunk) => size + chunk.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result;
}

type PeerAccounting = {
  onSend?: (bytes: number) => void;
  onReceive?: (bytes: number) => void;
};

export class Peer {
  readonly id: string;
  readonly services: Services;

  private readonly rpc: TypedJSONRPCClient<Methods>;

  constructor(
    id: string,
    services: Services,
    dc: RTCDataChannel,
    accounting: PeerAccounting = {},
  ) {
    this.id = id;
    this.services = services;

    this.rpc = new JSONRPCClient((req) => {
      if (dc.readyState !== "open") {
        return Promise.reject(new Error("data channel not open"));
      }

      const payload = JSON.stringify(req);
      accounting.onSend?.(countPayloadBytes(payload));
      dc.send(payload);

      return Promise.resolve();
    });

    dc.addEventListener("message", (event) => {
      if (typeof event.data !== "string") {
        return;
      }

      accounting.onReceive?.(countPayloadBytes(event.data));
      this.rpc.receive(JSON.parse(event.data));
    });
  }

  private request<K extends keyof Methods>(
    method: K,
    params: Parameters<Methods[K]>[0],
  ): ReturnType<Methods[K]> {
    return Promise.resolve(
      (this.rpc.request as (methodName: K, methodParams: Parameters<Methods[K]>[0]) => unknown)(
        method,
        params,
      ),
    ) as ReturnType<Methods[K]>;
  }

  getAllThreads(params: PageParams = {}): Promise<PageResult<Hash>> {
    return this.request("getAllThreads", params);
  }

  getAllThreadsAll(): Promise<Hash[]> {
    return fetchAll((cursor) => this.getAllThreads({ cursor, limit: DEFAULT_PAGE_SIZE }));
  }

  getThread(params: { hash: Hash }): Promise<Thread> {
    return this.request("getThread", params);
  }

  getFile(params: {
    hash: Hash;
    offset: number;
    length: number;
  }): Promise<FileChunk> {
    return this.request("getFile", params);
  }

  async fetchFile(
    hash: Hash,
    chunkSize = FILE_CHUNK_SIZE,
  ): Promise<Uint8Array> {
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;
    const chunks: Uint8Array[] = [];

    while (offset < total) {
      const { data, total: nextTotal } = await this.getFile({
        hash,
        offset,
        length: chunkSize,
      });

      total = nextTotal;

      const bytes = base64ToBytes(data);
      if (bytes.byteLength === 0) {
        break;
      }

      chunks.push(bytes);
      offset += bytes.byteLength;
    }

    return concatBytes(chunks);
  }

  getAllPublicKeys(params: PageParams = {}): Promise<PageResult<PublicKey>> {
    return this.request("getAllPublicKeys", params);
  }

  getAllPublicKeysAll(): Promise<PublicKey[]> {
    return fetchAll((cursor) =>
      this.getAllPublicKeys({ cursor, limit: DEFAULT_PAGE_SIZE }),
    );
  }

  getPublicKeys(params: { fingerprint: string }): Promise<PublicKey> {
    return this.request("getPublicKeys", params);
  }
}

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export class Server {
  private readonly ws: WebSocket;
  private readonly pcs = new Map<string, RTCPeerConnection>();
  private readonly pendingIce = new Map<string, RTCIceCandidateInit[]>();
  private readonly peers = new Map<string, Peer>();
  private readonly fingerprint = crypto.randomUUID();
  private readonly myServices: Services;
  private readonly rpcServer: TypedJSONRPCServer<Methods>;

  private uploadedBytes = 0;
  private downloadedBytes = 0;

  onPeerConnected: (peer: Peer) => void = () => {};
  onPeerDisconnected: (id: string) => void = () => {};
  onEmergency: (payload: EmergencyPayload) => void = () => {};

  constructor(
    lobbyUrl: string,
    services: Services,
    methods: Partial<Methods> = {},
  ) {
    this.myServices = services;
    this.rpcServer = this.buildRpcServer(methods);

    const normalizedLobbyUrl = normalizeLobbyUrl(lobbyUrl);

    this.ws = new WebSocket(normalizedLobbyUrl);
    this.ws.addEventListener("open", () => {
      console.log("[p2p] lobby connected", normalizedLobbyUrl);
      this.announce();
    });
    this.ws.addEventListener("close", () => {
      console.log("[p2p] lobby disconnected", normalizedLobbyUrl);
    });
    this.ws.addEventListener("error", (error) => {
      console.error("[p2p] lobby error", error);
    });
    this.ws.addEventListener("message", (event) => {
      if (typeof event.data !== "string") {
        return;
      }

      this.downloadedBytes += countPayloadBytes(event.data);
      this.handleLobbyPacket(JSON.parse(event.data) as LobbyPacket);
    });
  }

  getPeers(): Peer[] {
    return Array.from(this.peers.values());
  }

  getTransferStats(): TransferStats {
    return {
      uploadedBytes: this.uploadedBytes,
      downloadedBytes: this.downloadedBytes,
    };
  }

  announce() {
    if (this.ws.readyState !== WebSocket.OPEN) {
      this.ws.addEventListener("open", () => this.announce(), { once: true });
      return;
    }

    this.sendLobby({
      action: "new_peer",
      payload: { fingerprint: this.fingerprint, services: this.myServices },
    });
  }

  private sendLobby(packet: LobbyPacket) {
    const payload = JSON.stringify(packet);
    this.uploadedBytes += countPayloadBytes(payload);
    this.ws.send(payload);
  }

  private handleLobbyPacket(packet: LobbyPacket) {
    switch (packet.action) {
      case "new_peer":
        if (packet.payload.fingerprint === this.fingerprint) {
          break;
        }
        void this.initiateOffer(packet.payload.fingerprint, packet.payload.services);
        break;
      case "rtc_offer":
        if (packet.payload.to !== this.fingerprint) {
          break;
        }
        void this.handleOffer(
          packet.payload.from,
          packet.payload.sdp,
          packet.payload.services,
        );
        break;
      case "rtc_answer":
        if (packet.payload.to !== this.fingerprint) {
          break;
        }
        void this.handleAnswer(packet.payload.from, packet.payload.sdp);
        break;
      case "rtc_ice":
        if (packet.payload.to !== this.fingerprint) {
          break;
        }
        void this.handleIce(packet.payload.from, packet.payload.candidate);
        break;
      case "emergency":
        this.onEmergency(packet.payload);
        break;
    }
  }

  private createPC(remotePeerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pcs.set(remotePeerId, pc);

    pc.addEventListener("icecandidate", ({ candidate }) => {
      if (!candidate) {
        return;
      }

      this.sendLobby({
        action: "rtc_ice",
        payload: {
          from: this.fingerprint,
          to: remotePeerId,
          candidate: candidate.toJSON(),
        },
      });
    });

    pc.addEventListener("connectionstatechange", () => {
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "closed" ||
        pc.connectionState === "disconnected"
      ) {
        pc.close();
        this.pcs.delete(remotePeerId);
        this.pendingIce.delete(remotePeerId);

        if (this.peers.delete(remotePeerId)) {
          this.onPeerDisconnected(remotePeerId);
        }
      }
    });

    return pc;
  }

  private registerPeer(peer: Peer) {
    this.peers.set(peer.id, peer);
    this.onPeerConnected(peer);
  }

  private attachServerChannel(dc: RTCDataChannel) {
    dc.addEventListener("message", async (event) => {
      if (typeof event.data !== "string") {
        return;
      }

      this.downloadedBytes += countPayloadBytes(event.data);
      const response = await this.rpcServer.receive(JSON.parse(event.data));
      if (!response || dc.readyState !== "open") {
        return;
      }

      const payload = JSON.stringify(response);
      this.uploadedBytes += countPayloadBytes(payload);
      dc.send(payload);
    });
  }

  private createPeer(remotePeerId: string, services: Services, dc: RTCDataChannel) {
    return new Peer(remotePeerId, services, dc, {
      onSend: (bytes) => {
        this.uploadedBytes += bytes;
      },
      onReceive: (bytes) => {
        this.downloadedBytes += bytes;
      },
    });
  }

  private async initiateOffer(remotePeerId: string, services: Services) {
    if (this.pcs.has(remotePeerId)) {
      return;
    }

    const pc = this.createPC(remotePeerId);
    const clientDc = pc.createDataChannel("rpc-client");
    const serverDc = pc.createDataChannel("rpc-server");

    clientDc.addEventListener("open", () => {
      this.registerPeer(this.createPeer(remotePeerId, services, clientDc));
    });
    serverDc.addEventListener("open", () => {
      this.attachServerChannel(serverDc);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.sendLobby({
      action: "rtc_offer",
      payload: {
        from: this.fingerprint,
        to: remotePeerId,
        sdp: offer.sdp ?? "",
        services: this.myServices,
      },
    });
  }

  private async handleOffer(
    remotePeerId: string,
    sdp: string,
    services: Services,
  ) {
    const existing = this.pcs.get(remotePeerId);
    const pc = existing ?? this.createPC(remotePeerId);

    pc.ondatachannel = ({ channel }) => {
      if (channel.label === "rpc-server") {
        channel.addEventListener("open", () => {
          this.registerPeer(this.createPeer(remotePeerId, services, channel));
        });
        return;
      }

      if (channel.label === "rpc-client") {
        channel.addEventListener("open", () => {
          this.attachServerChannel(channel);
        });
      }
    };

    await pc.setRemoteDescription({ type: "offer", sdp });
    await this.drainPendingIce(remotePeerId, pc);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.sendLobby({
      action: "rtc_answer",
      payload: {
        from: this.fingerprint,
        to: remotePeerId,
        sdp: answer.sdp ?? "",
      },
    });
  }

  private async handleAnswer(remotePeerId: string, sdp: string) {
    const pc = this.pcs.get(remotePeerId);
    if (!pc) {
      return;
    }

    await pc.setRemoteDescription({ type: "answer", sdp });
    await this.drainPendingIce(remotePeerId, pc);
  }

  private async handleIce(remotePeerId: string, candidate: RTCIceCandidateInit) {
    const pc = this.pcs.get(remotePeerId);
    if (!pc) {
      return;
    }

    if (!pc.remoteDescription) {
      const queue = this.pendingIce.get(remotePeerId) ?? [];
      queue.push(candidate);
      this.pendingIce.set(remotePeerId, queue);
      return;
    }

    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  private async drainPendingIce(remotePeerId: string, pc: RTCPeerConnection) {
    const queued = this.pendingIce.get(remotePeerId);
    if (!queued) {
      return;
    }

    this.pendingIce.delete(remotePeerId);
    for (const candidate of queued) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  private buildRpcServer(methods: Partial<Methods>): TypedJSONRPCServer<Methods> {
    const server: TypedJSONRPCServer<Methods> = new JSONRPCServer();
    const methodNames = Object.keys(methods) as Array<keyof Methods>;

    for (const methodName of methodNames) {
      const handler = methods[methodName];
      if (handler) {
        server.addMethod(methodName, handler as any);
      }
    }

    return server;
  }
}
