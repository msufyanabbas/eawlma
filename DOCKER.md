# Eawlma Platform — Installation Guide

## Requirements
- Docker Desktop installed
- 4GB RAM minimum
- 10GB free disk space

## Windows Installation
1. Double-click `install.bat`
2. Edit `.env` when prompted
3. Wait for startup (~2 minutes)
4. Open http://localhost

## Mac/Linux Installation
```bash
chmod +x install.sh
./install.sh
```

## Manual Installation
```bash
# 1. Load images
docker load < images.tar.gz

# 2. Setup config
cp .env.example .env
# Edit .env - set JWT_SECRET and JWT_REFRESH_SECRET

# 3. Start
docker-compose up -d

# 4. Open http://localhost
```

## Default Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@eawlma.sa | Admin123! |
| Agent | agent1@eawlma.sa | Agent123! |
| Buyer | buyer1@eawlma.sa | Buyer123! |

## Useful Commands
```bash
# Stop
docker-compose down

# Restart
docker-compose restart

# View logs
docker-compose logs -f

# View backend logs only
docker-compose logs -f backend
```

## URLs
- Web App: http://localhost
- API: http://localhost:3010/api/v1
- API Docs: http://localhost:3010/api/docs

## Support
Contact: support@eawlma.sa
