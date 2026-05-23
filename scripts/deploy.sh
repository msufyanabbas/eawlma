#!/bin/bash
set -e

SERVER="ubuntu@3.142.74.95"
KEY="$HOME/Downloads/eawlma-key.pem"
REMOTE_DIR="~/eawlma-package"
PACKAGE_DIR="$(dirname "$0")/../eawlma-package"
CHUNK_SIZE="100m"  # Smaller chunks = less to re-upload on failure
MAX_RETRIES=5

# SSH options for stability
SSH_OPTS="-i $KEY \
  -o ServerAliveInterval=10 \
  -o ServerAliveCountMax=30 \
  -o TCPKeepAlive=yes \
  -o ConnectTimeout=30 \
  -o StrictHostKeyChecking=no"

# Upload with retry function
upload_with_retry() {
  local file=$1
  local remote_path=$2
  local attempt=1

  while [ $attempt -le $MAX_RETRIES ]; do
    echo "   Attempt $attempt/$MAX_RETRIES: $(basename $file)"

    if scp $SSH_OPTS \
      -o "IPQoS=throughput" \
      "$file" \
      "$SERVER:$remote_path"; then
      echo "   ✅ Success!"
      return 0
    fi

    echo "   ❌ Failed, waiting 5s before retry..."
    sleep 5
    attempt=$((attempt + 1))
  done

  echo "   💥 Failed after $MAX_RETRIES attempts"
  return 1
}

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

SIZE=$(du -sh "$PACKAGE_DIR/images.tar.gz" | cut -f1)
echo "📦 Package size: $SIZE"

echo "✂️  Step 4: Splitting into ${CHUNK_SIZE} chunks..."
rm -f "$PACKAGE_DIR"/chunk_*
split -b $CHUNK_SIZE \
  "$PACKAGE_DIR/images.tar.gz" \
  "$PACKAGE_DIR/chunk_"

CHUNKS=$(ls "$PACKAGE_DIR"/chunk_* | wc -l)
echo "   $CHUNKS chunks to upload"

echo "🧹 Cleaning old chunks from server..."
ssh $SSH_OPTS "$SERVER" \
  "rm -f $REMOTE_DIR/chunk_* $REMOTE_DIR/images.tar.gz" 2>/dev/null || true
echo "   ✅ Server cleaned"

echo "📤 Step 5: Uploading chunks with auto-retry..."
CURRENT=0
for chunk in "$PACKAGE_DIR"/chunk_*; do
  CURRENT=$((CURRENT + 1))
  CHUNK_NAME=$(basename "$chunk")
  echo "   📦 Uploading $CURRENT/$CHUNKS: $CHUNK_NAME"
  upload_with_retry "$chunk" "$REMOTE_DIR/$CHUNK_NAME"
done

echo "📤 Uploading docker-compose.yml..."
upload_with_retry \
  "$PACKAGE_DIR/docker-compose.yml" \
  "$REMOTE_DIR/docker-compose.yml"

echo "🚀 Step 6: Deploying on server..."
ssh $SSH_OPTS "$SERVER" << 'ENDSSH'
  set -e
  cd ~/eawlma-package

  echo "🔧 Reassembling chunks..."
  cat chunk_* > images.tar.gz
  rm -f chunk_*

  echo "📦 Loading Docker images..."
  gunzip -c images.tar.gz | docker load
  rm -f images.tar.gz

  echo "🛑 Stopping old containers..."
  docker compose down

  echo "▶️  Starting containers..."
  docker compose up -d

  sleep 10
  echo "✅ Done!"
  docker compose ps
ENDSSH

# Cleanup local chunks
rm -f "$PACKAGE_DIR"/chunk_*

echo ""
echo "🎉 Deployment successful!"
echo "🌐 https://eawlma.com"
