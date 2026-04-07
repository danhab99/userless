# Userless P2P

Standard userless packet

```jsonc
{
  "action": "",
  "payload": {},
}
```


## Websockets

### Receiving/Sending Announcements

The announcement packet informs the listener that a new peer is available

```jsonc
{
  "action": "new_peer",
  "payload": {
    "sessionId": "<random UUID, ephemeral — used only for WebRTC signaling routing>",
    "services": [ "threads", "files", "pks" ],
  },
}
```

### Emergency

Since p2p is not moderatable, in the event an individual discovers some illicit content they are required to announce an emergency to everyone

```jsonc
{
  "action": "emergency",
  "payload": {
    "thread_hash": "",
    "file_hash": "",
    "pk_fingerprint": "",
    "reason": "", // user generated reason
    "suggested_action": "remove" | "hide",
  },
}
```

### WebRTC Signaling

These three packets are used to bootstrap a WebRTC peer connection. They are point-to-point: the lobby server routes each packet only to the peer identified by `to`, not broadcast. The `from` field lets the recipient know who to reply to.

**Offer** — sent by the peer who initiates the connection after receiving a `new_peer` announcement. Includes `services` so the callee knows what the caller can provide.

```jsonc
{
  "action": "rtc_offer",
  "payload": {
    "from": "<caller's sessionId>",
    "to": "<recipient's sessionId>",
    "sdp": "<SDP offer string>",
    "services": [ "threads", "files", "pks" ],
  },
}
```

**Answer** — sent by the callee in response to an offer.

```jsonc
{
  "action": "rtc_answer",
  "payload": {
    "from": "<callee's sessionId>",
    "to": "<caller's sessionId>",
    "sdp": "<SDP answer string>",
  },
}
```

**ICE candidate** — sent by either side as network candidates are discovered. Multiple may be sent.

```jsonc
{
  "action": "rtc_ice",
  "payload": {
    "from": "<sender's sessionId>",
    "to": "<recipient's sessionId>",
    "candidate": { /* RTCIceCandidateInit */ },
  },
}
```

## WebRTC P2P

All calls once a DataChannel is open use [JSON-RPC 2.0](https://www.jsonrpc.org/specification) over text messages.

Each peer connection opens two named DataChannels so both sides can simultaneously act as client and server:
- `rpc-client` — the caller's outgoing requests; the callee acts as server on this channel
- `rpc-server` — the caller's incoming requests; the callee acts as client on this channel

---

### Paging

Methods that return lists are alphabetically sorted and use skip/take. The caller increments `skip` by `take` until the returned array is shorter than `take`, which signals the end of the list.

```jsonc
// Request params
{ "skip": 0, "take": 100 }

// Response — just an array, no wrapper
[ "item1", "item2", "..." ]
```

The default and recommended `take` is `100`.

---

### getAllThreads

```jsonc
// Request params
{ "skip": 0, "take": 100 }

// Response
[ "<hash>", "..." ]  // alphabetically sorted; shorter than `take` means end of list
```

### getThread

```jsonc
// Request params
{ "hash": "<sha256 hex>" }

// Response
{ "content": "<markdown string>" }
```

### getFile

Files are transferred in chunks to stay within the DataChannel 256 KB message limit. Callers loop with increasing `offset` values until `offset >= total`.

`data` is **base64-encoded** raw bytes.

```jsonc
// Request params
{ "hash": "<sha256 hex>", "offset": 0, "length": 196608 }

// Response
{ "data": "<base64 string>", "total": 1048576 }
```

Recommended `length` per request: `196608` (192 KB).

### getAllPublicKeys

```jsonc
// Request params
{ "skip": 0, "take": 100 }

// Response
[ { "fingerprint": "", "armored": "" }, "..." ]  // alphabetically sorted by fingerprint; shorter than `take` means end of list
```

### getPublicKeys

```jsonc
// Request params
{ "fingerprint": "<pgp fingerprint>" }

// Response
{ "fingerprint": "", "armored": "<ascii-armored public key>" }
```

