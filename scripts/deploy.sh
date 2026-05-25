#!/bin/bash
set -e

SERVER="ubuntu@3.142.74.95"
KEY="$HOME/Downloads/eawlma-key.pem"
REMOTE_DIR="~/eawlma-package"
PACKAGE_DIR="$(cd "$(dirname "$0")/.." && pwd)/eawlma-package"
CHUNK_SIZE="100m"
MAX_RETRIES=5

SSH_OPTS="-i $KEY \
  -o ServerAliveInterval=10 \
  -o ServerAliveCountMax=30 \
  -o TCPKeepAlive=yes \
  -o ConnectTimeout=30 \
  -o StrictHostKeyChecking=no"

upload_with_retry() {
  local file=$1
  local remote_name=$2
  local attempt=1
  local local_size
  local_size=$(wc -c < "$file")

  while [ $attempt -le $MAX_RETRIES ]; do
    echo "   Attempt $attempt/$MAX_RETRIES: $remote_name"

    if scp $SSH_OPTS "$file" "$SERVER:$REMOTE_DIR/$remote_name"; then
      remote_size=$(ssh $SSH_OPTS "$SERVER" \
        "wc -c < $REMOTE_DIR/$remote_name" 2>/dev/null || echo "0")

      if [ "$remote_size" = "$local_size" ]; then
        echo "   ✅ Verified ($local_size bytes)"
        return 0
      else
        echo "   ⚠️  Size mismatch, removing..."
        ssh $SSH_OPTS "$SERVER" "rm -f $REMOTE_DIR/$remote_name" 2>/dev/null || true
      fi
    fi

    echo "   ❌ Failed, retrying in 5s..."
    sleep 5
    attempt=$((attempt + 1))
  done

  echo "   💥 Failed after $MAX_RETRIES attempts"
  return 1
}

echo "🚀 Starting deployment..."

echo "🐳 Building Docker images..."
cd "$(dirname "$0")/.."

docker build -t eawlma-backend:latest \
  -f apps/backend/Dockerfile . \
  --platform linux/amd64

docker build -t eawlma-frontend:latest \
  -f apps/frontend/Dockerfile . \
  --platform linux/amd64

echo "💾 Saving images..."
docker save eawlma-backend:latest eawlma-frontend:latest \
  -o "$PACKAGE_DIR/images.tar"

echo "🗜️  Compressing..."
gzip -f "$PACKAGE_DIR/images.tar"

SIZE=$(du -sh "$PACKAGE_DIR/images.tar.gz" | cut -f1)
echo "📦 Package size: $SIZE"

echo "✂️  Splitting into ${CHUNK_SIZE} chunks..."
rm -f "$PACKAGE_DIR"/chunk_*
split -b $CHUNK_SIZE \
  "$PACKAGE_DIR/images.tar.gz" \
  "$PACKAGE_DIR/chunk_"

CHUNKS=$(ls "$PACKAGE_DIR"/chunk_* | wc -l)
echo "   $CHUNKS chunks to upload"

echo "🧹 Cleaning server..."
ssh $SSH_OPTS "$SERVER" \
  "mkdir -p $REMOTE_DIR && rm -f $REMOTE_DIR/chunk_* $REMOTE_DIR/images.tar.gz" \
  2>/dev/null || true
echo "   ✅ Server ready"

echo "📤 Uploading chunks..."
CURRENT=0
for chunk in "$PACKAGE_DIR"/chunk_*; do
  CURRENT=$((CURRENT + 1))
  CHUNK_NAME=$(basename "$chunk")
  echo "   📦 Chunk $CURRENT/$CHUNKS: $CHUNK_NAME"
  upload_with_retry "$chunk" "$CHUNK_NAME"
done

echo "📤 Uploading docker-compose.yml..."
upload_with_retry "$PACKAGE_DIR/docker-compose.yml" "docker-compose.yml"

echo "🚀 Deploying on server..."
ssh $SSH_OPTS "$SERVER" << 'ENDSSH'
  set -e
  cd ~/eawlma-package

  echo "🔧 Reassembling chunks..."
  cat chunk_* > images.tar.gz
  rm -f chunk_*

  echo "📦 Loading Docker images..."
  gunzip -c images.tar.gz | docker load
  rm -f images.tar.gz

  echo "🛑 Stopping containers..."
  docker compose down

  echo "▶️  Starting containers..."
  docker compose up -d

  sleep 15
  echo "✅ Done!"
  docker compose ps
ENDSSH

rm -f "$PACKAGE_DIR"/chunk_*

echo ""
echo "🎉 Deployment successful!"
echo "🌐 https://eawlma.com"
