#!/bin/bash
#
# Two-Browser Local Integration Test Flow
# 
# This script helps test the userless p2p application with two local browsers.
# It verifies: lobby connection, peer signaling, RPC calls, file fetch, and key fetch.
#
# Prerequisites:
#   - Go lobby server running on localhost:4445
#   - p2p app dev server running on localhost:5173
#   - Two browsers or browser instances available
#   - Optional: jq for JSON parsing
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_step() {
    echo -e "\n${YELLOW}========================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}========================================${NC}\n"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking Prerequisites"
    
    # Check if lobby server is running
    if ! curl -s http://localhost:4445/health >/dev/null 2>&1; then
        log_error "Go lobby server is not running at localhost:4445"
        log_info "Start it with: cd centralized/server && go run ."
        return 1
    fi
    log_success "Lobby server is running"
    
    # Check if p2p app dev server is running
    if ! curl -s http://localhost:5173 >/dev/null 2>&1; then
        log_error "P2P app dev server is not running at localhost:5173"
        log_info "Start it with: cd p2p/p2p-app && npm run dev"
        return 1
    fi
    log_success "P2P app dev server is running"
    
    return 0
}

# Test lobby connection
test_lobby_connection() {
    log_step "Test 1: Lobby WebSocket Connection"
    
    log_info "The lobby server should accept WebSocket connections"
    log_info "Test by opening browser console and running:"
    echo -e "${YELLOW}  const ws = new WebSocket('ws://localhost:4445/lobby');${NC}"
    echo -e "${YELLOW}  ws.addEventListener('message', e => console.log(e.data));${NC}"
    log_info "You should see { \"msg\": \"welcome\", ... } message"
}

# Test peer discovery
test_peer_discovery() {
    log_step "Test 2: Peer Discovery and Signaling"
    
    log_info "Open app in two browser windows/tabs:"
    log_info "  - Window A: http://localhost:5173"
    log_info "  - Window B: http://localhost:5173"
    log_info ""
    log_info "Expected behavior:"
    log_info "  1. Both windows connect to lobby"
    log_info "  2. Lobby broadcasts new_peer message to alert of other peers"
    log_info "  3. WebRTC offer/answer exchange happens (watch Network tab for signaling)"
    log_info "  4. Status bar shows connection_count > 0 after handshake completes"
    log_info ""
    log_info "Check in browser console:"
    echo -e "${YELLOW}  window.userless.server.getPeers().length${NC}"
    log_info "Should return >= 1 when peer connection is established"
}

# Test RPC communication
test_rpc_communication() {
    log_step "Test 3: RPC Method Communication"
    
    log_info "Once peers are connected, test RPC calls:"
    log_info ""
    log_info "In Window A console, call:"
    echo -e "${YELLOW}  const userless = window.userless;${NC}"
    echo -e "${YELLOW}  await userless.getAllThreads();${NC}"
    log_info ""
    log_info "This should return the paginated thread list from peers"
    log_info ""
    log_info "In Window B console, create and share a thread:"
    echo -e "${YELLOW}  // See api-wrapper USAGE.md for thread creation${NC}"
    log_info ""
    log_info "Then refresh Window A - new thread should appear"
}

# Test file transfer
test_file_transfer() {
    log_step "Test 4: File Download via RPC"
    
    log_info "Create a thread with an embedded file in Window B:"
    log_info "  1. Use the reply composition to embed a small file reference"
    log_info "  2. Ensure thread.body contains userless:// file URL"
    log_info "  3. Publish thread"
    log_info ""
    log_info "In Window A, when thread is fetched:"
    log_info "  1. App scans for files in thread.body"
    log_info "  2. File fetch happens via RPC getFile() chunks"
    log_info "  3. Check status bar: fileCount should increment"
    log_info ""
    log_info "Verify file transfer completed:"
    echo -e "${YELLOW}  window.userless.getSnapshot().then(s => console.log(s.fileCount));${NC}"
}

# Test key exchange
test_key_exchange() {
    log_step "Test 5: Public Key Fetch via RPC"
    
    log_info "When threads are fetched, their signing keys are queried:"
    log_info "  1. App extracts key fingerprint from cleartext message"
    log_info "  2. If key not in local cache, queries peers via getPublicKeys()"
    log_info "  3. Key stored in IndexedDB publickey store"
    log_info ""
    log_info "Verify key caching:"
    echo -e "${YELLOW}  window.userless.getAllPublicKeysDetailed().then(k => console.log(k.length));${NC}"
    log_info "Should return > 0 after threads are loaded"
}

# Test UI pages
test_ui_pages() {
    log_step "Test 6: Multi-Page UI Navigation"
    
    log_info "Click through all pages in the navigation bar:"
    log_info ""
    log_info "  Threads: Primary view - shows thread list and detail"
    log_info "    - Select a thread to see body and replies"
    log_info "    - Try bookmarking a thread (button toggles)"
    log_info "    - Try composing a reply (saves to audit log)"
    log_info ""
    log_info "  Keys: Public keys discovered from threads"
    log_info "    - Shows all cached public key fingerprints"
    log_info "    - Select a key to view threads signed by it"
    log_info ""
    log_info "  Files: Downloaded files and their metadata"
    log_info "    - Lists all cached files with hashes"
    log_info "    - Shows file size in KB"
    log_info "    - Shows source thread hash (backlink)"
    log_info ""
    log_info "  Audit: System event log"
    log_info "    - Chronological list of all system events"
    log_info "    - peer_connected, thread_cached, file_cached, etc."
    log_info "    - Emergency events highlighted in red"
}

# Test emergency events
test_emergency_events() {
    log_step "Test 7: Emergency Event Handling"
    
    log_info "Emergency events are system alerts from peers"
    log_info ""
    log_info "To trigger an emergency event:"
    log_info "  1. In Go lobby or p2p.ts, emit an emergency message"
    log_info "  2. Browser receives message and appends to audit log"
    log_info "  3. Audit Log page shows it with red highlighting"
    log_info ""
    log_info "Verify emergency event in audit log:"
    echo -e "${YELLOW}  window.userless.getAuditLog()${NC}"
    log_info "Filter for entries with event==='emergency'"
}

# Test TURN configuration
test_turn_configuration() {
    log_step "Test 8: TURN Server Configuration"
    
    log_info "TURN servers are used for NAT traversal when direct connection fails"
    log_info ""
    log_info "Configuration via environment variables:"
    echo -e "${YELLOW}  VITE_TURN_URL=turn:your-turn-server.com:3478${NC}"
    echo -e "${YELLOW}  VITE_TURN_USERNAME=user{{NC}"
    echo -e "${YELLOW}  VITE_TURN_PASSWORD=pass{{NC}"
    log_info ""
    log_info "Verify TURN config is loaded:"
    echo -e "${YELLOW}  // In src/lib/p2p.ts buildIceServers(){{NC}"
    log_info "ICE_SERVERS array will contain TURN URL if env vars are set"
}

# Test two-browser scenario summary
test_summary() {
    log_step "Integration Test Summary"
    
    log_info "Successful two-browser integration demonstrates:"
    log_info "  ✓ Lobby WebSocket connection and peer discovery"
    log_info "  ✓ WebRTC peer connection establishment"
    log_info "  ✓ JSON-RPC communication over DataChannels"
    log_info "  ✓ Thread pagination and fetching"
    log_info "  ✓ File chunked download"
    log_info "  ✓ Public key discovery and caching"
    log_info "  ✓ Bookmark and reply draft persistence"
    log_info "  ✓ Multi-page UI navigation works correctly"
    log_info "  ✓ Audit log captures all events"
    log_info "  ✓ Emergency events are highlighted"
    log_info ""
    log_info "If all checks pass, the p2p application is working end-to-end!"
}

# Main test runner
main() {
    if [[ "${1:-}" == "--help" ]]; then
        cat << 'EOF'
Usage: ./test_two_browser_integration.sh [OPTION]

Two-browser integration test script for userless p2p app.

Options:
  --help              Show this help message
  --full              Run all verification steps (manual)
  --check-only        Only check prerequisites (fastest)

Manual Steps (run --full then follow instructions):
  1. Check prerequisites (ports, servers running)
  2. Guide through lobby connection test
  3. Guide through peer discovery test
  4. Guide through RPC communication test
  5. Guide through file transfer test
  6. Guide through key exchange test
  7. Guide through UI navigation test
  8. Guide through emergency handling test
  9. Guide through TURN config test

EOF
        exit 0
    fi

    if ! check_prerequisites; then
        exit 1
    fi

    if [[ "${1:-}" == "--check-only" ]]; then
        log_success "All prerequisites met. Ready to run manual tests."
        exit 0
    fi

    # Full test flow
    test_lobby_connection
    test_peer_discovery
    test_rpc_communication
    test_file_transfer
    test_key_exchange
    test_ui_pages
    test_emergency_events
    test_turn_configuration
    test_summary
    
    log_info "Integration test guide complete!"
    log_info "Follow the steps in each test section above in your browsers"
}

main "$@"
