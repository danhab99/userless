import {
  JSONRPCClient,
  JSONRPCServer,
  type TypedJSONRPCClient,
  type TypedJSONRPCServer,
} from "json-rpc-2.0";

type Hash = string;
type Thread = { content: string };
type PublicKey = { fingerprint: string; armored: string };
type Fingerprint = string;

type Service = "threads" | "files" | "pks";
type Services = Array<Service>;

type Methods = {
  getAllThreads(): Hash[];
  getThread(params: { hash: Hash }): Thread;
  getFile(params: { hash: Hash }): ArrayBuffer;
  getAllPublicKeys(): PublicKey[];
  getPublicKeys(params: { fingerprint: Fingerprint }): PublicKey;
};

type LobbyPacket =
  | {
      action: "new_peer";
      payload: { fingerprint: string; services: Services };
    }
  | {
      action: "emergency";
      payload: {
        thread_hash: string;
        file_hash: string;
        pk_fingerprint: string;
        reason: string;
        suggested_action: "remove" | "hide";
      };
    }
  | { action: "rtc_offer"; payload: { from: string; sdp: string } }
  | { action: "rtc_answer"; payload: { from: string; sdp: string } }
  | {
      action: "rtc_ice";
      payload: { from: string; candidate: RTCIceCandidateInit };
    };

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

export class ConnectedPeer {
  readonly fingerprint: string;
  readonly services: Services;
  readonly rpc: TypedJSONRPCClient<Methods>;

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
}

export class UserlessP2PClient {
  private ws: WebSocket;
  private pcs = new Map<string, RTCPeerConnection>();
  private myFingerprint: string;
  private myServices: Services;

  onPeerConnected: (peer: ConnectedPeer) => void = () => {};
  onEmergency: (
    payload: Extract<LobbyPacket, { action: "emergency" }>["payload"],
  ) => void = () => {};

  constructor(lobbyUrl: string, myFingerprint: string, myServices: Services) {
    this.myFingerprint = myFingerprint;
    this.myServices = myServices;
    this.ws = new WebSocket(lobbyUrl);

    this.ws.onmessage = (ev) => {
      const packet: LobbyPacket = JSON.parse(ev.data);
      this.handleLobbyPacket(packet);
    };
  }

  announceMyself() {
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
        this.handleOffer(packet.payload.from, packet.payload.sdp);
        break;

      case "rtc_answer":
        this.handleAnswer(packet.payload.from, packet.payload.sdp);
        break;

      case "rtc_ice":
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
            candidate: candidate.toJSON(),
          },
        });
      }
    };

    return pc;
  }

  private async initiateOffer(remoteFingerprint: string, services: Services) {
    const pc = this.createPC(remoteFingerprint);

    const dc = pc.createDataChannel("userless");
    dc.onopen = () => {
      this.onPeerConnected(new ConnectedPeer(remoteFingerprint, services, dc));
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.sendLobby({
      action: "rtc_offer",
      payload: { from: this.myFingerprint, sdp: offer.sdp! },
    });
  }

  private async handleOffer(remoteFingerprint: string, sdp: string) {
    const pc = this.createPC(remoteFingerprint);

    pc.ondatachannel = ({ channel }) => {
      channel.onopen = () => {
        this.onPeerConnected(
          new ConnectedPeer(remoteFingerprint, [], channel),
        );
      };
    };

    await pc.setRemoteDescription({ type: "offer", sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.sendLobby({
      action: "rtc_answer",
      payload: { from: this.myFingerprint, sdp: answer.sdp! },
    });
  }

  private async handleAnswer(remoteFingerprint: string, sdp: string) {
    const pc = this.pcs.get(remoteFingerprint);
    if (!pc) return;
    await pc.setRemoteDescription({ type: "answer", sdp });
  }

  private async handleIce(
    remoteFingerprint: string,
    candidate: RTCIceCandidateInit,
  ) {
    const pc = this.pcs.get(remoteFingerprint);
    if (!pc) return;
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
}

export function createPeerServer(
  dc: RTCDataChannel,
  methods: Methods,
): TypedJSONRPCServer<Methods> {
  const server: TypedJSONRPCServer<Methods> = new JSONRPCServer();

  (Object.keys(methods) as (keyof Methods)[]).forEach((key) => {
    server.addMethod(key, methods[key] as any);
  });

  dc.onmessage = async (ev) => {
    const response = await server.receive(JSON.parse(ev.data));
    if (response) dc.send(JSON.stringify(response));
  };

  return server;
}
