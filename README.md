# Lamina

This project was created by Team Miu Miu for the AI Hackathon of The Infinity AI BuildFest 2026, hosted by BRAC University.

Lamina is a React + Vite education assistant with a local Node/Express proxy for Anthropic API requests. It includes an adaptive tutor, teacher copilot, multilingual tools, answer generation, and question generation in one interface.

## Overview

The app runs as a single local service that serves the frontend and forwards `/api/claude` requests to Anthropic. Your API key stays in `.env` and is never sent to the browser.

## Requirements

- Node.js 18 or newer
- An Anthropic API key

## Setup

1. Clone the repository.
2. Copy `.env.example` to `.env`.
3. Set `CLAUDE_KEY` in `.env`.
4. Optionally set `ANTHROPIC_MODEL=claude-sonnet-4-6` if you want to pin the model.
5. Run the project using the launcher for your operating system.

## Launchers by Operating System

### Windows

Double-click `start.bat`.

What it does:

- installs dependencies if needed
- starts the Node server
- opens the browser automatically

### Linux

Run `start.sh` from a terminal, or make it executable first:

```bash
chmod +x start.sh
./start.sh
```

### macOS

Run `start.command` by double-clicking it in Finder, or use Terminal:

```bash
chmod +x start.sh start.command
./start.command
```

## Manual Start

If you prefer manual commands on any OS:

```bash
npm install
npm start
```

The app will be available at `http://127.0.0.1:5173`.

## How It Works

- The frontend uses React and Vite.
- The backend is a local Express server in `server.js`.
- The frontend sends `{ system, user }` JSON to `/api/claude`.
- The backend forwards the request to Anthropic and returns the response JSON.

## Project Structure

- `src/App.jsx` - main user interface and feature prompts
- `src/main.jsx` - React entry point
- `server.js` - local API proxy and dev server
- `start.bat` - Windows launcher
- `start.sh` - Linux launcher
- `start.command` - macOS launcher
- `.env.example` - environment template for collaborators

## Environment Variables

Use `.env` for local secrets and machine-specific values.

```env
CLAUDE_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-sonnet-4-6
ANTHROPIC_MAX_OUTPUT_TOKENS=12000
PORT=5173
```

## Troubleshooting

- If the app says `.env` is missing, copy `.env.example` to `.env` and add your `CLAUDE_KEY`.
- If you get an invalid key or authentication error, verify that `CLAUDE_KEY` is correct and active in Anthropic.
- If port `5173` is already in use, stop the existing Lamina process or change `PORT` in `.env`.
- If the browser does not open automatically, open `http://127.0.0.1:5173` manually.

## File Permissions

- On Linux and macOS, the launch files may need executable permission before first use.
- Run `chmod +x start.sh start.command` once after cloning if double-click launch does not work.

