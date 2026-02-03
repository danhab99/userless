# Userless API Wrapper — Usage Guide ✅

This project exposes a small, functional API for interacting with a Userless server. All operations are pure functions that accept primitive values or simple data structs and return Promises.

---

## Key types ✨
- `Thread` — discriminated union referencing a thread by **hash** or **ref**:
  - `{ type: "hash", url, hash }`
  - `{ type: "ref", url, ref }`
- `Content` — parsed PGP cleartext content with `body`, `info?`, and `original` fields
- `Banner` — server banner with `body` and `info`

---

## Common functions 🔧
(Import from the package root: `import * as userless from './userless'` or named imports.)

### Get server banner
```ts
const banner = await getBanner('http://localhost:4444');
console.log(banner.body, banner.info);
```

### Build a thread reference (auto-detect if identifier is a hash)
```ts
const refA = getThread('http://localhost:4444', 'b3ff...64chars'); // treated as hash
const refB = getThread('http://localhost:4444', 'my-awesome-thread'); // treated as ref
```

### Resolve an identifier (hash or ref) to a canonical hash
```ts
// returns [resolvedThread (type: "hash"), resolvedHash]
const [resolvedThread, hash] = await resolveThread('http://localhost:4444', 'my-ref-or-hash');
console.log(resolvedThread, hash);
```

### Fetch thread content / policy / replies / parents / owner
```ts
import { getThreadContent, getThreadPolicy, getThreadReplies, getThreadOwner } from './thread';

const thread = getThread('http://localhost:4444', 'my-ref-or-hash');
const content = await getThreadContent(thread);
const policy = await getThreadPolicy(thread);
const replies = await getThreadReplies(thread, 0, 20); // returns array of Thread (hash-type)
const ownerKeyId = await getThreadOwner(thread); // returns signing key id as hex string
```

### Resolve thread reference first (optional) and then call helpers
```ts
const [resolved, hash] = await resolveThread('http://localhost:4444', 'my-ref');
// resolved is { type: 'hash', url, hash }
const content2 = await getThreadContent(resolved);
```

### Key helpers
```ts
import { getArmoredKey, getThreadsForKey, getFilesForKey, getPolicyForKey } from './key';

const armored = await getArmoredKey('http://localhost:4444', '0xABCDEF...');
const threadList = await getThreadsForKey('http://localhost:4444', '0xABCDEF...', 0, 50);
```

---

## Tips & Notes 💡
- The library is intentionally non-OOP: data structs are plain objects and behavior is exposed via exported async functions.
- `resolveThread` uses the backend redirect when a `ref` is supplied so callers can transparently use either a hash or a human-friendly ref.

If you'd like, I can add example tests or a short example script demonstrating a real-server flow. 🔧
