#!/bin/bash
set -e

SERVER="ubuntu@3.142.74.95"
KEY="$HOME/Downloads/eawlma-key.pem"
REMOTE_DIR="~/eawlma-package"
PACKAGE_DIR="$(dirname "$0")/../eawlma-package"

echo "🔨 Step 1: Building Docker images..."
cd "$(dirname "$0")/.."

docker build -t eawlma-backend:latest \
  -f apps/backend/Dockerfile . \
  --platform linux/amd64

docker build -t eawlma-frontend:latest \
  -f apps/frontend/Dockerfile . \
  --platform linux/amd64

echo "💾 Step 2: Saving images..."
docker save eawlma-backend:latest eawlma-frontend:latest \
  -o "$PACKAGE_DIR/images.tar"

echo "🗜️  Step 3: Compressing..."
gzip -f "$PACKAGE_DIR/images.tar"

# Get file size
SIZE=$(du -sh "$PACKAGE_DIR/images.tar.gz" | cut -f1)
echo "📦 Package size: $SIZE"

echo "📤 Step 4: Uploading (this may take a while)..."

# Split into 200MB chunks for reliable transfer
echo "   Splitting into chunks..."
split -b 200m \
  "$PACKAGE_DIR/images.tar.gz" \
  "$PACKAGE_DIR/chunk_"

# Count chunks
CHUNKS=$(ls "$PACKAGE_DIR"/chunk_* | wc -l)
echo "   $CHUNKS chunks to upload"

# Upload each chunk with keep-alive
CURRENT=0
for chunk in "$PACKAGE_DIR"/chunk_*; do
  CURRENT=$((CURRENT + 1))
  CHUNK_NAME=$(basename "$chunk")
  echo "   Uploading chunk $CURRENT/$CHUNKS: $CHUNK_NAME"

  scp \
    -i "$KEY" \
    -o "ServerAliveInterval=30" \
    -o "ServerAliveCountMax=20" \
    -o "TCPKeepAlive=yes" \
    -o "ConnectTimeout=60" \
    -o "StrictHostKeyChecking=no" \
    "$chunk" \
    "$SERVER:$REMOTE_DIR/$CHUNK_NAME"

  echo "   ✅ Chunk $CURRENT/$CHUNKS uploaded"
done

echo "📤 Uploading docker-compose.yml..."
scp \
  -i "$KEY" \
  -o "ServerAliveInterval=30" \
  -o "ServerAliveCountMax=20" \
  "$PACKAGE_DIR/docker-compose.yml" \
  "$SERVER:$REMOTE_DIR/docker-compose.yml"

echo "🚀 Step 5: Deploying on server..."
ssh \
  -i "$KEY" \
  -o "ServerAliveInterval=30" \
  -o "ServerAliveCountMax=20" \
  -o "TCPKeepAlive=yes" \
  "$SERVER" << 'ENDSSH'

  set -e
  cd ~/eawlma-package

  echo "🔧 Reassembling image..."
  cat chunk_* > images.tar.gz
  rm -f chunk_*

  echo "📦 Loading Docker images (this takes a few minutes)..."
  gunzip -c images.tar.gz | docker load
  rm -f images.tar.gz

  echo "🛑 Stopping old containers..."
  docker compose down

  echo "▶️  Starting new containers..."
  docker compose up -d

  echo "⏳ Waiting for services..."
  sleep 10

  echo "✅ Deployment complete!"
  docker compose ps

ENDSSH

# Cleanup local chunks
echo "🧹 Cleaning up local chunks..."
rm -f "$PACKAGE_DIR"/chunk_*

echo ""
echo "🎉 Deployment successful!"
echo "🌐 Visit: https://eawlma.com"
