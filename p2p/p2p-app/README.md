# Userless P2P Browser Application

A decentralized peer-to-peer browser application built on WebRTC, JSON-RPC, and IndexedDB for local content caching and peer discovery.

## Features

- **Multi-page UI**: Navigate between Threads, Public Keys, Files, and Audit Log
- **P2P Discovery**: Connect to peers via Go lobby server using WebSocket signaling
- **Thread Management**: Browse, bookmark, and reply to threads from peers
- **File Transfer**: Download files referenced in threads with chunked transfer protocol
- **Public Key Database**: Discover and verify thread signatures across the network
- **Audit Log**: Track all system events and emergency alerts
- **NAT Traversal**: Optional TURN server configuration for restrictive network environments

## Setup

### Prerequisites

- Node.js 18+
- Go lobby server running on localhost:4445 (see `../lobby/`)

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

Key environment variables:

- `VITE_USERLESS_URL`: WebSocket URL of the lobby server (default: `localhost:4445`)
- `VITE_TURN_URL`: Optional TURN server for NAT traversal (e.g., `turn:example.com:3478`)
- `VITE_TURN_USERNAME`: TURN server username (optional)
- `VITE_TURN_PASSWORD`: TURN server password (optional)

### Development

Start the dev server:

```bash
npm run dev
```

Open http://localhost:5173 in two browser windows to test peer-to-peer connectivity.

### Build

```bash
npm run build
```

The production bundle will be in `dist/`.

## Architecture

### Data Layer (`src/lib/userless.ts`)

- **Userless Class**: Main facade for peer discovery, RPC calls, and IndexedDB cache
- **Database Stores**:
  - `threads`: Cached thread content
  - `publickey`: Discovered public keys for signature verification
  - `file`: Downloaded file chunks with metadata
  - `bookmarks`: User-bookmarked threads
  - `auditlog`: Append-only event log

### P2P Layer (`src/lib/p2p.ts`)

- **Server Class**: Manages WebSocket lobby connection and peer lifecycle
- **Peer Class**: Typed JSON-RPC client wrapping peer connections
- **DataChannels**: Dual channels for request/response and server-initiated messages
- **ICE Servers**: Google STUN + optional TURN servers for NAT traversal

### UI (`src/App.tsx`)

- **Threads Page**: Sidebar for thread list, main area for thread detail and reply composition
- **Keys Page**: Sidebar with public key list, main area showing threads by selected key
- **Files Page**: Table view of cached files with hash, size, and source thread
- **Audit Page**: Chronological event log with emergency event highlighting

## Integration Testing

Run the two-browser integration test guide:

```bash
../scripts/test_two_browser_integration.sh --full
```

This script guides you through 8 test scenarios:
1. Lobby WebSocket connection
2. Peer discovery and signaling
3. RPC method communication
4. File download via chunking
5. Public key fetch and caching
6. UI navigation and state management
7. Emergency event handling
8. TURN server configuration

## APIs

See `../PROTOCOL.md` for the complete JSON-RPC specification and `../api-wrapper/USAGE.md` for thread creation examples.
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
