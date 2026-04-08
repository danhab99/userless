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

export type Methods = {
  getAllThreads(params: { skip?: number; take?: number }): Promise<Hash[]>;
  getThread(params: { hash: Hash }): Promise<Thread>;
  getFile(params: {
    hash: Hash;
    offset: number;
    length: number;
  }): Promise<FileChunk>;
  getAllPublicKeys(params: {
    skip?: number;
    take?: number;
  }): Promise<PublicKey[]>;
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
  | { action: "new_peer"; payload: { sessionId: string; services: Services } }
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

async function fetchAll<T>(
  fetch: (skip: number) => Promise<T[]>,
  take = DEFAULT_PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = [];
  let skip = 0;
  while (true) {
    const page = await fetch(skip);
    all.push(...page);
    if (page.length < take) break;
    skip += take;
  }
  return all;
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export class Peer {
  readonly id: string;
  readonly services: Services;

  private rpc: TypedJSONRPCClient<Methods>;

  constructor(id: string, services: Services, dc: RTCDataChannel) {
    this.id = id;
    this.services = services;

    this.rpc = new JSONRPCClient((req) => {
      if (dc.readyState === "open") {
        dc.send(JSON.stringify(req));
        return Promise.resolve();
      }
      return Promise.reject(new Error("data channel not open"));
    });

    dc.onmessage = (ev) => {
      this.rpc.receive(JSON.parse(ev.data));
    };
  }

  getAllThreads(
    params: { skip?: number; take?: number } = {},
  ): Promise<Hash[]> {
    return this.rpc.request("getAllThreads", params);
  }

  getAllThreadsAll(): Promise<Hash[]> {
    return fetchAll((skip) =>
      this.getAllThreads({ skip, take: DEFAULT_PAGE_SIZE }),
    );
  }

  getThread(params: { hash: Hash }): Promise<Thread> {
    return this.rpc.request("getThread", params);
  }

  getFile(params: {
    hash: Hash;
    offset: number;
    length: number;
  }): Promise<FileChunk> {
    return this.rpc.request("getFile", params);
  }

  async fetchFile(
    hash: Hash,
    chunkSize = FILE_CHUNK_SIZE,
  ): Promise<Uint8Array> {
    let offset = 0;
    let total = Infinity;
    const chunks: Uint8Array[] = [];

    while (offset < total) {
      const { data, total: fileTotal } = await this.getFile({
        hash,
        offset,
        length: chunkSize,
      });
      total = fileTotal;
      const bytes = base64ToBytes(data);
      chunks.push(bytes);
      offset += bytes.byteLength;
      if (bytes.byteLength === 0) break; // guard against empty chunks
    }

    return concatBytes(chunks);
  }

  getAllPublicKeys(
    params: { skip?: number; take?: number } = {},
  ): Promise<PublicKey[]> {
    return this.rpc.request("getAllPublicKeys", params);
  }

  getAllPublicKeysAll(): Promise<PublicKey[]> {
    return fetchAll((skip) =>
      this.getAllPublicKeys({ skip, take: DEFAULT_PAGE_SIZE }),
    );
  }

  getPublicKeys(params: { fingerprint: string }): Promise<PublicKey> {
    return this.rpc.request("getPublicKeys", params);
  }
}

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export class Server {
  private ws: WebSocket;
  private pcs = new Map<string, RTCPeerConnection>();
  private pendingIce = new Map<string, RTCIceCandidateInit[]>();
  private peers = new Map<string, Peer>();

  private readonly sessionId = crypto.randomUUID();
  private myServices: Services;
  private rpcServer: TypedJSONRPCServer<Methods>;

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

    this.ws = new WebSocket(lobbyUrl);
    this.ws.onopen = () => console.log("[p2p] lobby connected", lobbyUrl);
    this.ws.onclose = () => console.log("[p2p] lobby disconnected", lobbyUrl);
    this.ws.onerror = (err) => console.error("[p2p] lobby error", err);
    this.ws.onmessage = (ev) => {
      const packet: LobbyPacket = JSON.parse(ev.data);
      this.handleLobbyPacket(packet);
    };
  }

  getPeers(): Peer[] {
    return Array.from(this.peers.values());
  }

  announce() {
    if (this.ws.readyState !== WebSocket.OPEN) {
      this.ws.addEventListener("open", () => this.announce(), { once: true });
      return;
    }
    this.sendLobby({
      action: "new_peer",
      payload: { sessionId: this.sessionId, services: this.myServices },
    });
  }

  private sendLobby(p: LobbyPacket) {
    this.ws.send(JSON.stringify(p));
  }

  private handleLobbyPacket(packet: LobbyPacket) {
    switch (packet.action) {
      case "new_peer":
        this.initiateOffer(packet.payload.sessionId, packet.payload.services);
        break;
      case "rtc_offer":
        if (packet.payload.to !== this.sessionId) break;
        this.handleOffer(
          packet.payload.from,
          packet.payload.sdp,
          packet.payload.services,
        );
        break;
      case "rtc_answer":
        if (packet.payload.to !== this.sessionId) break;
        this.handleAnswer(packet.payload.from, packet.payload.sdp);
        break;
      case "rtc_ice":
        if (packet.payload.to !== this.sessionId) break;
        this.handleIce(packet.payload.from, packet.payload.candidate);
        break;
      case "emergency":
        this.onEmergency(packet.payload);
        break;
    }
  }

  private createPC(remoteSessionId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pcs.set(remoteSessionId, pc);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.sendLobby({
          action: "rtc_ice",
          payload: {
            from: this.sessionId,
            to: remoteSessionId,
            candidate: candidate.toJSON(),
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log("[p2p] connection state", remoteSessionId, state);
      if (
        state === "failed" ||
        state === "closed" ||
        state === "disconnected"
      ) {
        pc.close();
        this.pcs.delete(remoteSessionId);
        this.pendingIce.delete(remoteSessionId);
        if (this.peers.delete(remoteSessionId)) {
          this.onPeerDisconnected(remoteSessionId);
        }
      }
    };

    return pc;
  }

  private registerPeer(peer: Peer) {
    this.peers.set(peer.id, peer);
    this.onPeerConnected(peer);
  }

  private attachServerChannel(dc: RTCDataChannel) {
    dc.onmessage = async (ev) => {
      const response = await this.rpcServer.receive(JSON.parse(ev.data));
      if (response) dc.send(JSON.stringify(response));
    };
  }

  private async initiateOffer(remoteSessionId: string, services: Services) {
    if (this.pcs.has(remoteSessionId)) return;
    const pc = this.createPC(remoteSessionId);

    const clientDc = pc.createDataChannel("rpc-client");
    const serverDc = pc.createDataChannel("rpc-server");

    clientDc.onopen = () =>
      this.registerPeer(new Peer(remoteSessionId, services, clientDc));
    serverDc.onopen = () => this.attachServerChannel(serverDc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.sendLobby({
      action: "rtc_offer",
      payload: {
        from: this.sessionId,
        to: remoteSessionId,
        sdp: offer.sdp!,
        services: this.myServices,
      },
    });
  }

  private async handleOffer(
    remoteSessionId: string,
    sdp: string,
    services: Services,
  ) {
    const pc = this.createPC(remoteSessionId);

    pc.ondatachannel = ({ channel }) => {
      if (channel.label === "rpc-server") {
        channel.onopen = () =>
          this.registerPeer(new Peer(remoteSessionId, services, channel));
      } else if (channel.label === "rpc-client") {
        channel.onopen = () => this.attachServerChannel(channel);
      }
    };

    await pc.setRemoteDescription({ type: "offer", sdp });
    await this.drainPendingIce(remoteSessionId, pc);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.sendLobby({
      action: "rtc_answer",
      payload: { from: this.sessionId, to: remoteSessionId, sdp: answer.sdp! },
    });
  }

  private async handleAnswer(remoteSessionId: string, sdp: string) {
    const pc = this.pcs.get(remoteSessionId);
    if (!pc) return;
    await pc.setRemoteDescription({ type: "answer", sdp });
    await this.drainPendingIce(remoteSessionId, pc);
  }

  private async handleIce(
    remoteSessionId: string,
    candidate: RTCIceCandidateInit,
  ) {
    const pc = this.pcs.get(remoteSessionId);
    if (!pc) return;

    if (!pc.remoteDescription) {
      const queue = this.pendingIce.get(remoteSessionId) ?? [];
      queue.push(candidate);
      this.pendingIce.set(remoteSessionId, queue);
      return;
    }

    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  private async drainPendingIce(
    remoteSessionId: string,
    pc: RTCPeerConnection,
  ) {
    const queued = this.pendingIce.get(remoteSessionId);
    if (!queued) return;
    this.pendingIce.delete(remoteSessionId);
    for (const candidate of queued) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  private buildRpcServer(
    methods: Partial<Methods>,
  ): TypedJSONRPCServer<Methods> {
    const server: TypedJSONRPCServer<Methods> = new JSONRPCServer();
    for (const [name, fn] of Object.entries(methods)) {
      server.addMethod(name, fn as any);
    }
    return server;
  }
}
