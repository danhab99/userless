# The Userless Protocol

**Userless** is a decentralized social media protocol inspired by 4chan's anonymous, thread-based model. It generalises the concept to be generic enough to represent any kind of social media — forums, imageboards, link aggregators like Reddit, and more — while eliminating the concept of a traditional user account entirely.

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [Identity: Keys Instead of Accounts](#2-identity-keys-instead-of-accounts)
3. [Content Format: Signed Threads](#3-content-format-signed-threads)
4. [The Thread Hash](#4-the-thread-hash)
5. [Replies and Thread Trees](#5-replies-and-thread-trees)
6. [Thread Refs](#6-thread-refs)
7. [Decentralisation Model](#7-decentralisation-model)
8. [Policy System](#8-policy-system)
9. [File Uploads](#9-file-uploads)
10. [Sponsored Keys *(planned)*](#10-anonymous-linked-keys-planned)
11. [Server Discovery (Banner)](#11-server-discovery-banner)
12. [Server Configuration](#12-server-configuration)
13. [HTTP API Reference](#13-http-api-reference)

---

## 1. Philosophy

Traditional social media requires a database of usernames and passwords — credentials that are inherently centralized, leakable, and censorable. Userless eliminates this entirely.

The core insight is that **cryptographic identity is sufficient for social media**. Every meaningful operation in social media is ultimately one of these:

- **Creating content** — which just requires proving authorship
- **Replying to content** — which requires the same, plus referencing a parent
- **Moderating content** — which requires having the right to do so

All three of these can be accomplished with asymmetric cryptography. There is no need for a password database. Your GPG key pair *is* your account.

The protocol is also designed to be **generic**. The same wire format can represent:

| Social Platform | Userless Equivalent |
|---|---|
| 4chan thread | A root thread |
| 4chan reply | A thread with `replyTo` set |
| Reddit post | A root thread |
| Reddit comment | A thread with `replyTo` set |
| Reddit community | A thread ref pointing to the community's root thread |
| Blog post | A root thread with rich Markdown body |

### Write vs. Read

The Userless protocol has two distinct halves:

- **The read side is fixed and non-negotiable.** The wire format for threads (cleartext-signed OpenPGP messages), the hash derivation algorithm (SHA256 of the full cleartext-signed message), the TOML/Markdown structure, the banner format and parsing algorithm, and the HTTP API shapes described in this document are hard requirements. Any conforming Userless client or server must implement these exactly.

- **The write side is intentionally loosely defined.** Rules around registration, posting, and policy management are **entirely freeform**. This reference implementation reflects one set of opinions — requiring a master key to edit key policies, requiring the original signing key to edit a thread's policy, etc. — but these are *this implementation's* choices, not protocol mandates. Server operators are free to define their own acceptance rules, policy structures, and moderation logic.

Userless is designed to be **minimal and easy to implement**. This codebase is a reference example. Other developers are actively encouraged to build their own servers, clients, and tooling with different rules and workflows. The only invariants that matter across implementations are the read-side wire formats and hash computations listed in this document.

---

## 2. Identity: Keys Instead of Accounts

A Userless identity is an **OpenPGP (GPG) key pair**. There is no username or password stored anywhere on any server.

### Generating a key

```bash
gpg --batch --generate-key <<EOF
Key-Type: eddsa
Key-Curve: Ed25519
Name-Real: Alice
Name-Email: alice@example.com
Expire-Date: 0
%no-protection
%commit
EOF
```

### Registering with a server

To participate on a server, send your **armored public key** as the raw request body to `POST /register`:

```bash
gpg --armor --export alice@example.com \
  | curl -X POST http://localhost:4444/register -d @-
# → 201 Created
```

The server stores the armored key text along with the name, email, comment, **fingerprint** (lowercase hex), and short **key ID** extracted from the key. The fingerprint becomes the canonical identity handle for that key everywhere in the protocol.

Registering the same key a second time returns `409 Conflict`.

### Looking up a key

Keys are addressed by either their full fingerprint or their short key ID. Both resolve the same way:

```bash
# By full fingerprint
curl http://localhost:4444/key/3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b

# By short key ID
curl http://localhost:4444/key/5a6b7c8d

# → returns the raw armored public key text
```

Listing all discoverable keys on the server (returns a newline-separated list of fingerprints):

```bash
curl http://localhost:4444/keys
```

Listing threads posted by a key:

```bash
curl http://localhost:4444/key/5a6b7c8d/threads
# → newline-separated thread hashes
```

---

## 3. Content Format: Signed Threads

Every piece of content in Userless is an **OpenPGP cleartext-signed message** (`gpg --clear-sign`). The signed body uses a two-part structure: an optional **TOML metadata header** and a **Markdown body**, separated by the delimiter `==========`.

### Full Wire Format

A post with both a TOML header and a Markdown body:

```
-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA512

replyTo = "a3f9c2..."
==========
# Hello World

This is the content of my post, written in **Markdown**.
-----BEGIN PGP SIGNATURE-----

iHUEARYKAB0WIQTw...
-----END PGP SIGNATURE-----
```

### The Delimiter

The delimiter is exactly **10 equals signs** on a line by itself:

```
==========
```

It splits the plaintext into a TOML header and a Markdown body. There are three cases:

**1. No delimiter — pure Markdown body**

If `==========` is absent, the entire plaintext is treated as Markdown. There is no metadata.

```
-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA512

# Hello World

This is just a markdown post.
-----BEGIN PGP SIGNATURE-----
...
-----END PGP SIGNATURE-----
```

**2. Delimiter at the end — TOML only, no body**

If `==========` appears at the very end of the plaintext (nothing after it), the content is pure TOML metadata with no Markdown body.

```
-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA512

replyTo = "a3f9c2..."
custom = "metadata only post"
==========
-----BEGIN PGP SIGNATURE-----
...
-----END PGP SIGNATURE-----
```

**3. Delimiter in the middle — TOML header + Markdown body**

Everything above the delimiter is parsed as TOML; everything below is the Markdown body.

```
-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA512

replyTo = "a3f9c2..."
==========
# Hello World

This is the markdown body of the post.
-----BEGIN PGP SIGNATURE-----
...
-----END PGP SIGNATURE-----
```

### Parsing

1. Everything between the PGP header line and `-----BEGIN PGP SIGNATURE-----` is the **plaintext** — exactly what GPG signed and what gets hashed.
2. Search the plaintext for the first line that is exactly `==========`.
3. Apply the matching case above.

### TOML Fields

The TOML header is freeform. Only one field has protocol-level meaning:

| Field | Type | Description |
|---|---|---|
| `replyTo` | `string` | SHA256 hash of the parent thread this post replies to |

All other fields are stored verbatim in the database's `info` JSON column and returned as-is to clients. There is no built-in `title` field — a post is just a body by default.

### Signing

```bash
# A plain markdown post (no delimiter needed)
cat > thread.txt <<'EOF'
# My First Post

This is my first post.
EOF

# A post with TOML metadata
cat > reply.txt <<'EOF'
replyTo = "a3f9c2d4e5b6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2"
==========
This is a reply.
EOF

# Pipe the signed output directly into curl to post
gpg --clear-sign --local-user alice@example.com thread.txt \
  | curl -X POST http://localhost:4444/post -d @-
```

The server reads the **signer fingerprint directly from the signature packet** — the author does not declare their identity anywhere in the plaintext content.

---

## 4. The Thread Hash

Every thread is identified by its **hash**: the lowercase hex-encoded SHA256 digest of the **full cleartext-signed message** (i.e. the entire armored PGP cleartext message as posted, including the PGP header line, hash armor header, plaintext body, and signature block).

```
hash = hex(SHA256(clearsign_message))
```

Key properties:

- **Content-addressed**: the same signed message always produces the same hash.
- **Immutable**: editing content (or re-signing it) produces a completely different hash — it becomes a different thread entirely.
- **Deduplicated**: posting identical content twice returns `409 Conflict` with the existing hash.
- **Portable**: a thread from server A carries the same hash on server B, because the hash is derived from the complete signed message.

### Posting a thread

```bash
gpg --clear-sign --local-user alice@example.com thread.txt \
  | curl -X POST http://localhost:4444/post -d @-
# → 201 Created
# a3f9c2d4e5b6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2
```

The response body is the thread hash. Save it — it is the permanent address of your thread.

### Fetching a thread

```bash
curl http://localhost:4444/thread/a3f9c2d4e5b6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2
# → returns the full original cleartext-signed message
```

The response is exactly the same bytes that were posted — the complete armored PGP cleartext message. Anyone can independently verify the signature using only the public key.

---

## 5. Replies and Thread Trees

Threads form a tree via the `replyTo` TOML field. Set it to the hash of the thread you are replying to:

```bash
cat > reply.txt <<EOF
replyTo = "a3f9c2d4e5b6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2"
==========
Great post! Here is my reply.
EOF

gpg --clear-sign --local-user alice@example.com reply.txt \
  | curl -X POST http://localhost:4444/post -d @-
# → 201 Created
# b7e3d1f2a4c5e6b7...
```

When the server receives a thread with `replyTo`, it **verifies the parent hash exists in its own database** before accepting the post. You cannot reply to a thread the server has never seen.

### Walking the tree

```bash
# Get direct replies to a thread (newline-separated hashes, newest first)
curl http://localhost:4444/thread/a3f9c2.../replies

# Paginate
curl "http://localhost:4444/thread/a3f9c2.../replies?skip=0&take=20"

# Walk up the reply chain from a thread to its ancestors
curl http://localhost:4444/thread/b7e3d1.../parents

# Limit how far up to walk (default is 10)
curl "http://localhost:4444/thread/b7e3d1.../parents?count=5"
```

Both endpoints return a newline-separated list of thread hashes.

---

## 6. Thread Refs

A **thread ref** is a named, mutable pointer to a thread hash — analogous to a Git branch or tag. Refs are stored server-side and let a stable human-readable name resolve to a (potentially changing) hash over time.

### Resolving a ref

When you request a thread using a ref name instead of a 64-character hash, the server issues a **307 Temporary Redirect** to the canonical hash URL:

```bash
# Request by ref name
curl -v http://localhost:4444/thread/r/programming
# → HTTP/1.1 307 Temporary Redirect
# → Location: /thread/a3f9c2d4e5b6f7a8...

# Follow the redirect automatically
curl -L http://localhost:4444/thread/r/programming
# → the thread content at the resolved hash
```

The server distinguishes a ref from a hash by checking whether the path segment is exactly 64 hex characters. Anything else is treated as a ref name.

### Movable Communities

The primary motivation for refs is **movable communities** — the Userless equivalent of a subreddit.

A community is just a ref name (e.g. `r/programming`) pointing to a root thread. All replies to that root thread form the community's discussion. Because the ref is mutable, the admin can periodically create a new root thread (e.g. monthly) and update the ref to point at it, effectively archiving the old content and starting fresh — while the public URL `server/thread/r/programming` stays the same.

The same ref name on two different servers points to two completely different threads, and both are equally valid. There is no global community namespace.

### Ref Advertisement

Refs (and individual threads) can be flagged as advertised, which causes them to appear in the [server banner](#11-server-discovery-banner) `frontpage` list. This is the primary discovery mechanism for communities on a server.

---

## 7. Decentralisation Model

Any thread can exist on any server. Because threads are content-addressed by hash, a thread posted to server A can be re-posted to server B and will carry the same hash on both, as long as the signing key is registered on server B.

```bash
# Fetch the raw signed thread from server A
curl http://server-a.example.com/thread/a3f9c2... > thread.asc

# Re-register the author's key on server B if needed
curl http://server-a.example.com/key/5a6b7c8d | \
  curl -X POST http://server-b.example.com/register -d @-

# Re-post to server B — same hash, independently verified
curl -X POST http://server-b.example.com/post -d @thread.asc
```

Neither server needs to trust the other — signature verification is entirely self-contained using the public key. There is no central index, no canonical server list, and no protocol-level federation mechanism. Cross-server replication is a voluntary, application-layer decision.

---

## 8. Policy System

Servers control access through a two-level policy system: **key policies** and **thread policies**. Both are exposed and updated as TOML.

### Key Policy

Every registered key has an associated policy. Fetch it with:

```bash
curl http://localhost:4444/key/5a6b7c8d/policy
```

```toml
revoked = false
allowedToPost = true
canStartThreads = true
allowedToUploadFiles = true
maxFileSize = 1000000
isMaster = false
```

| Field | Default | Description |
|---|---|---|
| `revoked` | `false` | If `true`, all operations from this key are rejected |
| `allowedToPost` | `true` | Whether this key can post threads |
| `canStartThreads` | `true` | Whether this key can start root threads (replies-only if `false`) |
| `allowedToUploadFiles` | `true` | Whether this key can upload files |
| `maxFileSize` | `1000000` | Maximum upload size in bytes |
| `isMaster` | `false` | Marks an administrative key |

Updating a key policy requires a **cleartext-signed TOML body** sent as a `PATCH` request. The signing key must be a **master key** (i.e. `isMaster = true` in the database). Regular keys cannot edit their own or others' key policies:

```bash
cat > policy_update.txt <<EOF
revoked = true
EOF

gpg --clear-sign --local-user alice@example.com --output policy_update.asc policy_update.txt

curl -X PATCH http://localhost:4444/key/5a6b7c8d/policy \
  -d @policy_update.asc
```

### Thread Policy

Every thread has an associated policy. Fetch it with:

```bash
curl http://localhost:4444/thread/a3f9c2.../policy
```

```toml
visible = true
acceptsReplies = true
encryptFor = []
policyEditors = []
advertise = false
```

| Field | Default | Description |
|---|---|---|
| `visible` | `true` | Whether the thread appears in discovery and search |
| `acceptsReplies` | `true` | Whether new replies to this thread are accepted |
| `encryptFor` | `[]` | Fingerprints that replies must be encrypted to |
| `policyEditors` | `[]` | Fingerprints of keys allowed to modify this policy |
| `advertise` | `false` | Whether this thread appears on the server banner frontpage |

Updating a thread policy works the same way — sign a TOML body and `PATCH` it. The signing key must be the **same key that originally signed the thread**:

```bash
cat > thread_policy.txt <<EOF
advertise = true
acceptsReplies = false
EOF

gpg --clear-sign --local-user alice@example.com --output thread_policy.asc thread_policy.txt

curl -X PATCH http://localhost:4444/thread/a3f9c2.../policy \
  -d @thread_policy.asc
```

### Inspection Modes

Servers validate incoming posts and registrations in one of three modes, configured independently for keys, threads, and files:

| Mode | Description |
|---|---|
| `basic` | Permissions are set by static flags in the server config file |
| `shell` | The raw signed bytes are piped to an external script on stdin; exit code `0` accepts, anything else rejects |
| `webhook` | The raw signed bytes are POSTed to an HTTP endpoint; `200` accepts, anything else rejects |

In `shell` and `webhook` modes the script/endpoint can return a JSON policy object in its response body to override the defaults for that specific key or thread.

### Searching

```bash
# Full-text search through thread bodies
curl "http://localhost:4444/search/threads?body=hello+world"

# Find threads by the author's email
curl "http://localhost:4444/search/threads?email=alice@example.com"

# Find threads by key ID
curl "http://localhost:4444/search/threads?keyId=5a6b7c8d"

# Search registered keys
curl "http://localhost:4444/search/keys?email=alice@example.com"
```

All search results are returned as newline-separated hashes or fingerprints.

---

## 9. File Uploads

Binary files cannot be cleartext-signed, so uploads use a **detached OpenPGP signature** instead. The file and its signature are submitted as a multipart form to `POST /upload`.

### Signing a file

Create a detached, armored signature of the file using your private key:

```bash
gpg --detach-sign --armor --local-user alice@example.com image.png
# produces image.png.asc alongside the original file
```

### Uploading

Submit both as a multipart form. The `document` field is the file; the `signature` field is the armored signature text:

```bash
curl -X POST http://localhost:4444/upload \
  -F "document=@image.png" \
  -F "signature=$(cat image.png.asc)"
# → 201 Created
# c7a3b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

The server verifies the detached signature against the file bytes, then stores the file in S3-compatible object storage under its hash. The response body is the **SHA256 hash of the file bytes** — save this, it is the file's permanent address.

### Downloading a file

```bash
# Download the file by hash
curl http://localhost:4444/file/c7a3b1d4e5f6a7b8... --output image.png

# Download the stored detached signature
curl http://localhost:4444/file/c7a3b1d4e5f6a7b8.../sig --output image.png.asc

# Independently verify
gpg --verify image.png.asc image.png
```

### Linking a file in a thread

Once uploaded, reference the file hash in a thread body. Since the file is served directly from S3 at the URL advertised in the server banner (`files.bucket`), you can embed it as a standard Markdown link or image:

```bash
# Check the bucket URL from the banner
curl -s http://localhost:4444/ | grep bucket
# bucket = "http://localhost:9000/userless"
```

```bash
cat > post.txt <<'EOF'
==========
Here is the image I uploaded:

![my image](http://localhost:9000/userless/c7a3b1d4e5f6a7b8...)

Or as a download link:

[download file](http://localhost:9000/userless/c7a3b1d4e5f6a7b8...)
EOF

gpg --clear-sign --local-user alice@example.com post.txt \
  | curl -X POST http://localhost:4444/post -d @-
```

The file URL is just `{bucket}/{hash}`. The signature is always available at `{bucket}/{hash}_sig` in S3, or via the server's `/file/{hash}/sig` endpoint.

### Listing files

```bash
# List files uploaded by a key (newline-separated hashes)
curl http://localhost:4444/key/5a6b7c8d/files

# List all discoverable files on the server
curl http://localhost:4444/files
```

---

## 10. Sponsored Keys *(planned)*

> **This feature is not yet implemented.** It is documented here as a protocol design.

A user may wish to post anonymously — indistinguishable from any stranger to the rest of the user base — while still being accountable to the server's administrators (e.g. to allow ban evasion detection or emergency deanonymization).

The mechanism is a **linked anonymous key**: a second GPG key pair generated solely for anonymous use, registered alongside a cryptographic claim that it is controlled by the same person as an existing ("parent") key. The link is stored server-side but never exposed through any public API.

### Registration

Instead of a plain `POST /register` with just a public key, the user submits a cleartext-signed registration claim:

1. Generate a fresh anonymous key pair (e.g. with a throwaway name/email).
2. Write a registration claim body containing the anonymous public key block, signed by the **parent key**.

```
-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA512

-----BEGIN PGP PUBLIC KEY BLOCK-----
<armored anonymous public key>
-----END PGP PUBLIC KEY BLOCK-----
-----BEGIN PGP SIGNATURE-----
<signature by parent key>
-----END PGP SIGNATURE-----
```

The server:
1. Verifies the outer cleartext signature using the parent key (which must already be registered).
2. Extracts and registers the inner anonymous public key as a normal key.
3. Stores the `parentKeyId → anonymousKeyId` link in a **server-only table** never queried by public endpoints.

### Privacy Guarantees

- The public API — `/keys`, `/key/:id`, `/key/:id/threads` — reveals nothing about the link.
- The anonymous key looks like any other registered key to all other users.
- Only the server (via direct database access or a privileged admin endpoint) can resolve the link.

### Accountability

- The server admin can always determine which parent key spawned a given anonymous key.
- Revoking the parent key policy (`revoked = true`) can optionally cascade to all of its linked anonymous keys.
- The link provides a hard audit trail without exposing it socially.

---

## 11. Server Discovery (Banner)

The **banner** is the mandatory entry point to any Userless server. **Every conforming client MUST fetch the banner as its first request** before using any other endpoint. The banner tells the client exactly what capabilities the server exposes, which endpoints are active, and where to find content.

```bash
curl http://localhost:4444/
```

### Format

The banner response body uses the same delimiter-split format as a thread body — TOML metadata, then `==========` on its own line, then a human-readable Markdown description of the server. Unlike thread content, the banner is **not PGP-signed** — it is a plain-text document generated dynamically by the server at startup.

The exact byte layout is:

```
{TOML block}

==========  ← exactly ten equals signs, no other characters on this line

{Markdown block}
```

A complete example:

```
[keys]
enabled = true
discovery = true

[threads]
enabled = true
discovery = true
frontpage = [
	"a3f9c2d4e5b6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
	"r/programming",
	"r/news",
]

[files]
enabled = true
discovery = true
bucket = "http://localhost:9000/userless"

[search]
threads = true
keys = true
args = [
	"body",
	"email",
	"keyId",
]

==========
# Welcome to Example Server

A Userless instance for discussing things.
```

### Parsing (required)

A conforming client MUST parse the banner response as follows:

1. Receive the full response body as a UTF-8 string.
2. Split on the first occurrence of a line that contains **exactly** `==========` (ten equals signs, no other characters, no leading or trailing whitespace).
3. Everything **before** the delimiter is the **TOML block** — parse it as TOML to obtain the server capability map.
4. Everything **after** the delimiter is the **Markdown block** — a human-readable server description intended for display.
5. The client MUST consult the capability map before calling any other endpoint. Do not assume an endpoint exists; check the corresponding flag first (e.g. `keys.enabled`, `threads.enabled`, `files.enabled`).

### TOML Fields

| Field | Description |
|---|---|
| `keys.enabled` | Whether `/key/*` endpoints exist |
| `keys.discovery` | Whether `GET /keys` lists registered keys |
| `threads.enabled` | Whether `/thread/*` endpoints exist |
| `threads.discovery` | Whether threads appear in search results |
| `threads.frontpage` | Advertised thread hashes and ref names — the server's "front page" |
| `files.enabled` | Whether `/file/*` endpoints exist |
| `files.discovery` | Whether `GET /files` lists uploaded files |
| `files.bucket` | Base URL of the S3 bucket where raw files are stored |
| `search.threads` | Whether `GET /search/threads` is available |
| `search.keys` | Whether `GET /search/keys` is available |
| `search.args` | Which query parameters the search endpoint accepts (`body`, `email`, `keyId`, `regex`) |

### The Frontpage

`threads.frontpage` is the primary discovery mechanism for communities and pinned content. It is a mixed array of:

- **Bare thread hashes** — direct links to specific threads (e.g. a pinned announcement)
- **Ref names** — stable community names that the server admin has chosen to advertise (e.g. `r/programming`)

A client rendering a server's home page should iterate this list, resolve any refs (following the 307 redirect), and display the resulting threads.

```bash
# Read the frontpage list from the banner
FRONTPAGE=$(curl -s http://localhost:4444/ | head -n -1 | grep -A100 'frontpage')

# Resolve a ref from the frontpage
curl -v http://localhost:4444/thread/r/programming
# → 307 Temporary Redirect → /thread/a3f9c2...

curl -L http://localhost:4444/thread/r/programming
# → full thread content
```

### Client Flow

The correct startup sequence for any Userless client is:

```
1. GET /                         → parse banner TOML
2. if threads.enabled:
     use /thread/* endpoints
3. if keys.enabled:
     use /key/* endpoints
4. if files.enabled:
     use /file/* endpoints, use files.bucket for direct S3 URLs
5. if search.threads or search.keys:
     use /search/* endpoints (check search.args for which parameters are accepted)
6. Render threads.frontpage as the home page
```

Any client that skips the banner fetch and hard-codes assumptions about endpoint availability is non-conforming.

---

## 12. Server Configuration

The reference server is configured via a TOML file (default `/etc/userless.toml`, overridden with `--config-path`).

```toml
banner = "/etc/userless-banner.md"
port   = 4444
host   = "0.0.0.0"

[public_keys]
enable            = true    # Enable /key/* endpoints
mode              = "basic" # "basic" | "shell" | "webhook"
enable_discovery  = true    # Expose GET /keys
enable_register   = true    # Accept POST /register

# Permissions granted to every newly registered key (basic mode only)
allowed_to_post        = true
can_start_threads      = true
allowed_to_upload_files = true

# shell mode: pipe raw bytes to this script on stdin
on_new_key = "/etc/userless/check_key.sh"

# webhook mode: POST raw bytes to this URL
webhook_url = "https://example.com/hooks/keys"

[threads]
enable           = true
mode             = "basic"
enable_discovery = true     # Threads appear in search results
enable_post      = true     # Accept POST /post

visible_by_default  = true
allow_replies       = true
can_edit_own_policy = true

on_new_thread = "/etc/userless/check_thread.sh"
webhook_url   = "https://example.com/hooks/threads"

[files]
enable           = true
mode             = "basic"
enable_discovery = true
enable_upload    = true

on_new_thread = "/etc/userless/check_file.sh"
webhook_url   = "https://example.com/hooks/files"

[files.s3]
host   = "localhost"
port   = 9000
ssl    = false
bucket = "userless"

[search]
full_text_search = true   # Enable ?body= search
email            = true   # Enable ?email= search
key_id           = true   # Enable ?keyId= search
search_threads   = true   # Expose GET /search/threads
search_keys      = true   # Expose GET /search/keys
regex            = true   # Allow regex patterns
```

### Inspection Modes

**`basic`** — All access control comes from the static flags in `[public_keys]` and `[threads]` above. Simple and suitable for open or fully-trusted servers.

**`shell`** — When a new thread or key arrives, the raw signed bytes are written to the script's stdin. Exit code `0` accepts it; anything else rejects it. Optionally, the script may write a JSON policy object to stdout to set per-resource permissions.

```bash
#!/bin/sh
# Example: reject posts containing a banned phrase
if grep -qi "spam phrase" ; then
  exit 1
fi
exit 0
```

**`webhook`** — Same semantics as `shell`, but the bytes are POSTed to an HTTP endpoint. HTTP `200` accepts (with optional JSON policy body); any other status code rejects.

---

## 13. HTTP API Reference

Complete reference for every endpoint. All request and response bodies are plain text unless noted. Lists are always newline-separated strings with a trailing newline.

---

### `GET /`

Returns the server banner. This is the **required first call** for any conforming Userless client. The response body is a plain-text (unsigned) document in the same TOML-delimiter-Markdown format as thread content.

| | |
|---|---|
| **Request body** | none |
| **Response** | TOML capability map + `==========` + Markdown description |
| **Status** | `200` |

The TOML block describes which endpoints and features are active on this server. Clients MUST parse it and check the relevant flags before making any other request. See [§11 Server Discovery (Banner)](#11-server-discovery-banner) for the full parsing algorithm and field reference.

---

### `POST /register`

Register a new OpenPGP public key.

| | |
|---|---|
| **Request body** | Raw armored public key (`-----BEGIN PGP PUBLIC KEY BLOCK-----` … `-----END PGP PUBLIC KEY BLOCK-----`) |
| **Response body** | empty |
| **Status 201** | Key registered |
| **Status 400** | Body is not a valid armored key, or contains more than one key |
| **Status 409** | A key with this fingerprint is already registered |

---

### `GET /keys`

List all discoverable registered keys.

| | |
|---|---|
| **Request body** | none |
| **Response** | Newline-separated list of lowercase hex fingerprints |
| **Status** | `200` |

Requires `public_keys.enable_discovery = true` in config.

---

### `GET /key/:id`

Fetch a registered public key. `:id` may be the full lowercase hex fingerprint or the short key ID.

| | |
|---|---|
| **Request body** | none |
| **Response** | Raw armored public key text |
| **Status 200** | Key found |
| **Status 404** | Key not found |

---

### `GET /key/:id/threads`

List thread hashes posted by a key.

| | |
|---|---|
| **Request body** | none |
| **Response** | Newline-separated thread hashes, newest first |
| **Status 200** | OK (empty body if key has no threads) |
| **Status 404** | Key not found |
| **Query params** | `skip` (default 0), `take` (default 100) |

---

### `GET /key/:id/files`

List file hashes uploaded by a key.

| | |
|---|---|
| **Request body** | none |
| **Response** | Newline-separated file hashes |
| **Status 200** | OK |
| **Status 404** | Key not found |
| **Query params** | `skip` (default 0), `take` (default 100) |

---

### `GET /key/:id/policy`

Fetch the policy for a key as TOML.

| | |
|---|---|
| **Request body** | none |
| **Response** | TOML-encoded `PublicKeyPolicy` |
| **Status 200** | OK |
| **Status 404** | Key not found or key has no policy |

---

### `PATCH /key/:id/policy`

Update a key's policy.

| | |
|---|---|
| **Request body** | Cleartext-signed TOML containing any subset of `PublicKeyPolicy` fields |
| **Response body** | empty |
| **Status 200** | Policy updated |
| **Status 400** | Invalid signed message or invalid TOML |
| **Status 403** | Signing key is not a master key |
| **Status 404** | Key not found |

Recognised TOML fields: `revoked`, `allowedToPost`, `canStartThreads`, `isMaster`, `allowedToUploadFiles`. Only fields present in the body are updated.

The signing key must have `isMaster = true`. Regular keys, including the key whose policy is being modified, cannot edit key policies.

---

### `POST /post`

Submit a new cleartext-signed thread.

| | |
|---|---|
| **Request body** | Full armored cleartext-signed message |
| **Response body** | Lowercase hex SHA256 hash of the full cleartext-signed message |
| **Status 201** | Thread accepted and stored |
| **Status 400** | Empty body, malformed cleartext message, or policy rejected it |
| **Status 401** | Signing key not registered, revoked, or not permitted to post |
| **Status 404** | `replyTo` hash not found on this server |
| **Status 409** | Thread with identical content already exists (response body is the existing hash) |

---

### `GET /thread/:hash`

Fetch a thread by its hash.

| | |
|---|---|
| **Request body** | none |
| **Response** | Full original armored cleartext-signed message |
| **Status 200** | OK |
| **Status 404** | Thread not found |

---

### `GET /thread/:ref`

Resolve a named thread ref. `:ref` is any path segment that is **not** exactly 64 lowercase hex characters.

| | |
|---|---|
| **Request body** | none |
| **Response** | none |
| **Status 307** | Redirect to `/thread/:hash` |
| **Status 404** | Ref not found |

---

### `GET /thread/:hash/replies`

List direct replies to a thread.

| | |
|---|---|
| **Request body** | none |
| **Response** | Newline-separated thread hashes, newest first |
| **Status 200** | OK (empty body if no replies) |
| **Status 404** | Thread not found |
| **Query params** | `skip` (default 0), `take` (default 100) |

---

### `GET /thread/:hash/parents`

Walk up the `replyTo` chain from a thread.

| | |
|---|---|
| **Request body** | none |
| **Response** | Newline-separated thread hashes, starting from immediate parent upward |
| **Status 200** | OK (empty body if thread has no parent) |
| **Status 404** | Thread not found |
| **Query params** | `count` — max levels to walk (default 10) |

---

### `GET /thread/:hash/policy`

Fetch a thread's policy as TOML.

| | |
|---|---|
| **Request body** | none |
| **Response** | TOML-encoded `ThreadPolicy` |
| **Status 200** | OK |
| **Status 404** | Thread not found or thread has no policy |

---

### `PATCH /thread/:hash/policy`

Update a thread's policy.

| | |
|---|---|
| **Request body** | Cleartext-signed TOML containing any subset of `ThreadPolicy` fields |
| **Response body** | empty |
| **Status 200** | Policy updated |
| **Status 400** | Invalid signed message or invalid TOML |
| **Status 403** | Signing key is not the key that originally signed the thread |
| **Status 404** | Thread not found |

Recognised TOML fields: `visible`, `acceptsReplies`, `encryptFor`, `policyEditors`, `advertise`. Only fields present in the body are updated.

The signing key must be the same key that originally signed the thread.

---

### `POST /upload`

Upload a signed file.

| | |
|---|---|
| **Request body** | `multipart/form-data` with fields `document` (file bytes) and `signature` (armored detached PGP signature of those bytes) |
| **Response body** | Lowercase hex SHA256 hash of the file bytes |
| **Status 201** | File stored |
| **Status 400** | Missing fields, invalid armored signature, or signature has no timestamp |
| **Status 401** | Signing key revoked or not permitted to upload |
| **Status 403** | File exceeds `maxFileSize` for this key |
| **Status 404** | Signing key not registered |

---

### `GET /files`

List all discoverable uploaded files.

| | |
|---|---|
| **Request body** | none |
| **Response** | Newline-separated file hashes |
| **Status** | `200` |

Requires `files.enable_discovery = true` in config.

---

### `GET /file/:hash`

Download a file by its SHA256 hash.

| | |
|---|---|
| **Request body** | none |
| **Response** | Raw file bytes |
| **Status 200** | OK |
| **Status 404** | File not found |

---

### `GET /file/:hash/sig`

Download the stored detached PGP signature for a file.

| | |
|---|---|
| **Request body** | none |
| **Response** | Armored detached PGP signature |
| **Status 200** | OK |
| **Status 404** | File not found |

---

### `GET /search/threads`

Search threads. At least one query parameter must be provided.

| | |
|---|---|
| **Request body** | none |
| **Response** | Newline-separated thread hashes |
| **Status** | `200` |
| **Query params** | `body` (full-text), `email` (author email), `keyId` (author key ID), `skip` (default 0), `take` (default 100) |

Which parameters are accepted depends on the server's `[search]` config (check `search.args` in the banner).

---

### `GET /search/keys`

Search registered keys.

| | |
|---|---|
| **Request body** | none |
| **Response** | Newline-separated fingerprints |
| **Status** | `200` |
| **Query params** | `email`, `keyId`, `skip` (default 0), `take` (default 100) |
