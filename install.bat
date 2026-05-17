@echo off
echo.
echo  ███████╗ █████╗ ██╗    ██╗██╗     ███╗   ███╗ █████╗
echo  ██╔════╝██╔══██╗██║    ██║██║     ████╗ ████║██╔══██╗
echo  █████╗  ███████║██║ █╗ ██║██║     ██╔████╔██║███████║
echo  ██╔══╝  ██╔══██║██║███╗██║██║     ██║╚██╔╝██║██╔══██║
echo  ███████╗██║  ██║╚███╔███╔╝███████╗██║ ╚═╝ ██║██║  ██║
echo  ╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝
echo.
echo  Real Estate Platform - Installation
echo  =====================================
echo.

REM Check Docker
docker --version > nul 2>&1
if errorlevel 1 (
  echo ERROR: Docker is not installed!
  echo Please install Docker Desktop from https://docker.com
  pause
  exit /b 1
)

echo [1/4] Loading Docker images...
if not exist images.tar (
  echo ERROR: images.tar not found!
  echo Make sure you have all package files.
  pause
  exit /b 1
)
docker load -i images.tar
if errorlevel 1 (
  echo ERROR: Failed to load images!
  pause
  exit /b 1
)

echo.
echo [2/4] Stopping any existing containers...
docker-compose down --remove-orphans 2>nul
echo Done.

echo.
echo [3/4] Setting up configuration...
if not exist .env (
  copy .env.example .env
  echo.
  echo IMPORTANT: Please edit .env file now!
  echo Open .env and set JWT_SECRET and JWT_REFRESH_SECRET
  echo.
  notepad .env
  echo.
  echo Press any key after saving .env to continue...
  pause > nul
)

echo.
echo [4/4] Starting Eawlma platform...
docker-compose up -d
if errorlevel 1 (
  echo ERROR: Failed to start platform!
  echo Run: docker-compose logs
  pause
  exit /b 1
)

echo.
echo Waiting for services to start...
timeout /t 10 /nobreak > nul

echo.
echo ============================================
echo  Eawlma is now running!
echo ============================================
echo.
echo  Web App:  http://localhost
echo  API:      http://localhost:3010
echo.
echo  Admin:    admin@eawlma.sa / Admin123!
echo  Agent:    agent1@eawlma.sa / Agent123!
echo.
echo  To stop:  docker-compose down
echo  Logs:     docker-compose logs -f
echo ============================================
echo.

REM Open browser
start http://localhost
pause
