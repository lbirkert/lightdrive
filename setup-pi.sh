#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# LightDrive — Raspberry Pi Setup Script
# Installs everything needed and registers a
# systemd service for production.
# ──────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ── Helpers ──────────────────────────────────

confirm() {
  read -rp "$1 [y/N] " reply
  case "$reply" in [yY]|[yY][eE][sS]) return 0;; *) return 1;; esac
}

prompt_default() {
  local var_name="$1" prompt="$2" default="$3"
  read -rp "$prompt [$default]: " val
  printf -v "$var_name" "%s" "${val:-$default}"
}

# ── Pre-flight ───────────────────────────────

if [[ $EUID -eq 0 ]]; then
  err "Do not run this script as root. It will use sudo where needed."
  exit 1
fi

UNAME_M="$(uname -m)"
info "Architecture: $UNAME_M"
case "$UNAME_M" in
  aarch64|armv7l|armv6l) ok "Supported ARM architecture" ;;
  *) warn "Untested architecture — proceeding anyway" ;;
esac

IS_PI=false
if command -v raspi-config &>/dev/null; then
  IS_PI=true
  info "Detected Raspberry Pi OS"
fi

# ── Clone / Update Repository ────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Walk up from the script to find the repo root (has src/lib/index.ts)
find_repo_root() {
  local dir="$1"
  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/src/lib/index.ts" ]]; then echo "$dir"; return 0; fi
    dir="$(dirname "$dir")"
  done
  return 1
}

REPO_DIR="$(find_repo_root "$SCRIPT_DIR")" || true
if [[ -n "$REPO_DIR" ]]; then
  info "Using existing repository at $REPO_DIR"
  cd "$REPO_DIR" && git pull && ok "Repository up to date"
else
  echo ""
  info "=== Clone Repository ==="
  prompt_default REPO_DIR "Destination directory" "/home/pi/FlewUi"
  if [[ -d "$REPO_DIR" ]]; then
    warn "Directory already exists"
    if confirm "Pull latest changes?"; then
      cd "$REPO_DIR" && git pull
    fi
  else
    mkdir -p "$(dirname "$REPO_DIR")"
    git clone https://github.com/lbirkert/FlewUi.git "$REPO_DIR"
    ok "Repository cloned"
  fi
fi

LIGHTDRIVE_DIR="$REPO_DIR/examples/lightdrive"
if [[ ! -d "$LIGHTDRIVE_DIR" ]]; then
  err "LightDrive not found at $LIGHTDRIVE_DIR"
  exit 1
fi
cd "$LIGHTDRIVE_DIR"

# ── Install System Dependencies ──────────────

echo ""
info "=== System Dependencies ==="

# Update package lists first
if confirm "Update package lists (apt update)?"; then
  sudo apt update
fi

DEPS=()
# Git (usually present)
command -v git &>/dev/null || DEPS+=(git)
# Curl (for nvm)
command -v curl &>/dev/null || DEPS+=(curl)
# Build tools for native modules (sharp, argon2)
if ! dpkg -s build-essential &>/dev/null 2>&1; then DEPS+=(build-essential); fi
if ! dpkg -s python3 &>/dev/null 2>&1; then DEPS+=(python3); fi

if [[ ${#DEPS[@]} -gt 0 ]]; then
  info "Installing: ${DEPS[*]}"
  sudo apt install -y "${DEPS[@]}"
  ok "System dependencies installed"
else
  ok "All system dependencies already present"
fi

# ── Install Node.js via nvm ──────────────────

echo ""
info "=== Node.js ==="

install_node() {
  if ! command -v nvm &>/dev/null && [[ ! -s "$HOME/.nvm/nvm.sh" ]]; then
    info "Installing nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
  fi
  # Source nvm for this script
  export NVM_DIR="$HOME/.nvm"
  [[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"
  if command -v nvm &>/dev/null; then
    info "Installing Node 24 LTS via nvm..."
    nvm install 24
    nvm use 24
    nvm alias default 24
    ok "Node $(node -v), npm $(npm -v)"
  fi
}

if command -v node &>/dev/null; then
  NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
  if [[ "$NODE_MAJOR" -lt 18 ]]; then
    warn "Node $(node -v) is too old. Installing newer version..."
    install_node
  else
    ok "Node $(node -v) already installed"
  fi
else
  install_node
fi

# ── Configure Environment ────────────────────

echo ""
info "=== Configuration ==="

if [[ ! -f .env ]]; then
  cp .env.example .env
  ok "Created .env from .env.example"
fi

source_env() {
  set -a; source .env 2>/dev/null; set +a
}
source_env

echo ""
info "=== Database ==="
if [[ -z "${DATABASE_URL:-}" || "$DATABASE_URL" == *dev.db* ]]; then
  info "Configuring SQLite (default — zero config)..."
  mkdir -p data
  sed -i '/^DATABASE_URL/d' .env
  echo 'DATABASE_URL="file:./data/lightdrive.db"' >> .env
  ok "SQLite database: data/lightdrive.db"
else
  ok "Using existing DATABASE_URL"
fi

echo ""
info "=== Public URL (ORIGIN) ==="
if [[ -z "${ORIGIN:-}" ]]; then
  DEFAULT_ORIGIN="http://$(hostname -I 2>/dev/null | awk '{print $1}'):3000"
  [[ -z "$DEFAULT_ORIGIN" ]] && DEFAULT_ORIGIN="http://localhost:3000"
  prompt_default ORIGIN_VAL "Public URL for CSRF protection" "$DEFAULT_ORIGIN"
  echo "ORIGIN=$ORIGIN_VAL" >> .env
  ok "ORIGIN set to $ORIGIN_VAL"
else
  ok "ORIGIN already set to $ORIGIN"
fi

echo ""
info "=== Port ==="
if [[ -z "${PORT:-}" ]]; then
  prompt_default PORT_VAL "Port" "3000"
  echo "PORT=$PORT_VAL" >> .env
  PORT="$PORT_VAL"
  ok "PORT set to $PORT_VAL"
else
  ok "PORT already set to $PORT"
fi

echo ""
info "=== Body Size Limit ==="
if ! grep -q "^BODY_SIZE_LIMIT" .env 2>/dev/null; then
  echo 'BODY_SIZE_LIMIT=52428800' >> .env
  ok "BODY_SIZE_LIMIT set to 50 MB"
fi

# ── Install npm Dependencies ─────────────────

echo ""
info "=== Install npm Dependencies ==="

# Build flewui first (it's a local file: dependency)
FLW_DIR="$REPO_DIR"
if [[ -d "$FLW_DIR" && ! -f "$FLW_DIR/dist/index.js" ]]; then
  info "Building flewui component library..."
  cd "$FLW_DIR"
  npm install
  npm run build
  cd "$LIGHTDRIVE_DIR"
  ok "flewui built"
else
  ok "flewui already built"
fi

info "Installing LightDrive dependencies..."
npm install
ok "Dependencies installed"

# ── SvelteKit sync — creates .svelte-kit/tsconfig.json ──

echo ""
info "=== SvelteKit Sync ==="
npx svelte-kit sync
ok "SvelteKit synced"

# ── Prisma: generate client & push schema ────

echo ""
info "=== Database Setup ==="

# Generate Prisma client (output to src/lib/server/prisma-client)
npx prisma generate
# Push schema to database
if grep -q "^DATABASE_URL=\"\?file:" .env; then
  # SQLite — ensure parent directory exists
  DB_PATH=$(grep ^DATABASE_URL .env | sed 's/^DATABASE_URL=//' | tr -d '"' | sed 's/^file://')
  mkdir -p "$(dirname "$DB_PATH")" 2>/dev/null || true
  npx prisma db push --accept-data-loss
else
  npx prisma db push --accept-data-loss
fi
ok "Database schema applied"

# ── Build the Application ────────────────────

echo ""
info "=== Build ==="
npm run build
ok "Build complete"

# ── Create systemd Service ───────────────────

echo ""
info "=== Systemd Service ==="

SERVICE_NAME="lightdrive"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"

# Stop any running instance before reconfiguring
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  info "Stopping running $SERVICE_NAME service..."
  sudo systemctl stop "$SERVICE_NAME"
fi

if [[ -f "$SERVICE_FILE" ]]; then
  warn "Service $SERVICE_NAME already exists"
  if confirm "Recreate service file?"; then
    sudo rm "$SERVICE_FILE"
  else
    warn "Skipping service setup"
  fi
fi

if [[ ! -f "$SERVICE_FILE" ]]; then
  # Build absolute node path
  NODE_BIN="$(command -v node)"
  if [[ -f "$HOME/.nvm/nvm.sh" ]]; then
    # Try to get the nvm-managed node path
    NODE_BIN="$HOME/.nvm/versions/node/$(cat "$HOME/.nvm/alias/default" 2>/dev/null || echo "default")/bin/node"
  fi
  if [[ ! -x "$NODE_BIN" ]]; then
    NODE_BIN="$(command -v node)"
  fi

  # Read PORT from .env for an explicit Environment= directive
  # (EnvironmentFile is fragile with quoted values from other variables)
  sudo tee "$SERVICE_FILE" > /dev/null <<UNIT
[Unit]
Description=LightDrive — Self-hosted file sharing
Documentation=https://github.com/lbirkert/FlewUi
After=network.target

[Service]
Type=exec
User=$USER
WorkingDirectory=$LIGHTDRIVE_DIR
ExecStart=$NODE_BIN --import dotenv/config $LIGHTDRIVE_DIR/build/index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=HOST=0.0.0.0
Environment=BODY_SIZE_LIMIT=52428800

[Install]
WantedBy=multi-user.target
UNIT

  sudo systemctl daemon-reload
  sudo systemctl enable "$SERVICE_NAME"
  sudo systemctl restart "$SERVICE_NAME"
  sleep 1
  if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    ok "Service $SERVICE_NAME created and running"
  else
    warn "Service failed to start — check: sudo journalctl -u $SERVICE_NAME -n 30"
  fi
fi

# ── Firewall Hint ────────────────────────────

echo ""
info "=== Firewall ==="
if command -v ufw &>/dev/null; then
  if confirm "Open port 3000 in UFW?"; then
    sudo ufw allow 3000/tcp
    ok "Port 3000 opened"
  fi
else
  info "No UFW detected — ensure port 3000 is reachable"
fi

# ── Done ─────────────────────────────────────

echo ""
echo "────────────────────────────────────────────────────"
echo -e "${GREEN}  LightDrive is running!${NC}"
echo ""
SERVICE_STATUS=$(sudo systemctl is-active "$SERVICE_NAME" 2>/dev/null || echo "unknown")
echo "  Service status: $SERVICE_STATUS"
if command -v hostname &>/dev/null; then
  IP=$(hostname -I | awk '{print $1}')
  echo "  Local URL:      http://$IP:3000"
fi
echo ""
echo "  Manage service:"
echo "    sudo systemctl status $SERVICE_NAME"
echo "    sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "  Update:"
echo "    cd $REPO_DIR && git pull"
echo "    cd $LIGHTDRIVE_DIR && npm install && npm run build"
echo "    sudo systemctl restart $SERVICE_NAME"
echo ""
echo "  To change the port or ORIGIN, edit $LIGHTDRIVE_DIR/.env"
echo "  then restart: sudo systemctl restart $SERVICE_NAME"
echo "────────────────────────────────────────────────────"
