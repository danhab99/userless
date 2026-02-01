#!/usr/bin/env bash

# Userless - Generate and Register GPG Key
# This script generates a new GPG key pair and registers the public key with a userless server

set -e

# Configuration
SERVER_URL="${USERLESS_SERVER:-http://localhost:4444}"
KEY_NAME="${1:-}"
KEY_EMAIL="${2:-}"
OUTPUT_DIR="${3:-$HOME/.userless/keys}"

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

# Function to generate a random string
generate_random_string() {
    length=$1
    cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w "$length" | head -n 1
}

# Function to generate a random name
generate_random_name() {
    first_names=("Alice" "Bob" "Charlie" "Diana" "Eve" "Frank" "Grace" "Henry" "Iris" "Jack")
    last_names=("Anderson" "Brown" "Clark" "Davis" "Evans" "Foster" "Green" "Harris" "Irving" "Jones")
    
    first_name=${first_names[$RANDOM % ${#first_names[@]}]}
    last_name=${last_names[$RANDOM % ${#last_names[@]}]}
    
    echo "$first_name $last_name"
}

# Display usage
usage() {
    echo "Usage: $0 [NAME] [EMAIL] [OUTPUT_DIR]"
    echo ""
    echo "Generate a new GPG key pair and register it with a userless server."
    echo ""
    echo "Arguments:"
    echo "  NAME        Name for the key (optional, will be randomly generated if not provided)"
    echo "  EMAIL       Email for the key (optional, will be randomly generated if not provided)"
    echo "  OUTPUT_DIR  Directory to save keys (default: \$HOME/.userless/keys)"
    echo ""
    echo "Environment variables:"
    echo "  USERLESS_SERVER  Server URL (default: http://localhost:4444)"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 \"John Doe\" \"john@example.com\""
    echo "  USERLESS_SERVER=https://api.userless.io $0"
    exit 1
}

# Check for help flag
if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    usage
fi

# Generate random values if not provided
if [[ -z "$KEY_NAME" ]]; then
    KEY_NAME=$(generate_random_name)
    print_info "Generated random name: $KEY_NAME"
fi

if [[ -z "$KEY_EMAIL" ]]; then
    username=$(generate_random_string 8)
    KEY_EMAIL="${username}@userless.local"
    print_info "Generated random email: $KEY_EMAIL"
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Create a unique directory for this key
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
KEY_DIR="${OUTPUT_DIR}/${TIMESTAMP}_$(generate_random_string 6)"
mkdir -p "$KEY_DIR"

print_info "Creating key directory: $KEY_DIR"
print_info "Generating GPG key for: $KEY_NAME <$KEY_EMAIL>"

# Create temporary GPG key generation config
CONFIG_FILE=$(mktemp)
cat > "$CONFIG_FILE" <<EOF
%echo Generating GPG key
Key-Type: eddsa
Key-Curve: Ed25519
Name-Real: $KEY_NAME
Name-Email: $KEY_EMAIL
Expire-Date: 0
%no-protection
%commit
%echo Done
EOF

# Generate the key
print_info "Generating key pair (this may take a moment)..."
gpg --batch --generate-key "$CONFIG_FILE" 2>&1

# Get the key fingerprint
FINGERPRINT=$(gpg --list-keys --with-colons "$KEY_EMAIL" | awk -F: '/^fpr:/ {print $10; exit}')

if [[ -z "$FINGERPRINT" ]]; then
    print_error "Failed to find generated key"
    rm -f "$CONFIG_FILE"
    exit 1
fi

print_info "Key generated with fingerprint: $FINGERPRINT"

# Export keys
print_info "Exporting keys..."
gpg --armor --export "$FINGERPRINT" > "$KEY_DIR/public.asc"
gpg --armor --export-secret-key "$FINGERPRINT" > "$KEY_DIR/private.asc"

# Save key info
cat > "$KEY_DIR/info.txt" <<EOF
Name: $KEY_NAME
Email: $KEY_EMAIL
Fingerprint: $FINGERPRINT
Generated: $(date)
Server: $SERVER_URL
EOF

print_info "Keys exported to: $KEY_DIR"
print_info "  - Public key: $KEY_DIR/public.asc"
print_info "  - Private key: $KEY_DIR/private.asc"
print_info "  - Info: $KEY_DIR/info.txt"

# Register the public key with the server
print_info "Registering public key with server: $SERVER_URL/register"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$SERVER_URL/register" \
    --data-binary "@$KEY_DIR/public.asc" \
    -H "Content-Type: text/plain")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "201" ]]; then
    print_info "✓ Successfully registered public key with server"
    echo "$HTTP_CODE" > "$KEY_DIR/registration_status.txt"
else
    print_error "Failed to register key. HTTP status: $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    echo "$HTTP_CODE" > "$KEY_DIR/registration_status.txt"
    echo "$RESPONSE_BODY" >> "$KEY_DIR/registration_status.txt"
    rm -f "$CONFIG_FILE"
    exit 1
fi

# Clean up
rm -f "$CONFIG_FILE"

print_info "================================"
print_info "Key generation and registration complete!"
print_info ""
print_info "Fingerprint: $FINGERPRINT"
print_info "Key directory: $KEY_DIR"
print_info ""
print_info "To delete the key from GPG keyring later:"
print_info "  gpg --delete-secret-keys $FINGERPRINT"
print_info "  gpg --delete-keys $FINGERPRINT"
