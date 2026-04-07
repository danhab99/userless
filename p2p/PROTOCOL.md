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
    "fingerprint": "",
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

**Offer** — sent by the peer who initiates the connection after receiving a `new_peer` announcement. Includes `services` so the callee knows what the caller can provide without needing a separate announcement.

```jsonc
{
  "action": "rtc_offer",
  "payload": {
    "from": "<pgp fingerprint of sender>",
    "to": "<pgp fingerprint of recipient>",
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
    "from": "<pgp fingerprint of sender>",
    "to": "<pgp fingerprint of recipient>",
    "sdp": "<SDP answer string>",
  },
}
```

**ICE candidate** — sent by either side as network candidates are discovered. Multiple may be sent.

```jsonc
{
  "action": "rtc_ice",
  "payload": {
    "from": "<pgp fingerprint of sender>",
    "to": "<pgp fingerprint of recipient>",
    "candidate": { /* RTCIceCandidateInit */ },
  },
}
```

## WebRTC P2P

```jsonc
{
  "action": "",
  "payload": {
  },
}
```

### getAllThreads() -> [Hash]

```jsonc
{
  "action": "getAllThreads",
  "payload": {
  },
}
```

### getThread(hash) -> Thread

```jsonc
{
  "action": "getThread",
  "payload": {
    "hash": "",
  },
}
```

### getFile(hash) -> File

```jsonc
{
  "action": "getFile",
  "payload": {
    "hash": "",
  },
}
```

### getAllPublicKeys() -> [Key]

```jsonc
{
  "action": "getAllPublicKeys",
  "payload": {
  },
}
```

### getPublicKeys(fingerprint) -> Key

```jsonc
{
  "action": "getPublicKeys",
  "payload": {
    "fingerprint": "",
  },
}
```
