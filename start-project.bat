@echo off
chcp 65001 >nul
echo ===================================================
echo    Motorbike Project Launcher (Auto-Fix Mode)
echo ===================================================

echo [1/4] Stopping old Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
echo Done.

echo [2/4] Clearing Next.js cache (Safe Clean)...
if exist "frontend\.next" (
    rmdir /s /q "frontend\.next"
    echo Cache cleared.
) else (
    echo No cache found, skipping.
)

echo [3/4] Starting Backend Server...
start "Backend Server (Port 5001)" cmd /k "cd backend && node server.js"

echo Waiting 5 seconds for backend to initialize...
timeout /t 5 >nul

echo [4/4] Starting Frontend Server (Polling Mode)...
cd frontend
:: Enable Polling to fix OneDrive/Windows sync issues
set WATCHPACK_POLLING=true
start "Frontend Server (Port 3000)" cmd /k "npm run dev"

echo.
echo ===================================================
echo    System Started Successfully!
echo    - Backend: http://localhost:5001
echo    - Frontend: http://localhost:3000
echo ===================================================
echo.
pause
