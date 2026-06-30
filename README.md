# Lamina

This project was created by Team Miu Miu for the AI Hackathon of The Infinity AI BuildFest 2026, hosted by BRAC University.

Lamina is a bilingual, RAG-enabled education assistant with a local Node/Express proxy for Anthropic API requests and a TF-IDF retrieval engine grounded in NCTB curriculum data (Classes 6-10, 26 subjects). It includes an adaptive tutor, teacher copilot, multilingual tools, answer generation, and question generation in one interface.

It also includes a live `/docs` module that works as a YC-style pitch deck, technical whitepaper, and showcase page with server-controlled visibility and scheduled publishing.

## Team

**Miu Miu** — Built for **The Infinity AI Buildfest 2026**, hosted by BRAC University.

| Member | GitHub | Email |
|--------|--------|-------|
| MD. Sadman Saif Zarif | [@HyperZx2O](https://github.com/HyperZx2O) | [sadman.zarifsaif@gmail.com](mailto:sadman.zarifsaif@gmail.com) |
| Noha Saabreen | [@Nova-Supreme](https://github.com/Nova-Supreme) | [nohasaabreen@gmail.com](mailto:nohasaabreen@gmail.com) |
| Md Aryan Rahman | [@BananaKAke](https://github.com/BananaKAke) | [arianrahman305@gmail.com](mailto:arianrahman305@gmail.com) |
| Nusaiba Zafnah | [@Zafnah444](https://github.com/Zafnah444) | [nusaibazafnah.nz@gmail.com](mailto:nusaibazafnah.nz@gmail.com) |
| Mohtasiba Hossain | [@Lisfah](https://github.com/Lisfah) | [mohtasibahossain@gmail.com](mailto:mohtasibahossain@gmail.com) |
| Golam Muhammad Walid | [@Walidhello](https://github.com/Walidhello) | [walidnahyan@gmail.com](mailto:walidnahyan@gmail.com) |

## Overview

The app runs as a single Node service that serves the frontend, forwards `/api/claude` requests to Anthropic, and runs a TF-IDF RAG engine over NCTB curriculum data. Your API key stays in `.env` and is never sent to the browser.

## Requirements

- Node.js 18 or newer
- An Anthropic API key

## Setup

1. Clone the repository.
2. Copy `.env.example` to `.env`.
3. Set `CLAUDE_KEY` in `.env`.
4. Optionally set `ANTHROPIC_MODEL=claude-sonnet-4-6` if you want to pin the model.
5. Set `DOCS_ADMIN_KEY` if you want to use the docs editor and publish controls.
6. Run the project using the launcher for your operating system.

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

The app will be available at `http://127.0.0.1:5173` locally.

## Settings & Local API Key

- The app includes a **Settings** page (⚙️ tab) where you can optionally paste an Anthropic `CLAUDE_KEY` to use for requests from your browser. This key is stored in your browser's `localStorage` and used only for local requests — it is not uploaded anywhere.
- Alternatively, you can set `CLAUDE_KEY` in your server `.env` (recommended for single-user local installs). If both are present, the key entered in Settings will be sent with your browser requests and used for that request.

## Docs Route

- Open `http://127.0.0.1:5173/docs` to view the live documentation and pitch deck.
- The public docs page is always accessible to everyone.
- Use the admin panel on the docs page to edit sections, reorder them, and change visibility or schedule.
- Set `DOCS_ADMIN_KEY` in `.env` or in your Render environment variables to unlock publishing controls.

## How It Works

- The frontend uses React, Vite, Tailwind CSS, and KaTeX for math rendering.
- The backend is a local Express server in `server.js` with Anthropic proxy, RAG engine, and rate limiting.
- The frontend sends `{ system, user }` JSON to `/api/claude` (or uses `/api/rag/enrich` for curriculum-grounded prompts).
- The RAG engine indexes NCTB textbooks via TF-IDF and serves `/api/rag/status`, `/api/rag/query`, and `/api/rag/enrich`.
- The backend forwards requests to Anthropic and returns the response JSON.

## Cloud Deployment

Recommended host: Render.

1. Push the repository to GitHub.
2. In Render, create a new **Blueprint** from the repository so it uses the included `render.yaml`.
3. Set environment variables in Render:
	- `CLAUDE_KEY`
	- `ANTHROPIC_MODEL` if you want a fixed model
	- `ANTHROPIC_MAX_OUTPUT_TOKENS` if you want a custom token limit
	- `NODE_ENV=production`
	- `HOST=0.0.0.0`
4. Deploy the service and open the public URL Render gives you.

If you use a manual Render web service instead of the blueprint, set the build command to `npm install --include=dev && npm run build` and the start command to `npm start`.

## Project Structure

- `src/App.jsx` - main user interface and feature prompts
- `src/main.jsx` - React entry point
- `server.js` - API proxy, RAG engine, docs API, static server
- `docsDefaultState.cjs` - default docs/pitch deck content
- `docsCatalog.cjs` - feature catalog shared between server and docs
- `data/` - docs state JSON, NCTB curriculum data, study packs, and progress
- `scripts/` - build tools (study packs, icons)
- `public/` - static assets and PWA icons
- `offline.html` - offline study hub page
- `tokens.css` - design tokens
- `start.bat` - Windows launcher
- `start.sh` - Linux launcher
- `start.command` - macOS launcher
- `render.yaml` - Render blueprint for cloud deployment
- `tailwind.config.cjs` - Tailwind CSS configuration
- `postcss.config.cjs` - PostCSS configuration
- `vite.config.mjs` - Vite build configuration (PWA, KaTeX chunking)
- `.env.example` - environment template for collaborators

## Environment Variables

Use `.env` for local secrets and machine-specific values.

```env
CLAUDE_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-sonnet-4-6
ANTHROPIC_MAX_OUTPUT_TOKENS=12000
ANTHROPIC_API_VERSION=2023-06-01
PORT=5173
HOST=127.0.0.1
DOCS_ADMIN_KEY=your_docs_admin_key_here
DOCS_DEFAULT_START=2026-06-10T00:00:00
DOCS_DEFAULT_END=2026-06-14T23:59:00
API_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX=30
RAG_MIN_SCORE=0.08
```

## Offline mode & study packs

Lamina ships with a Progressive Web App shell so the catalogue, lessons, and
quizzes continue to work without a network connection. The runtime keeps four
stores in IndexedDB:

- `packs` — downloaded study packs (chapter content + flashcards + questions)
- `attempts` — quiz attempts the user finished offline
- `pendingAI` — queued `/api/claude` requests waiting for the network
- `meta` — settings, last-sync timestamp, and the saved-packs index

A new top-level page at `/offline` lists every pack the build script generated.
Each card has a **Save offline** action that fetches the pack from
`GET /api/packs/:id` and stores it in IndexedDB via Workbox's
`StaleWhileRevalidate` runtime cache. Tapping a saved card opens
`/offline/pack/:id`, which renders the lesson, flips through flashcards, and
launches the quiz at `/offline/pack/:id/quiz`. Quiz attempts are persisted to
IndexedDB first and synced via `POST /api/progress/sync` as soon as the device
reconnects.

### Generating study packs

```bash
npm run build:packs          # template-based, no API key needed
npm run build:packs -- --offline  # same as above
CLAUDE_KEY=... npm run build:packs  # enrich with Claude-generated questions
```

`scripts/build-study-packs.cjs` walks `data/nctb-curriculum/**` (skipping the
root `index.json` manifest), generates 5 MCQ + 2 short-answer questions per
chapter, and writes one JSON file per chapter into `data/study-packs/<class>/`.
The full chain is wired up as `npm run build:all`, which runs `build:packs`,
`build:icons`, then `vite build`.

### Generating app icons

```bash
npm run build:icons
```

`scripts/build-icons.cjs` generates the PWA icon set and favicons from a source
image. Run this after changing the app logo or before deployment.

### Smoke-testing the offline API

With the server running on `127.0.0.1:5173`:

```bash
curl -s http://127.0.0.1:5173/api/packs/list | jq '.packs | length'
curl -s http://127.0.0.1:5173/api/packs/class-6__bangla__1.1 | jq '.title'
curl -s -X POST http://127.0.0.1:5173/api/progress/sync \
  -H 'Content-Type: application/json' \
  -d '{"userId":"anon","attempts":[{"id":"t1","packId":"x","correctCount":1,"totalQuestions":1,"finishedAt":"2026-06-12T00:00:00Z"}]}'
curl -s 'http://127.0.0.1:5173/api/progress/summary?userId=anon' | jq
```

The first call should report the number of generated packs (currently 69
across all four class levels). The second should return a single pack with a
`title` field. The third should echo `{ok: true, accepted: 1}`. The fourth
should report `totalAttempts`, `accuracy`, and `streakDays` — `streakDays` is
computed using the `Asia/Dhaka` (UTC+06:00) day boundary so a quiz taken at
1 AM local time still counts as "today" in Bangladesh.

## Troubleshooting

- If the app says `.env` is missing, copy `.env.example` to `.env` and add your `CLAUDE_KEY`.
- If you get an invalid key or authentication error, verify that `CLAUDE_KEY` is correct and active in Anthropic.
- If port `5173` is already in use, stop the existing Lamina process or change `PORT` in `.env`.
- If a cloud host returns no traffic, verify that `HOST=0.0.0.0` is set and that the platform is using `npm install --include=dev && npm run build` before `npm start`.
- If the docs editor says unauthorized, confirm `DOCS_ADMIN_KEY` matches the value stored in the browser editor.
- If the browser does not open automatically, open `http://127.0.0.1:5173` manually.

## File Permissions

- On Linux and macOS, the launch files may need executable permission before first use.
- Run `chmod +x start.sh start.command` once after cloning if double-click launch does not work.

