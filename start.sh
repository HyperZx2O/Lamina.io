#!/usr/bin/env bash
set -euo pipefail

# One-click start for Lamina frontend + backend (Linux/macOS)
# Copy .env.example to .env and set CLAUDE_KEY before running.

cd "$(dirname "$0")"

if [ ! -f ".env" ]; then
  echo "ERROR: .env not found. Copy .env.example to .env and set CLAUDE_KEY."
  exit 1
fi

export PORT=5173

echo "Installing dependencies (if needed)..."
npm install

echo "Starting Lamina one-click server..."
npm start > /tmp/lamina-server.log 2>&1 &
SERVER_PID=$!

sleep 2

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://127.0.0.1:5173" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "http://127.0.0.1:5173" >/dev/null 2>&1 || true
fi

echo
echo "The server is starting in the background."
echo "If your browser did not open, go to http://127.0.0.1:5173"
echo "Server PID: ${SERVER_PID}"