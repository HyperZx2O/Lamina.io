# Lamina — AI Education Assistant for Bangladesh

Lamina is an AI-powered education assistant built for Bangladeshi secondary-school students (Class 6-10) studying the NCTB national curriculum. It delivers personalized lessons, generates answers and practice questions, and assists teachers — all grounded in the Bangladeshi NCTB national curriculum via RAG.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, PostCSS |
| **Backend** | Express.js 4 (Node — `server.js`) — runs the API + serves the Vite-built frontend |
| **AI** | Anthropic Claude API (Sonnet 4 / 3.5) — all AI responses flow through a server-side proxy |
| **Icons** | @heroicons/react 2.x (24-outline) |
| **Fonts** | DM Sans (UI), Crimson Pro (display/serif), Hind Siliguri (Bengali) — Google Fonts |
| **Math** | KaTeX (lazy-loaded via dynamic import — 258KB JS + 29KB CSS off critical path) |
| **Accessibility** | focus-trap-react for modals, ARIA attributes, skip-to-content link |
| **Styling** | Tailwind CSS with `cn()` utility (clsx + tailwind-merge) |
| **Package** | npm (package.json at root) |

---

## Architecture

### Frontend Routed by URL Pathname

`src/main.jsx` checks `window.location.pathname`:
- `/` or `/docs` → renders `DocsPage` (a standalone documentation/editor page)
- Everything else → renders `App` (the main tutor application)

There is no React Router — routing is done via simple pathname check at the root component level.

### App Shell (App.jsx)

The main app uses a **tab-based single-page interface**:

```
App
├── ErrorBoundary
├── MeshHero (decorative animated background, aria-hidden)
├── ProgressBar (3px loading bar with CSS animation)
├── Skip-to-content link
├── Header (sticky, with tab navigation + language toggle)
├── SettingsModal (overlay when settingsOpen === true)
├── History Modal (overlay when historyModal is set, shows past response)
├── Main content area
│   └── PanelCard (card wrapper with colored top stripe)
│       └── Active panel component (tutor | teacher | multi | answer | questions)
└── Sidebar (RecentActivity, slides in from right)
    └── RecentActivity component
```

### Server (server.js)

A single Express.js server handles:
1. **Serves the frontend** — in dev: Vite middleware; in prod: static `dist/` folder
2. **Anthropic Claude API proxy** (`POST /api/claude`) — protects API keys, handles model fallback chain
3. **RAG (NCTB textbook retrieval)** — endpoints at `/api/rag/*`
4. **Docs/data persistence** — CRUD for the live documentation page (`/api/docs/*`)

---

## Project Structure

```
lamina/
├── server.js                 # Express backend (API proxy, RAG, docs)
├── vite.config.mjs           # Vite config with KaTeX manualChunks
├── tailwind.config.cjs       # Tailwind theme (fonts, colors, sizes, shadows, animations)
├── postcss.config.cjs        # PostCSS (Tailwind + Autoprefixer)
├── index.html                # Entry HTML with font preloads
├── .env.example              # Environment variable template
├── PRODUCT.md                # Product context (register, users, brand)
├── docsCatalog.cjs           # Docs page feature catalog (CJS, used by server)
├── docsDefaultState.cjs      # Default state for the docs page
├── data/                     # Docs persist + NCTB curriculum JSON (RAG source)
│   ├── docs.json             # Saved docs state
│   ├── history/              # Docs edit history
│   └── nctb-curriculum/      # Chunked textbook JSON (class/subject/chapter structure)
└── src/
    ├── main.jsx              # Entry point — pathname-based routing
    ├── App.jsx               # Main app shell (tabs, history, settings, sidebar)
    ├── styles/
    │   └── index.css         # Global styles, CSS variables, glass classes, mesh animations
    ├── lib/
    │   ├── prompts.js        # Prompt builders for every feature (500 lines)
    │   ├── curriculum.js     # 26 NCTB subjects, example queries (EN/BN), RAG subject mapping
    │   ├── featureCatalog.js # Tab definitions (re-exports from .data.js)
    │   ├── featureCatalog.data.js # 5 feature definitions with colors and summaries
    │   ├── katexLoader.js    # Dynamic KaTeX import, math rendering, markdown -> HTML
    │   ├── ragEngine.js      # Node-side TF-IDF RAG engine (server-only via require)
    │   ├── langDetect.js     # Language detection (Bangla/Banglish/English)
    │   └── utils.js          # cn() utility (clsx + tailwind-merge)
    └── components/
        ├── Header.jsx        # Sticky header, tab nav, language EN/BN toggle, Docs link
        ├── PanelCard.jsx     # Card wrapper with top accent stripe
        ├── ResponseBox.jsx   # Response display with streaming, copy, regenerate, feedback
        ├── TutorPanel.jsx    # Adaptive Tutor: subject/level/topic + RAG toggle
        ├── TeacherPanel.jsx  # Teacher Copilot: lesson plan/quiz/rubric generation
        ├── MultiPanel.jsx    # Multilingual: translate/simplify with auto-detect
        ├── AnswerPanel.jsx   # Generate Answer: structured answers at 3 depth levels
        ├── QuestionsPanel.jsx # Suggest Questions: MCQs, short, problem, creative, mixed
        ├── SettingsPanel.jsx # API key + model override settings
        ├── SettingsModal.jsx # Modal wrapper for settings (FocusTrap, Escape close)
        ├── RecentActivity.jsx # Sidebar: study history, streak counter, clear action
        ├── UIHelpers.jsx     # Reusable: CardHeader, Field, Label, AutoTextarea, CustomDropdown
        ├── MeshHero.jsx      # Decorative animated mesh-gradient background
        ├── DocsPage.jsx      # Standalone live documentation page with editor
        └── docs/             # Docs page sub-components (editor.jsx, sections.jsx, ErrorBoundary.jsx)
```

---

## Features (5 Tabs)

Each tab is a distinct AI-powered tool, rendered conditionally via `panelMap` in App.jsx.

### 1. Adaptive Tutor (TutorPanel)
- **Subject dropdown** — 26 NCTB subjects (Physics through Career Ed.)
- **Learning level** — Beginner / Intermediate / Advanced
- **RAG toggle** — optional NCTB textbook retrieval via `/api/rag/enrich` endpoint
- **Follow-up mode** — continues conversation with history
- **Topic relevance guard** — Claude is prompted to reject off-topic questions
- Example queries per subject in both EN and BN

### 2. Teacher Copilot (TeacherPanel)
- Generates lesson plans, quizzes, or rubrics
- Three output types with distinct structured formats
- Bangladesh classroom-ready artefacts

### 3. Multilingual (MultiPanel)
- Auto-detect between English, Bangla, and Banglish
- Translate or Simplify modes
- Side-by-side view option
- Uses `langDetect.js` for detection and `prompts.js` for mode-specific prompts

### 4. Generate Answer (AnswerPanel)
- Three depth levels: Simple & Clear, Detailed (Class 10), Exam-Ready (SSC)
- Follow-up conversation support
- Structured output per level template

### 5. Suggest Questions (QuestionsPanel)
- Five question types: Mixed, MCQ, Short Answer, Problem Solving, Creative/Essay
- Configurable count (1-10)
- Output includes answer key + Bloom's taxonomy table

---

## Backend API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/claude` | POST | Claude API proxy. Accepts `system`, `user` in body. Optional `x-claude-key` header for per-request API key. Falls back through model candidates. |
| `/api/rag/status` | GET | RAG engine stats (loaded chunks, IDF terms) |
| `/api/rag/query` | POST | Search RAG index. Params: `query`, `topK`, `class`, `subject` |
| `/api/rag/enrich` | POST | Get RAG context enriched with system prompt. Params: `query`, `class`, `subject`, `system` |
| `/api/docs` | GET | Public docs page state + live snapshot |
| `/api/docs/admin` | GET | Admin docs state (requires `x-docs-admin-key`) |
| `/api/docs/admin` | POST | Save docs state |
| `/api/docs/history` | GET | Docs edit history |

### Server-side flow:
1. Client sends API request to `/api/claude` (not directly to Anthropic)
2. Server reads optional `x-claude-key` header or falls back to `CLAUDE_KEY` env var
3. Server tries model candidates in order (from env or hardcoded list)
4. Long-form content (lesson plans, rubrics) gets 8K max tokens; others get 12K
5. 3-minute upstream timeout, rate-limited at 30 req/min per client IP

---

## RAG Engine (ragEngine.js)

A pure-JS TF-IDF vector search engine running server-side:

- **Index**: Loads NCTB textbook chunks from `data/nctb-curriculum/` directory (nested JSON files organized by `class/subject/chapter.json`)
- **Tokenization**: case-insensitive, keeps Bangla Unicode (U+0980-U+09FF) characters
- **TF-IDF**: term frequency normalized by max frequency, inverse document frequency with smoothing
- **Similarity**: cosine similarity between query vector and chunk vectors
- **Filtering**: optional class and subject filters, minimum score threshold (default 0.08)
- **Context formatting**: produces structured source references with confidence scores

---

## Design System

### Brand
- **Register**: product (design serves the tool)
- **Personality**: Modern, Scholarly, Bold
- **Tone**: warm dark mode, approachable, academic but not stuffy
- **Anti-references**: No Blackboard/Moodle sterility, no gamified kids-app aesthetic
- **Scene**: a Bangladeshi student studying alone on a laptop at home in the evening

### Colors (tailwind.config.cjs + index.css CSS vars)

**Base grays** (warm-tinted toward brown):
- base-900: `#141110` (deepest background)
- base-700: `#1e1a18` (elevated surfaces)
- base-600: `#282422` (form inputs, secondary surfaces)
- base-500: `#343028` (borders)
- base-300: `#6b5e58` (muted text)
- base-200: `#9a8a82` (secondary text)
- base-50: `#ede0d8` (primary text)

**Accents** (warm, muted):
- sage: `#9cc4b2` — primary brand, tutor panel
- sage-light: `#b5d4c8` — teacher panel
- rose: `#c98ca7` — multilingual panel
- beige: `#d5bbb1` — answer panel
- coral: `#e76d83` — questions panel, CTAs
- blue: `#7da2f0` — info
- gold: `#f0c27a` — warnings

Each accent has a `-deep` variant (darker, for hover/pressed states).

**Semantic roles**: success (sage), info (blue), warning (gold), danger (terracotta `#e07a5f`).

### Typography
| Token | Size | Line Ht | Used For |
|-------|------|---------|----------|
| caption | 0.75rem (12px) | 1.25 | Labels, metadata |
| secondary | 0.875rem (14px) | 1.45 | Body text, descriptions |
| body | 1rem (16px) | 1.65 | Default body |
| subheading | 1.25rem | 1.3 | Section headers |
| heading | 1.5rem | 1.2 | Card titles |
| display | 2rem (32px) | 1.1 | Logo/brand |

Font families:
- `sans`: DM Sans (primary UI)
- `display`: Crimson Pro (serif, for headings and wordmarks)
- `bangla`: Hind Siliguri (Bengali text)
- System font stack as fallback

### Spacing
Uses Tailwind's default 4px scale. Max content width: 860px (responsive).

### Shadows
- `glass`: `0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)`
- `card`: `0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)`
- `glow`: `0 0 20px rgba(156,196,178,0.15)`

---

## Prompt Engineering (prompts.js)

Every prompt builder returns a system prompt string that drives Claude's behavior. They all follow a strict pattern:

1. **Head** — role definition ("You are Lamina, a Bangladesh-focused...")
2. **Role block** — structured metadata: subject, level, tone, domain, language hints
3. **Output template** — fixed order of sections (hook, core idea, step-by-step, etc.)
4. **Behaviour rules** — LaTeX for math, mermaid for diagrams, no direct exam answers
5. **Level rules** — vocabulary and depth adapted to beginner/intermediate/advanced
6. **HARDENED_TAIL** — 7 universal guardrails appended to every prompt (step-by-step reasoning, Bangladesh examples, no direct exam answers, language matching, prompt injection defense)

### Prompt builders:
- `buildTutorPrompt(bn, subject, level)` — full adaptive lesson
- `buildTeacherPrompt(bn, type)` — lesson plan / quiz / rubric (longest prompts, ~240 lines each)
- `buildMultiPrompt(mode)` — translate or simplify with strict format rules
- `buildAnswerPrompt(bn, level)` — structured answer at 3 depth levels
- `buildQuestionsPrompt(bn, qType, count)` — question set with answer key + Bloom's table

---

## State Management

No external state library. All state is local React state + localStorage persistence:

- **localStorage keys**: `lamina_lang`, `lamina_tab`, `lamina_api_key`, `lamina_model_override`, `lamina_history`, `lamina_streak`
- **History**: up to 10 recent entries per user, stored as full JSON
- **Streak**: tracks consecutive study days (resets after 1 missed day)
- **Stream speed preference**: not currently persisted (per-session only)
- Each panel manages its own input/output/history state independently
- `trackActivity` callback in App.jsx centralizes history + streak updates

---

## Key Interaction Patterns

### Language Toggle (EN/BN)
- `Header.jsx` — toggle button switches `lang` state in App.jsx
- Every component receives `bn` boolean prop
- Every user-facing string has both `en` and `bn` variants
- `langDetect.js` auto-detects input language for the Multilingual panel

### Streaming
- Not true streaming (no ReadableStream) — uses `setInterval` with sentence-splitting
- Controlled by `streamSpeed` slider in TutorPanel
- KaTeX dynamically loaded — fallback renders raw text until loaded

### Error handling
- `callAPI` in App.jsx returns bilingual error messages for network failures, rate limits, API errors
- Technical errors (TypeError, etc.) show generic bilingual fallback
- Each panel catches errors and shows them in the ResponseBox

### Accessibility
- Skip-to-content link (visible on focus)
- Focus-visible indicators (golden outline)
- ARIA labels on interactive elements (`aria-busy`, `aria-modal`, `aria-pressed`, `aria-live`)
- Focus traps in modals
- `prefers-reduced-motion` global kill switch (reduces all durations to 0.01ms)
- Safe-area viewport utilities for notched devices

---

## Configuration

### Environment Variables (.env)
```
CLAUDE_KEY=                    # Required — Anthropic API key
ANTHROPIC_MODEL=claude-sonnet-4-6  # Default model
ANTHROPIC_MAX_OUTPUT_TOKENS=12000
ANTHROPIC_API_VERSION=2023-06-01
PORT=5173
HOST=127.0.0.1
DOCS_ADMIN_KEY=                # For docs page admin access
API_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX=30
RAG_MIN_SCORE=0.08
```

### Running
```bash
npm install
# Create .env from .env.example with CLAUDE_KEY set
npm run dev       # Dev mode with Vite HMR (via server.js)
npm run build     # Production build
npm start         # Production server (build + serve)
```

---

## Visual Design Notes

- **Dark mode only** — warm base (#141110) with sage/rose/coral accents
- **No glassmorphism on main surfaces** — all cards use solid `bg-base-700 border border-base-500`
- **No gradient text** — brand colors are solid
- **Each tab gets its own accent color** (sage, sage-light, rose, beige, coral) used for the card top stripe, buttons, and highlights
- **Decorative background** — MeshHero provides subtle animated mesh blobs behind the content (CSS-only, GPU-accelerated)
- **Animations are purposeful** — fade-in on panel mount, progress bar on loading, skeleton on empty response state
