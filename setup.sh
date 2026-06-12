#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# LightDrive — Universal Linux Install / Update Script
# Usage: curl -fsSL https://raw.githubusercontent.com/lbirkert/lightdrive/main/setup.sh | bash
#
# Run the same command again to update an existing installation.
# ──────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ── Banner ────────────────────────────────────

echo ""
echo -e "${CYAN}  ⚡ LightDrive${NC}"
echo -e "${CYAN}  Self-hosted file sharing${NC}"
echo ""

# ── Pre-flight ───────────────────────────────

if [[ $EUID -eq 0 ]]; then
  err "Do not run this script as root. It will use sudo where needed."
  exit 1
fi

UNAME_M="$(uname -m)"
info "Architecture: $UNAME_M"

if [[ "$(uname -s)" != "Linux" ]]; then
  err "This script is designed for Linux. For other platforms, see the README."
  exit 1
fi

# ── Distro Detection ─────────────────────────

detect_pkg_manager() {
  if command -v apt &>/dev/null; then
    echo "apt"
  elif command -v dnf &>/dev/null; then
    echo "dnf"
  elif command -v yum &>/dev/null; then
    echo "yum"
  elif command -v pacman &>/dev/null; then
    echo "pacman"
  elif command -v zypper &>/dev/null; then
    echo "zypper"
  else
    echo "unknown"
  fi
}

PKG_MANAGER=$(detect_pkg_manager)
info "Package manager: $PKG_MANAGER"

install_pkg() {
  local pkg="$1"
  case "$PKG_MANAGER" in
    apt)   sudo apt install -y "$pkg" ;;
    dnf)   sudo dnf install -y "$pkg" ;;
    yum)   sudo yum install -y "$pkg" ;;
    pacman) sudo pacman --noconfirm -S "$pkg" ;;
    zypper) sudo zypper install -y "$pkg" ;;
    *)     err "Unsupported package manager"; return 1 ;;
  esac
}

update_pkg_lists() {
  case "$PKG_MANAGER" in
    apt)   sudo apt update ;;
    dnf|yum) sudo "$PKG_MANAGER" check-update || true ;;
    pacman) sudo pacman -Sy ;;
    zypper) sudo zypper refresh ;;
  esac
}

pkg_installed() {
  case "$PKG_MANAGER" in
    apt)   dpkg -s "$1" &>/dev/null 2>&1 ;;
    dnf|yum) rpm -q "$1" &>/dev/null 2>&1 ;;
    pacman) pacman -Qi "$1" &>/dev/null 2>&1 ;;
    zypper) rpm -q "$1" &>/dev/null 2>&1 ;;
    *) return 1 ;;
  esac
}

# ── Determine Install Directory ───────────────

prompt_default() {
  local var_name="$1" prompt="$2" default="$3"
  read -rp "$prompt [$default]: " val
  printf -v "$var_name" "%s" "${val:-$default}"
}

confirm() {
  read -rp "$1 [y/N] " reply
  case "$reply" in [yY]|[yY][eE][sS]) return 0;; *) return 1;; esac
}

# ── Clone / Pull Repository ──────────────────

INSTALL_DIR=""

# If run from a clone (i.e. script lives in repo), use that
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ -f "$SCRIPT_DIR/package.json" ]] && grep -q '"name": "lightdrive"' "$SCRIPT_DIR/package.json" 2>/dev/null; then
  INSTALL_DIR="$SCRIPT_DIR"
  info "Using repository at $INSTALL_DIR"
elif [[ -f "$PWD/package.json" ]] && grep -q '"name": "lightdrive"' "$PWD/package.json" 2>/dev/null; then
  INSTALL_DIR="$PWD"
  info "Using repository at $INSTALL_DIR"
fi

if [[ -z "$INSTALL_DIR" ]]; then
  echo ""
  info "=== Clone Repository ==="
  prompt_default INSTALL_DIR "Install directory" "$HOME/lightdrive"
  if [[ -d "$INSTALL_DIR" ]]; then
    warn "Directory $INSTALL_DIR already exists"
    if confirm "Pull latest changes?"; then
      cd "$INSTALL_DIR" && git pull
    fi
  else
    mkdir -p "$(dirname "$INSTALL_DIR")"
    git clone https://github.com/lbirkert/lightdrive.git "$INSTALL_DIR"
    ok "Repository cloned"
  fi
fi

cd "$INSTALL_DIR"

# ── System Dependencies ──────────────────────

echo ""
info "=== System Dependencies ==="

if confirm "Update package lists?"; then
  update_pkg_lists
fi

DEPS=()
# Build tools for native modules (sharp, argon2)
if ! pkg_installed git; then DEPS+=(git); fi
if command -v curl &>/dev/null; then true; else DEPS+=(curl); fi

case "$PKG_MANAGER" in
  apt)
    if ! pkg_installed build-essential; then DEPS+=(build-essential); fi
    if ! pkg_installed python3; then DEPS+=(python3); fi
    ;;
  dnf|yum)
    if ! pkg_installed "@Development Tools"; then DEPS+=( "@Development Tools" ); fi
    if ! pkg_installed python3; then DEPS+=(python3); fi
    ;;
  pacman)
    if ! pkg_installed base-devel; then DEPS+=(base-devel); fi
    if ! pkg_installed python; then DEPS+=(python); fi
    ;;
  zypper)
    if ! pkg_installed patterns-devel-base-devel_basis; then DEPS+=(patterns-devel-base-devel_basis); fi
    if ! pkg_installed python3; then DEPS+=(python3); fi
    ;;
esac

if [[ ${#DEPS[@]} -gt 0 ]]; then
  info "Installing: ${DEPS[*]}"
  install_pkg "${DEPS[@]}"
  ok "System dependencies installed"
else
  ok "All system dependencies already present"
fi

# ── Node.js via nvm ──────────────────────────

echo ""
info "=== Node.js ==="

install_node() {
  if ! command -v nvm &>/dev/null && [[ ! -s "$HOME/.nvm/nvm.sh" ]]; then
    info "Installing nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
  fi
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

# ── Environment ──────────────────────────────

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

# ── Database ─────────────────────────────────

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

# ── Public URL ───────────────────────────────

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

# ── Port ─────────────────────────────────────

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

# ── npm Dependencies ─────────────────────────

echo ""
info "=== Install npm Dependencies ==="
npm install
ok "Dependencies installed"

# ── SvelteKit Sync ──────────────────────────

echo ""
info "=== SvelteKit Sync ==="
npx svelte-kit sync
ok "SvelteKit synced"

# ── Database Setup ──────────────────────────

echo ""
info "=== Database Setup ==="
npx prisma generate
if grep -q "^DATABASE_URL=\"\?file:" .env; then
  DB_PATH=$(grep ^DATABASE_URL .env | sed 's/^DATABASE_URL=//' | tr -d '"' | sed 's/^file://')
  mkdir -p "$(dirname "$DB_PATH")" 2>/dev/null || true
  npx prisma db push --accept-data-loss
else
  npx prisma db push --accept-data-loss
fi
ok "Database schema applied"

# ── Migrations ───────────────────────────────

info "=== Involved Users Migration ==="
npx tsx scripts/migrate-involved.ts 2>/dev/null || true
ok "Involved users migrated"

info "=== Avatar Colors Migration ==="
npx tsx scripts/migrate-avatar-colors.ts 2>/dev/null || true
ok "Avatar colors migrated"

info "=== Folder Sizes Migration ==="
npx tsx scripts/migrate-folder-sizes.ts 2>/dev/null || true
ok "Folder sizes migrated"

# ── Build ────────────────────────────────────

echo ""
info "=== Build ==="
npm run build
ok "Build complete"

# ── Systemd Service ─────────────────────────

echo ""
info "=== Systemd Service ==="

SERVICE_NAME="lightdrive"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"

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
  NODE_BIN="$(command -v node)"
  if [[ -f "$HOME/.nvm/nvm.sh" ]]; then
    NVM_NODE="$HOME/.nvm/versions/node/$(cat "$HOME/.nvm/alias/default" 2>/dev/null || echo "default")/bin/node"
    [[ -x "$NVM_NODE" ]] && NODE_BIN="$NVM_NODE"
  fi

  sudo tee "$SERVICE_FILE" > /dev/null <<UNIT
[Unit]
Description=LightDrive — Self-hosted file sharing
Documentation=https://github.com/lbirkert/lightdrive
After=network.target

[Service]
Type=exec
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$NODE_BIN --import dotenv/config $INSTALL_DIR/build/index.js
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

# ── Firewall ─────────────────────────────────

echo ""
info "=== Firewall ==="
if command -v ufw &>/dev/null; then
  if confirm "Open port $PORT in UFW?"; then
    sudo ufw allow "$PORT/tcp"
    ok "Port $PORT opened"
  fi
elif command -v firewall-cmd &>/dev/null; then
  if confirm "Open port $PORT in firewalld?"; then
    sudo firewall-cmd --permanent --add-port="$PORT/tcp"
    sudo firewall-cmd --reload
    ok "Port $PORT opened"
  fi
else
  info "No firewall tool detected — ensure port $PORT is reachable"
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
  echo "  Local URL:      http://$IP:$PORT"
fi
echo ""
echo "  Manage service:"
echo "    sudo systemctl status $SERVICE_NAME"
echo "    sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "  Update:"
echo "    cd $INSTALL_DIR && git pull && npm install && npm run build && sudo systemctl restart $SERVICE_NAME"
echo ""
echo "  To change the port or ORIGIN, edit $INSTALL_DIR/.env"
echo "  then restart: sudo systemctl restart $SERVICE_NAME"
echo "────────────────────────────────────────────────────"
