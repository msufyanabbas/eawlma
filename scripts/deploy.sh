#!/bin/bash
set -e

SERVER_IP="3.139.74.95"
SERVER_USER="ubuntu"
PEM_FILE="$HOME/.ssh/eawlma-key.pem"
DEPLOY_DIR="~/eawlma-package"

echo "🚀 Starting deployment..."

# Step 1: Build backend
echo "📦 Building backend..."
npm run build:backend

# Step 2: Build frontend
echo "🎨 Building frontend..."
npm run build:frontend

# Step 3: Build Docker images
echo "🐳 Building Docker images..."
docker build -f apps/backend/Dockerfile -t eawlma-backend:latest .
docker build -f apps/frontend/Dockerfile -t eawlma-frontend:latest .

# Step 4: Export images
echo "💾 Exporting images..."
docker save eawlma-backend:latest eawlma-frontend:latest -o /tmp/images.tar

# Step 5: Split and upload
echo "📤 Uploading to server..."
split -b 50m /tmp/images.tar /tmp/img_part_

for part in /tmp/img_part_*; do
  filename=$(basename $part)
  echo "Uploading $filename..."
  scp -i $PEM_FILE -o ServerAliveInterval=30 \
    $part $SERVER_USER@$SERVER_IP:$DEPLOY_DIR/
done

# Step 6: Deploy on server
echo "🔄 Deploying on server..."
ssh -i $PEM_FILE $SERVER_USER@$SERVER_IP << 'ENDSSH'
  cd ~/eawlma-package

  # Reassemble images
  cat img_part_* > images.tar
  rm -f img_part_*

  # Load new images
  docker load -i images.tar

  # Restart containers
  docker compose down
  docker compose up -d

  # Check status
  docker compose ps

  echo "✅ Deployment complete!"
ENDSSH

# Cleanup
rm -f /tmp/images.tar /tmp/img_part_*

echo "✅ Deployment successful!"
echo "🌐 App running at http://$SERVER_IP"
