# Userless

A decentralized social media protocol that eliminates traditional user accounts and passwords by using OpenPGP cryptographic keys for identity and authentication.

## Overview

Userless is a revolutionary approach to social media that prioritizes privacy and decentralization. Instead of storing usernames and passwords in a database, users prove their identity using PGP/OpenPGP keys. This means:

- **No passwords to steal**: Authentication is cryptographic
- **No centralized identity**: Your key is your identity
- **Verifiable content**: All posts are signed by their authors
- **Portable identity**: Take your key to any Userless server

## Architecture

The project consists of three main components:

### 1. Server (`/server`)
A Go-based backend server that:
- Accepts and stores OpenPGP public keys as user registrations
- Manages threads (discussions) and posts
- Handles file uploads to MinIO object storage
- Uses PostgreSQL for metadata storage
- Verifies cryptographic signatures on all content

**Technology**: Go, Gin framework, Prisma ORM, PostgreSQL, MinIO

### 2. API Wrapper (`/api-wrapper`)
A TypeScript/JavaScript library for interacting with Userless servers:
- Provides a clean API for server communication
- Handles key management
- Thread and post operations
- Content fetching and verification

**Technology**: TypeScript, Node.js

### 3. Threads (`/threads`)
A Next.js web application for browsing and interacting with Userless content:
- User interface for viewing threads and posts
- Client-side key management
- Post composition and signing

**Technology**: Next.js, React, TypeScript, Tailwind CSS

### 4. Redditless (`/redditless`)
An alternative Next.js web application with a Reddit-style layout for the same Userless backend:
- Threaded comment view with upvote-style layout
- Designed for community/subreddit-style use cases
- Shares the same API wrapper as `/threads`

**Technology**: Next.js, React, TypeScript, Tailwind CSS

## How It Works

1. **Registration**: Users generate an OpenPGP key pair and send their public key to the server
2. **Identity**: The key fingerprint becomes the user's unique identifier
3. **Authentication**: Users sign their content with their private key
4. **Verification**: The server and other users verify signatures using public keys
5. **Posts**: All content (threads, replies, files) is cryptographically signed

## Getting Started

### Prerequisites
- Docker and Docker Compose (for MinIO and PostgreSQL)
- Go 1.23 or later
- Node.js 22+ and Yarn
- An OpenPGP key pair

### Quick Start

1. **Start infrastructure services**:
```bash
docker-compose up -d
```

This starts:
- MinIO (S3-compatible object storage) on ports 9000-9001
- PostgreSQL database on port 5432

2. **Run the server**:
```bash
make server
# or
cd server && go run .
```

The server reads configuration from `/etc/userless.toml` by default (use `--config-path` to override).

3. **Run the web interface**:
```bash
cd threads
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Configuration

Create a TOML configuration file (e.g., `/etc/userless.toml`) for the server. See `server/example_configs/` for examples.

## Project Structure

```
userless/
├── server/              # Go backend server
│   ├── main.go         # Entry point
│   ├── register.go     # Key registration
│   ├── post.go         # Post handling
│   ├── thread.go       # Thread management
│   ├── key.go          # Key operations
│   ├── upload.go       # File uploads
│   └── prisma/         # Database schema
├── api-wrapper/        # TypeScript API client
│   ├── userless.ts     # Main server interface
│   ├── key.ts          # Public key operations
│   ├── thread.ts       # Thread operations
│   └── types.ts        # Type definitions
├── threads/            # Next.js web UI
│   ├── app/            # Next.js app directory
│   ├── components/     # React components
│   └── lib/            # Utility libraries
├── redditless/         # Alternative Reddit-style Next.js web UI
│   ├── app/            # Next.js app directory
│   ├── components/     # React components
│   └── lib/            # Utility libraries
├── notes/              # Data directory (gitignored)
│   ├── minio/          # MinIO storage
│   └── postgres_data/  # PostgreSQL data
├── docker-compose.yaml # Infrastructure services
└── makefile           # Build commands
```

## Development

### Server Development
```bash
cd server
go mod download
go run . --config-path=./example_configs/basic.toml
```

### API Wrapper Development
```bash
cd api-wrapper
yarn install
yarn build
```

### Web UI Development
```bash
# threads UI
cd threads
yarn install
yarn dev

# or the Reddit-style UI
cd redditless
yarn install
yarn dev
```

## Protocol Concepts

### Identity
Your OpenPGP key fingerprint IS your identity. There are no separate usernames or accounts. The key's User ID (name, email, comment) is stored for display purposes but the fingerprint is the authoritative identifier.

### Signatures
All mutable operations (creating threads, posting, uploading files) require cryptographic signatures. This ensures:
- Content authenticity (you can't impersonate another key)
- Content integrity (posts can't be altered without detection)
- Non-repudiation (authors can't deny creating signed content)

### Federation
While not yet implemented, the protocol is designed to support federation where multiple Userless servers can share content while maintaining cryptographic verification.

## Security Model

- **Private keys never leave your device**: Only public keys are sent to servers
- **All content is signed**: Preventing impersonation and tampering
- **No session hijacking**: No cookies or session tokens to steal
- **Verifiable at rest**: Anyone can verify content signatures

## Contributing

This is an experimental protocol. Contributions, ideas, and feedback are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code conventions, and how to submit a pull request.

## License

MIT. See the [LICENSE](LICENSE) file for details.

## Future Work

- Federation between servers
- End-to-end encrypted direct messages
- Mobile clients
- Key rotation and revocation
- Web of trust integration
- IPFS/distributed storage backends
