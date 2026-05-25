#!/bin/bash
set -e

SERVER="ubuntu@3.142.74.95"
KEY="$HOME/Downloads/eawlma-key.pem"
GITHUB_REPO="https://github.com/msufyanabbas/eawlma.git"

SSH_OPTS="-i $KEY \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=20 \
  -o TCPKeepAlive=yes \
  -o ConnectTimeout=30 \
  -o StrictHostKeyChecking=no"

echo "🚀 Deploying eawlma to production..."
echo "📡 Connecting to $SERVER..."

ssh $SSH_OPTS "$SERVER" bash << REMOTE
set -e

echo ""
echo "📥 Step 1: Cloning latest code from GitHub..."
cd /tmp
rm -rf eawlma-build
git clone --depth=1 $GITHUB_REPO eawlma-build
cd eawlma-build
echo "✅ Code cloned - commit: \$(git log --oneline -1)"

echo ""
echo "🔨 Step 2: Building backend image..."
docker build \
  -t eawlma-backend:latest \
  -f apps/backend/Dockerfile \
  --quiet \
  .
echo "✅ Backend image built"

echo ""
echo "🔨 Step 3: Building frontend image..."
docker build \
  -t eawlma-frontend:latest \
  -f apps/frontend/Dockerfile \
  --quiet \
  .
echo "✅ Frontend image built"

echo ""
echo "🔄 Step 4: Restarting containers..."
cd ~/eawlma-package
docker compose down
docker compose up -d
echo "✅ Containers started"

echo ""
echo "⏳ Step 5: Waiting for health check..."
sleep 20

echo ""
echo "🧹 Step 6: Deleting source code..."
rm -rf /tmp/eawlma-build
echo "✅ Source code deleted"

echo ""
echo "📊 Container status:"
docker compose ps

echo ""
echo "🎉 Deployment complete!"
echo "🌐 https://eawlma.com"
REMOTE
