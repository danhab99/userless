#!/usr/bin/env bash

# Userless - Post Thread
# This script creates and posts a signed thread to a userless server

set -e

# Configuration
SERVER_URL="${USERLESS_SERVER:-http://localhost:4444}"
KEY_ID="${1:-}"
REPLY_TO="${2:-}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_note() {
    echo -e "${BLUE}[NOTE]${NC} $1"
}

# Display usage
usage() {
    echo "Usage: $0 KEY_ID [REPLY_TO]"
    echo ""
    echo "Create and post a signed thread to a userless server."
    echo ""
    echo "Arguments:"
    echo "  KEY_ID      GPG key ID, email, or fingerprint to sign with"
    echo "  REPLY_TO    (Optional) Hash of thread to reply to"
    echo ""
    echo "Environment variables:"
    echo "  USERLESS_SERVER  Server URL (default: http://localhost:4444)"
    echo ""
    echo "Examples:"
    echo "  $0 user@example.com"
    echo "  $0 ABC123DEF456"
    echo "  $0 user@example.com abc123def456789 (reply to thread)"
    echo "  USERLESS_SERVER=https://api.userless.io $0 user@example.com"
    echo ""
    echo "The script will open nvim for you to write your thread content."
    echo "Save and quit nvim to post the thread."
    exit 1
}

# Check for help flag or missing argument
if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]] || [[ -z "$KEY_ID" ]]; then
    usage
fi

# Check if nvim is available
if ! command -v nvim &> /dev/null; then
    print_error "nvim is not installed. Please install neovim."
    exit 1
fi

# Verify the key exists
if ! gpg --list-keys "$KEY_ID" &> /dev/null; then
    print_error "Key not found in GPG keyring: $KEY_ID"
    print_error "Use: gpg --list-keys to see available keys"
    exit 1
fi

# Get key information
KEY_INFO=$(gpg --list-keys --with-colons "$KEY_ID" 2>/dev/null)
FINGERPRINT=$(echo "$KEY_INFO" | awk -F: '/^fpr:/ {print $10; exit}')
KEY_EMAIL=$(echo "$KEY_INFO" | awk -F: '/^uid:/ {print $10; exit}' | sed 's/.*<\(.*\)>.*/\1/')

print_info "Using key: $KEY_EMAIL"
print_info "Fingerprint: $FINGERPRINT"

# Create temporary files
THREAD_CONTENT=$(mktemp)
THREAD_SIGNED=$(mktemp)
trap "rm -f $THREAD_CONTENT $THREAD_SIGNED" EXIT

# Create initial content with optional metadata
if [[ -n "$REPLY_TO" ]]; then
    cat > "$THREAD_CONTENT" <<EOF
replyTo = "$REPLY_TO"
==========
# Your thread here

Write your thread content below this line.
You can use Markdown formatting.

EOF
else
    cat > "$THREAD_CONTENT" <<EOF
# Your thread here

Write your thread content below this line.
You can use Markdown formatting.

EOF
fi

print_note "Opening nvim to compose your thread..."
print_note "Save and quit (:wq) to post, or quit without saving (:q!) to cancel"

# Open nvim for user to write the thread
nvim "$THREAD_CONTENT"

# Check if file was modified or is empty
if [[ ! -s "$THREAD_CONTENT" ]]; then
    print_warning "Thread content is empty. Cancelling post."
    exit 0
fi

# Show preview
print_info "Thread content:"
echo "---"
cat "$THREAD_CONTENT"
echo "---"

# Ask for confirmation
read -p "Post this thread? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Post cancelled."
    exit 0
fi

# Sign the content
print_info "Signing thread with key $KEY_EMAIL..."

if ! gpg --clear-sign --local-user "$KEY_ID" --output "$THREAD_SIGNED" "$THREAD_CONTENT" 2>/dev/null; then
    print_error "Failed to sign thread. Check your GPG key."
    exit 1
fi

print_info "Thread signed successfully"

# Post to server
print_info "Posting thread to $SERVER_URL/post..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$SERVER_URL/post" \
    --data-binary "@$THREAD_SIGNED" \
    -H "Content-Type: text/plain")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "201" ]]; then
    print_info "✓ Thread posted successfully!"
    if [[ -n "$RESPONSE_BODY" ]]; then
        THREAD_HASH="$RESPONSE_BODY"
        print_info "Thread hash: $THREAD_HASH"
        print_info "View at: $SERVER_URL/thread/$THREAD_HASH"
    fi
else
    print_error "Failed to post thread. HTTP status: $HTTP_CODE"
    if [[ -n "$RESPONSE_BODY" ]]; then
        echo "Response: $RESPONSE_BODY"
    fi
    exit 1
fi
