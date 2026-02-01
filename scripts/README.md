# Userless Scripts

Bash scripts for interacting with the userless server.

## Scripts

### generate_and_register_key.sh

Generates a new GPG key pair and automatically registers the public key with a userless server.

**Usage:**
```bash
./generate_and_register_key.sh [NAME] [EMAIL] [OUTPUT_DIR]
```

**Arguments:**
- `NAME` - Name for the key (optional, randomly generated if not provided)
- `EMAIL` - Email for the key (optional, randomly generated if not provided)
- `OUTPUT_DIR` - Directory to save keys (default: `$HOME/.userless/keys`)

**Environment Variables:**
- `USERLESS_SERVER` - Server URL (default: `http://localhost:4444`)

**Examples:**
```bash
# Generate with random name and email
./generate_and_register_key.sh

# Generate with specific name and email
./generate_and_register_key.sh "John Doe" "john@example.com"

# Use a custom server
USERLESS_SERVER=https://api.userless.io ./generate_and_register_key.sh

# Specify custom output directory
./generate_and_register_key.sh "Alice" "alice@example.com" "/tmp/keys"
```

**Output:**
The script creates a timestamped directory containing:
- `public.asc` - Armored public key
- `private.asc` - Armored private key
- `info.txt` - Key metadata (name, email, fingerprint, etc.)
- `registration_status.txt` - Server registration response

### register_existing_key.sh

Registers an existing GPG public key with a userless server.

**Usage:**
```bash
./register_existing_key.sh KEY_FILE|KEY_ID
```

**Arguments:**
- `KEY_FILE` - Path to an armored public key file (.asc or .gpg)
- `KEY_ID` - GPG key ID, email, or fingerprint from your keyring

**Environment Variables:**
- `USERLESS_SERVER` - Server URL (default: `http://localhost:4444`)

**Examples:**
```bash
# Register from a file
./register_existing_key.sh public.asc

# Register from GPG keyring by email
./register_existing_key.sh user@example.com

# Register from GPG keyring by key ID
./register_existing_key.sh ABC123DEF456

# Use a custom server
USERLESS_SERVER=https://api.userless.io ./register_existing_key.sh public.asc
```

### post_thread.sh

Create and post a signed thread to a userless server. Opens nvim for composing the thread content.

**Usage:**
```bash
./post_thread.sh KEY_ID [REPLY_TO]
```

**Arguments:**
- `KEY_ID` - GPG key ID, email, or fingerprint to sign the thread with
- `REPLY_TO` - (Optional) Hash of thread to reply to

**Environment Variables:**
- `USERLESS_SERVER` - Server URL (default: `http://localhost:4444`)

**Examples:**
```bash
# Create a new thread
./post_thread.sh user@example.com

# Reply to an existing thread
./post_thread.sh user@example.com abc123def456789

# Use a custom server
USERLESS_SERVER=https://api.userless.io ./post_thread.sh user@example.com
```

**Workflow:**
1. Script opens nvim for you to write your thread
2. Write your content using Markdown
3. Save and quit (`:wq`) to post, or quit without saving (`:q!`) to cancel
4. Script signs the content with your GPG key
5. Confirmation prompt before posting
6. Posts to server and displays the thread hash

**Thread Format:**
- Use Markdown for formatting
- If replying, `replyTo` metadata is automatically added
- Content is clearsigned with your GPG key

## Requirements

- `bash`
- `gpg` (GnuPG)
- `curl`
- `nvim` (Neovim, for post_thread.sh)
- Standard Unix utilities (`awk`, `grep`, `sed`, etc.)

## Notes

- Generated keys use Ed25519 (EdDSA) curve and have no expiration date
- Keys are generated without a passphrase (`%no-protection`)
- The scripts use colored output for better readability
- Both scripts validate the key format before attempting registration
- Successful registration returns HTTP 201 status
