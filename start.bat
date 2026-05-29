@echo off
setlocal
REM One-click start for Lamina frontend + backend (Windows)
REM Ensure you have copied .env.example to .env and set CLAUDE_KEY before running.

cd /d "%~dp0"

if not exist ".env" (
  echo ERROR: .env not found. Copy .env.example to .env and set CLAUDE_KEY.
  pause
  exit /b 1
)

set PORT=5173

echo Installing dependencies (if needed)...
call npm install
if %errorlevel% neq 0 (
  echo npm install failed.
  pause
  exit /b %errorlevel%
)

echo Starting Lamina one-click server...
start "Lamina Server" cmd /k "npm start"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5173"

echo.
echo The server is starting in a separate window.
echo If your browser did not open, go to http://127.0.0.1:5173
pause

endlocal
