#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${BLUE}"
echo "  ███████╗ █████╗ ██╗    ██╗██╗     ███╗   ███╗ █████╗ "
echo "  ██╔════╝██╔══██╗██║    ██║██║     ████╗ ████║██╔══██╗"
echo "  █████╗  ███████║██║ █╗ ██║██║     ██╔████╔██║███████║"
echo "  ██╔══╝  ██╔══██║██║███╗██║██║     ██║╚██╔╝██║██╔══██║"
echo "  ███████╗██║  ██║╚███╔███╔╝███████╗██║ ╚═╝ ██║██║  ██║"
echo "  ╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝"
echo -e "${NC}"
echo "  Real Estate Platform — Installation"
echo "  ====================================="
echo ""

# Check Docker
echo -e "${BLUE}[1/4] Checking Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}ERROR: Docker is not installed!${NC}"
    echo "Please install Docker from https://docker.com"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}ERROR: Docker is not running!${NC}"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo -e "${GREEN}✓ Docker is ready${NC}"

# Load images
echo ""
echo -e "${BLUE}[2/4] Loading Docker images (this may take 2-3 minutes)...${NC}"
if [ ! -f "images.tar" ]; then
    echo -e "${RED}ERROR: images.tar not found!${NC}"
    echo "Make sure you have all files from the package."
    exit 1
fi

docker load < images.tar
echo -e "${GREEN}✓ Images loaded${NC}"

# Setup .env
echo ""
echo -e "${BLUE}[3/4] Setting up configuration...${NC}"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Configure your settings now${NC}"
    echo ""
    echo "Required settings to change in .env:"
    echo "  JWT_SECRET          - Random secret key (min 32 chars)"
    echo "  JWT_REFRESH_SECRET  - Another random secret key"
    echo ""
    echo "Optional (for full functionality):"
    echo "  AWS credentials     - For image uploads"
    echo "  MOYASAR keys        - For payments"
    echo ""

    # Generate random secrets automatically
    if command -v openssl &> /dev/null; then
        JWT_SECRET=$(openssl rand -hex 32)
        JWT_REFRESH=$(openssl rand -hex 32)
        sed -i "s/change_this_secret_in_production/$JWT_SECRET/" .env
        sed -i "s/change_this_refresh_secret/$JWT_REFRESH/" .env
        echo -e "${GREEN}✓ JWT secrets generated automatically${NC}"
    else
        echo -e "${YELLOW}Please edit .env and set JWT_SECRET and JWT_REFRESH_SECRET${NC}"
        read -p "Press Enter after editing .env to continue..."
    fi
else
    echo -e "${GREEN}✓ .env already exists${NC}"
fi

# Start platform
echo ""
echo -e "${BLUE}[4/4] Starting Eawlma platform...${NC}"
docker-compose up -d

# Wait for services
echo ""
echo -e "${BLUE}Waiting for services to start...${NC}"
sleep 5

# Check health
RETRIES=0
MAX_RETRIES=12
until curl -sf http://localhost:3010/api/v1/health > /dev/null 2>&1 || [ $RETRIES -eq $MAX_RETRIES ]; do
    echo -n "."
    sleep 5
    RETRIES=$((RETRIES+1))
done

echo ""
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅  Eawlma is ready!                 ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                        ║${NC}"
echo -e "${GREEN}║  🌐 Web App:  http://localhost         ║${NC}"
echo -e "${GREEN}║  🔌 API:      http://localhost:3010    ║${NC}"
echo -e "${GREEN}║                                        ║${NC}"
echo -e "${GREEN}║  👤 Admin:    admin@eawlma.sa          ║${NC}"
echo -e "${GREEN}║  🔑 Password: Admin123!                ║${NC}"
echo -e "${GREEN}║                                        ║${NC}"
echo -e "${GREEN}║  To stop:   docker-compose down        ║${NC}"
echo -e "${GREEN}║  Logs:      docker-compose logs -f     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# Open browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost
elif command -v open &> /dev/null; then
    open http://localhost
fi
