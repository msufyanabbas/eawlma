@echo off
echo Building Eawlma distribution package...
echo.

REM Build images
echo [1/4] Building backend image...
docker-compose build backend
if errorlevel 1 (
  echo ERROR: Backend build failed!
  pause
  exit /b 1
)

echo [2/4] Building frontend image...
docker-compose build frontend
if errorlevel 1 (
  echo ERROR: Frontend build failed!
  pause
  exit /b 1
)

REM Create package folder
set FOLDER=eawlma-package
if exist %FOLDER% rmdir /s /q %FOLDER%
mkdir %FOLDER%

REM Export images - save directly to package folder
echo [3/4] Exporting Docker images (this takes a few minutes)...
docker save eawlma-backend eawlma-frontend -o %FOLDER%\images.tar
if errorlevel 1 (
  echo ERROR: Image export failed!
  pause
  exit /b 1
)

REM Copy required files
echo [4/4] Copying deployment files...
copy docker-compose.client.yml %FOLDER%\docker-compose.yml
copy .env.example %FOLDER%\.env.example
copy install.bat %FOLDER%\install.bat
copy DOCKER.md %FOLDER%\README.md

echo.
echo ====================================
echo  Package ready in: %FOLDER%\
echo ====================================
echo.
echo Contents:
dir %FOLDER%
echo.
echo Zip this folder and send to your client.
echo They double-click install.bat to install.
echo.
pause
