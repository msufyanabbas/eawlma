@echo off
echo Building Eawlma distribution package...
echo.

REM Build images
echo [1/4] Building backend image...
docker-compose build backend

echo [2/4] Building frontend image...
docker-compose build frontend

REM Create package folder
set FOLDER=eawlma-package
mkdir %FOLDER% 2>nul

REM Export images
echo [3/4] Exporting Docker images...
docker save eawlma-backend eawlma-frontend -o %FOLDER%\images.tar

REM Copy required files
echo [4/4] Copying deployment files...
copy docker-compose.yml %FOLDER%\
copy .env.example %FOLDER%\
copy install.bat %FOLDER%\
copy DOCKER.md %FOLDER%\README.md

echo.
echo ✅ Package ready in: %FOLDER%\
echo.
echo Send the entire '%FOLDER%' folder to your client.
echo They just run install.bat
echo.
pause
