#!/usr/bin/env bash

# Userless - Register Existing GPG Key
# This script registers an existing GPG public key with a userless server

set -e

# Configuration
SERVER_URL="${USERLESS_SERVER:-http://localhost:4444}"
KEY_FILE="${1:-}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Display usage
usage() {
    echo "Usage: $0 KEY_FILE|KEY_ID"
    echo ""
    echo "Register an existing GPG public key with a userless server."
    echo ""
    echo "Arguments:"
    echo "  KEY_FILE    Path to an armored public key file (.asc or .gpg)"
    echo "  KEY_ID      GPG key ID, email, or fingerprint from your keyring"
    echo ""
    echo "Environment variables:"
    echo "  USERLESS_SERVER  Server URL (default: http://localhost:4444)"
    echo ""
    echo "Examples:"
    echo "  $0 public.asc"
    echo "  $0 user@example.com"
    echo "  $0 ABC123DEF456"
    echo "  USERLESS_SERVER=https://api.userless.io $0 public.asc"
    exit 1
}

# Check for help flag or missing argument
if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]] || [[ -z "$KEY_FILE" ]]; then
    usage
fi

# Create temporary file for the public key
TEMP_KEY=$(mktemp)
trap "rm -f $TEMP_KEY" EXIT

# Check if argument is a file or a key identifier
if [[ -f "$KEY_FILE" ]]; then
    # It's a file
    print_info "Using public key from file: $KEY_FILE"
    cp "$KEY_FILE" "$TEMP_KEY"
else
    # Try to export from GPG keyring
    print_info "Attempting to export key from GPG keyring: $KEY_FILE"
    
    if ! gpg --armor --export "$KEY_FILE" > "$TEMP_KEY" 2>/dev/null; then
        print_error "Failed to export key. Key not found in keyring or file does not exist."
        print_error "Tried: $KEY_FILE"
        exit 1
    fi
    
    # Check if export was successful (file not empty)
    if [[ ! -s "$TEMP_KEY" ]]; then
        print_error "Key export resulted in empty file. Key not found: $KEY_FILE"
        exit 1
    fi
fi

# Verify it's a valid armored key
if ! grep -q "BEGIN PGP PUBLIC KEY BLOCK" "$TEMP_KEY"; then
    print_error "Invalid key file. File must contain an armored PGP public key."
    exit 1
fi

print_info "Public key validated"

# Get key information for display
KEY_INFO=$(gpg --import-options show-only --import "$TEMP_KEY" 2>/dev/null | head -20)
if [[ -n "$KEY_INFO" ]]; then
    print_info "Key information:"
    echo "$KEY_INFO" | grep -E "(pub|uid)" | sed 's/^/  /'
fi

# Register the public key with the server
print_info "Registering public key with server: $SERVER_URL/register"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$SERVER_URL/register" \
    --data-binary "@$TEMP_KEY" \
    -H "Content-Type: text/plain")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "201" ]]; then
    print_info "✓ Successfully registered public key with server"
    exit 0
else
    print_error "Failed to register key. HTTP status: $HTTP_CODE"
    if [[ -n "$RESPONSE_BODY" ]]; then
        echo "Response: $RESPONSE_BODY"
    fi
    exit 1
fi
