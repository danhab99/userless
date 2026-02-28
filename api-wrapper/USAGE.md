# Userless API Wrapper — Usage Guide ✅

This project exposes a structured, type-safe API for interacting with a Userless server. It follows Next.js best practices for API clients: centralized fetching, grouped service methods, and full TypeScript support.

---

## 🚀 1. Setup: Centralize your Client

Create a single instance of the Userless client in your app (e.g., in `lib/userless.ts`) to reuse the base URL and configuration.

```ts
import { createClient } from 'api-wrapper';

// Central client for your backend
export const userless = createClient(process.env.NEXT_PUBLIC_USERLESS_URL || 'http://localhost:4444');
```

---

## 🔧 2. Common Operations

### Get server banner
```ts
const banner = await userless.getBanner();
console.log(banner.body, banner.info);
```

### Working with Threads
You can either use the `thread()` helper for chaining or the standalone service functions.

```ts
// Using the client helper (Recommended)
const myThread = userless.thread('my-thread-ref-or-hash');
const content = await myThread.getContent();
const replies = await myThread.getReplies(0, 20);

// Using standalone services (Good for passing Thread objects around)
import { getThreadContent } from 'api-wrapper';
const threadObj = userless.getThread('hash');
const content2 = await getThreadContent(threadObj); // URL is reused from threadObj
```

### Working with Keys
```ts
const myKey = userless.getKey('0xABCDEF...');
const armored = await myKey.getArmored();
const threads = await myKey.getThreads();
```

---

## ✨ 3. Key Types & Models

- `Thread` — discriminated union referencing a thread by **hash** or **ref**.
- `Content` — parsed PGP cleartext content.
- `Policy` — parsed TOML policy configuration.

---

## 🛠 4. Best Practices Followed

1. **Centralized Fetching**: All calls go through a consistent fetch wrapper with proper error handling and debug logging.
2. **Layered Architecture**: Separation between raw fetch logic ([fetch.ts](fetch.ts)), service modules ([thread.ts](thread.ts), [key.ts](key.ts)), and the client consumer ([userless.ts](userless.ts)).
3. **Type Safety**: Everything is fully typed with TypeScript to catch errors at compile time.
4. **URL Reuse**: The `createClient` factory and the `Thread` object pattern ensure you never have to manually pass the backend URL once the initial connection is established.
