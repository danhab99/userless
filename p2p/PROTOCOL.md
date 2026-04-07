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
  "action": "getAllThreads",
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
