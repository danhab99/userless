import {
  JSONRPCClient,
  JSONRPCServer,
  type TypedJSONRPCClient,
  type TypedJSONRPCServer,
} from "json-rpc-2.0";

export type Hash = string;
export type Thread = { content: string };
export type PublicKey = { fingerprint: string; armored: string };
export type Fingerprint = string;

export type Service = "threads" | "files" | "pks";
export type Services = Array<Service>;

/** The RPC methods a peer can serve. Implement these to share your local data. */
export type Methods = {
  getAllThreads(): Hash[];
  getThread(params: { hash: Hash }): Thread;
  getFile(params: { hash: Hash }): ArrayBuffer;
  getAllPublicKeys(): PublicKey[];
  getPublicKeys(params: { fingerprint: Fingerprint }): PublicKey;
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

export class Peer {
  readonly fingerprint: string;
  readonly services: Services;

  private rpc: TypedJSONRPCClient<Methods>;

  constructor(fingerprint: string, services: Services, dc: RTCDataChannel) {
    this.fingerprint = fingerprint;
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

  getAllThreads(): PromiseLike<Hash[]> {
    return this.rpc.request("getAllThreads", undefined);
  }

  getThread(params: { hash: Hash }): PromiseLike<Thread> {
    return this.rpc.request("getThread", params);
  }

  getFile(params: { hash: Hash }): PromiseLike<ArrayBuffer> {
    return this.rpc.request("getFile", params);
  }

  getAllPublicKeys(): PromiseLike<PublicKey[]> {
    return this.rpc.request("getAllPublicKeys", undefined);
  }

  getPublicKeys(params: { fingerprint: Fingerprint }): PromiseLike<PublicKey> {
    return this.rpc.request("getPublicKeys", params);
  }
}

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export class Server {
  private ws: WebSocket;
  private pcs = new Map<string, RTCPeerConnection>();
  private pendingIce = new Map<string, RTCIceCandidateInit[]>();
  private peers = new Map<string, Peer>();

  private myFingerprint: string;
  private myServices: Services;
  private rpcServer: TypedJSONRPCServer<Methods>;

  onPeerConnected: (peer: Peer) => void = () => {};

  onPeerDisconnected: (fingerprint: string) => void = () => {};

  onEmergency: (payload: EmergencyPayload) => void = () => {};

  constructor(
    lobbyUrl: string,
    fingerprint: string,
    services: Services,
    methods: Partial<Methods> = {},
  ) {
    this.myFingerprint = fingerprint;
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
      payload: { fingerprint: this.myFingerprint, services: this.myServices },
    });
  }

  private sendLobby(p: LobbyPacket) {
    this.ws.send(JSON.stringify(p));
  }

  private handleLobbyPacket(packet: LobbyPacket) {
    switch (packet.action) {
      case "new_peer":
        this.initiateOffer(packet.payload.fingerprint, packet.payload.services);
        break;
      case "rtc_offer":
        if (packet.payload.to !== this.myFingerprint) break;
        this.handleOffer(packet.payload.from, packet.payload.sdp, packet.payload.services);
        break;
      case "rtc_answer":
        if (packet.payload.to !== this.myFingerprint) break;
        this.handleAnswer(packet.payload.from, packet.payload.sdp);
        break;
      case "rtc_ice":
        if (packet.payload.to !== this.myFingerprint) break;
        this.handleIce(packet.payload.from, packet.payload.candidate);
        break;
      case "emergency":
        this.onEmergency(packet.payload);
        break;
    }
  }

  private createPC(remoteFingerprint: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pcs.set(remoteFingerprint, pc);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.sendLobby({
          action: "rtc_ice",
          payload: {
            from: this.myFingerprint,
            to: remoteFingerprint,
            candidate: candidate.toJSON(),
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log("[p2p] connection state", remoteFingerprint, state);
      if (state === "failed" || state === "closed" || state === "disconnected") {
        pc.close();
        this.pcs.delete(remoteFingerprint);
        this.pendingIce.delete(remoteFingerprint);
        if (this.peers.delete(remoteFingerprint)) {
          this.onPeerDisconnected(remoteFingerprint);
        }
      }
    };

    return pc;
  }

  private registerPeer(peer: Peer) {
    this.peers.set(peer.fingerprint, peer);
    this.onPeerConnected(peer);
  }

  private attachServerChannel(dc: RTCDataChannel) {
    dc.onmessage = async (ev) => {
      const response = await this.rpcServer.receive(JSON.parse(ev.data));
      if (response) dc.send(JSON.stringify(response));
    };
  }

  private async initiateOffer(remoteFingerprint: string, services: Services) {
    if (this.pcs.has(remoteFingerprint)) return;
    const pc = this.createPC(remoteFingerprint);

    const clientDc = pc.createDataChannel("rpc-client");
    const serverDc = pc.createDataChannel("rpc-server");

    clientDc.onopen = () => this.registerPeer(new Peer(remoteFingerprint, services, clientDc));
    serverDc.onopen = () => this.attachServerChannel(serverDc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.sendLobby({
      action: "rtc_offer",
      payload: {
        from: this.myFingerprint,
        to: remoteFingerprint,
        sdp: offer.sdp!,
        services: this.myServices,
      },
    });
  }

  private async handleOffer(remoteFingerprint: string, sdp: string, services: Services) {
    const pc = this.createPC(remoteFingerprint);

    pc.ondatachannel = ({ channel }) => {
      if (channel.label === "rpc-server") {
        // caller's server channel → we are the client on it
        channel.onopen = () => this.registerPeer(new Peer(remoteFingerprint, services, channel));
      } else if (channel.label === "rpc-client") {
        // caller's client channel → we are the server on it
        channel.onopen = () => this.attachServerChannel(channel);
      }
    };

    await pc.setRemoteDescription({ type: "offer", sdp });
    await this.drainPendingIce(remoteFingerprint, pc);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.sendLobby({
      action: "rtc_answer",
      payload: { from: this.myFingerprint, to: remoteFingerprint, sdp: answer.sdp! },
    });
  }

  private async handleAnswer(remoteFingerprint: string, sdp: string) {
    const pc = this.pcs.get(remoteFingerprint);
    if (!pc) return;
    await pc.setRemoteDescription({ type: "answer", sdp });
    await this.drainPendingIce(remoteFingerprint, pc);
  }

  private async handleIce(remoteFingerprint: string, candidate: RTCIceCandidateInit) {
    const pc = this.pcs.get(remoteFingerprint);
    if (!pc) return;

    if (!pc.remoteDescription) {
      const queue = this.pendingIce.get(remoteFingerprint) ?? [];
      queue.push(candidate);
      this.pendingIce.set(remoteFingerprint, queue);
      return;
    }

    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  private async drainPendingIce(remoteFingerprint: string, pc: RTCPeerConnection) {
    const queued = this.pendingIce.get(remoteFingerprint);
    if (!queued) return;
    this.pendingIce.delete(remoteFingerprint);
    for (const candidate of queued) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  private buildRpcServer(methods: Partial<Methods>): TypedJSONRPCServer<Methods> {
    const server: TypedJSONRPCServer<Methods> = new JSONRPCServer();
    for (const [name, fn] of Object.entries(methods)) {
      server.addMethod(name, fn as any);
    }
    return server;
  }
}

