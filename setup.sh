#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> LightDrive Setup"

# 1. Check for Node.js / Bun
if command -v bun &>/dev/null; then
  RUNTIME="bun"
elif command -v node &>/dev/null; then
  RUNTIME="node"
  if command -v nvm &>/dev/null; then
    echo "==> Using nvm — switching to Node 24"
    nvm use 24 2>/dev/null || true
  fi
else
  echo "Error: Neither Bun nor Node.js is installed."
  echo "Install Bun: curl -fsSL https://bun.sh/install | bash"
  echo "Install Node: https://nodejs.org/"
  exit 1
fi
echo "==> Runtime: $RUNTIME"

# 2. Create .env from example if missing
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "==> Created .env from .env.example"
  else
    echo "==> Warning: No .env.example found, skipping .env setup"
  fi
else
  echo "==> .env already exists, skipping"
fi

# 3. Install dependencies
echo "==> Installing dependencies..."
if [ "$RUNTIME" = "bun" ]; then
  bun install
else
  npm install
fi

# 4. Build flewui dependency if needed
if [ -d node_modules/flewui ]; then
  FLW_DIR="$(cd node_modules/flewui && pwd)"
  if [ ! -f "$FLW_DIR/dist/index.js" ]; then
    echo "==> Building flewui dependency..."
    (cd "$FLW_DIR" && npm install && npm run build)
  else
    echo "==> flewui already built"
  fi
fi

# 5. Generate Prisma client and push schema
echo "==> Setting up database..."
if [ "$RUNTIME" = "bun" ]; then
  bunx prisma generate
  bunx prisma db push --accept-data-loss
else
  npx prisma generate
  npx prisma db push --accept-data-loss
fi

echo ""
echo "==> Setup complete!"
echo "    Run: $RUNTIME run dev"
echo "    Open: http://localhost:5173"
