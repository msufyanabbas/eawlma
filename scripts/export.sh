#!/bin/bash
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

VERSION=$(node -e "console.log(require('./package.json').version)")
DATE=$(date +%Y%m%d)
PACKAGE_DIR="eawlma-package-v${VERSION}-${DATE}"

echo -e "${BLUE}Building Eawlma distribution package...${NC}"
echo ""

# Build images
echo -e "${BLUE}[1/4] Building backend image...${NC}"
docker-compose build backend

echo -e "${BLUE}[2/4] Building frontend image...${NC}"
docker-compose build frontend

# Create package directory
mkdir -p $PACKAGE_DIR

# Export images
echo -e "${BLUE}[3/4] Exporting Docker images...${NC}"
docker save eawlma-backend eawlma-frontend -o $PACKAGE_DIR/images.tar

# Copy files
echo -e "${BLUE}[4/4] Copying deployment files...${NC}"
cp docker-compose.yml $PACKAGE_DIR/
cp .env.example $PACKAGE_DIR/
cp install.bat $PACKAGE_DIR/
cp install.sh $PACKAGE_DIR/
cp DOCKER.md $PACKAGE_DIR/README.md
chmod +x $PACKAGE_DIR/install.sh

# Show result
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅  Package ready!                       ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                            ║${NC}"
echo -e "${GREEN}║  📦 Folder: ${PACKAGE_DIR}  ║${NC}"
echo -e "${GREEN}║  📏 Size: $(du -sh $PACKAGE_DIR | cut -f1)                          ║${NC}"
echo -e "${GREEN}║                                            ║${NC}"
echo -e "${GREEN}║  Send the entire folder to your client.   ║${NC}"
echo -e "${GREEN}║  They run: ./install.sh                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
