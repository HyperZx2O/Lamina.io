@echo off
setlocal
REM One-click start for Lamina frontend + backend (Windows)
REM If you see "Port 5173 is already in use", close the other server window first.
REM Ensure you have set CLAUDE_KEY in .env before using AI features.

cd /d "%~dp0"

if not exist ".env" (
  echo WARNING: .env not found. Copy .env.example to .env and set CLAUDE_KEY for AI features.
)

set PORT=5173

echo Installing dependencies (if needed)...
call npm install
if %errorlevel% neq 0 (
  echo npm install failed.
  pause
  exit /b %errorlevel%
)

echo Starting Lamina in DEV mode (Vite HMR, source files served)...
start "Lamina Server" cmd /k "npm run dev"
timeout /t 4 /nobreak >nul

REM Check if the port is actually listening now
netstat -ano -p TCP 2>nul | findstr ":5173 " | findstr LISTEN >nul
if errorlevel 1 (
  echo.
  echo WARNING: Port %PORT% does not appear to be listening yet.
  echo Another process may already be using it.
  echo Close other Lamina windows and try again.
  echo.
  pause
  exit /b 1
)

start "" "http://127.0.0.1:5173"

echo.
echo Lamina is running at http://127.0.0.1:%PORT%
echo Close this window to keep the server running in the other window.
endlocal
