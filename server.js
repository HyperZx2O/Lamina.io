require('dotenv').config();
const fs = require('fs');
const { execSync } = require('child_process');
const https = require('https');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());
// Security headers
app.use(helmet());

const DOCS_DATA_DIR = path.resolve(__dirname, 'data');
const DOCS_DATA_FILE = path.join(DOCS_DATA_DIR, 'docs.json');
const DOCS_HISTORY_DIR = path.join(DOCS_DATA_DIR, 'history');
const DOCS_ADMIN_KEY = process.env.DOCS_ADMIN_KEY || (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production' ? 'lamina-docs-dev' : '');
const { featureRowsFromTabs, APP_FEATURES } = require('./docsCatalog.cjs');
const PACKAGE_JSON = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

function ensureDocsStorage() {
  fs.mkdirSync(DOCS_DATA_DIR, { recursive: true });
  fs.mkdirSync(DOCS_HISTORY_DIR, { recursive: true });
}

function createDefaultDocsState() {
  const teamMembers = [
    { name: 'MD. Sadman Saif', role: 'Project Lead', email: 'sadman@lamina.app', avatar: '' },
    { name: 'Nusaiba Zafnah', role: 'Product / UX', email: 'nusaiba@lamina.app', avatar: '' },
    { name: 'Md Aryan Rahman', role: 'Full-stack Engineer', email: 'aryan@lamina.app', avatar: '' },
    { name: 'Mohtasiba Hossain', role: 'AI / Content', email: 'mohtasiba@lamina.app', avatar: '' },
    { name: 'Noha Saabreen', role: 'Research / QA', email: 'noha@lamina.app', avatar: '' },
    { name: 'Golam Muhammad Walid', role: 'Systems / DevOps', email: 'walid@lamina.app', avatar: '' },
  ];

  return {
    meta: {
      title: 'Lamina Docs',
      subtitle: 'Pitch deck, technical reference, and live system view',
      teamName: 'Team Miu Miu',
      version: '0.1.0',
      updatedAt: new Date().toISOString(),
    },
    publish: {
      enabled: true,
      mode: 'window',
      timezone: 'local',
      window: {
        startDate: '2026-06-10',
        startTime: '00:00',
        endDate: '2026-06-14',
        endTime: '23:59',
      },
      durationMinutes: 5760,
      note: 'Default judging window',
    },
    sections: [
      {
        slug: 'problem',
        kind: 'text',
        eyebrow: 'YC pitch deck',
        title: 'Problem',
        summary: 'Students and teachers still juggle fragmented tools, languages, and explanations when they want one coherent learning flow.',
        body: [
          'Learners need an assistant that can adapt to subject, level, and language without forcing them to leave the task they are already doing.',
          'Teachers need a fast way to generate answers, questions, and lesson support that feels aligned with the classroom instead of generic AI output.',
        ],
        bullets: [
          'Single-purpose tools increase cognitive load.',
          'Bangladesh-centric and bilingual learning support is still underserved.',
          'Students lose momentum when the interface and the tutor split into separate products.',
        ],
      },
      {
        slug: 'solution',
        kind: 'text',
        eyebrow: 'YC pitch deck',
        title: 'Solution',
        summary: 'Lamina brings tutoring, teacher support, multilingual conversion, answer generation, and question generation into one focused workspace.',
        body: [
          'The product keeps the experience narrow enough to stay usable, but deep enough to support real academic work.',
        ],
        bullets: [
          'Adaptive tutor mode for student-facing guidance.',
          'Teacher copilot for lesson planning and classroom support.',
          'Multilingual tools that preserve meaning across English and Bangla.',
        ],
      },
      {
        slug: 'why-now',
        kind: 'text',
        eyebrow: 'YC pitch deck',
        title: 'Why now',
        summary: 'AI is becoming part of the everyday study workflow, but most tools still optimize for generic productivity rather than learning outcomes.',
        body: [
          'A judge or investor should be able to see that the market is ready, the user habit is emerging, and the product can claim a local advantage now rather than later.',
        ],
        bullets: [
          'LLMs are finally good enough for classroom-scale support.',
          'Users expect conversational interfaces, not static FAQ bots.',
          'Local language support is becoming a differentiator rather than a nice-to-have.',
        ],
      },
      {
        slug: 'product-demo',
        kind: 'text',
        eyebrow: 'YC pitch deck',
        title: 'Product demo',
        summary: 'The live app demonstrates the current feature set in a single navigation shell.',
        body: [
          'The same platform can switch between tutor, teacher, multilingual, answer, and question workflows without changing products or losing context.',
        ],
        bullets: [
          'One shell, five workflows.',
          'Persistent settings for local API access.',
          'Math rendering for technical and academic explanations.',
        ],
      },
      {
        slug: 'market-opportunity',
        kind: 'text',
        eyebrow: 'YC pitch deck',
        title: 'Market opportunity',
        summary: 'The immediate wedge is students and teachers who want an intelligent study companion with a local language advantage.',
        bullets: [
          'Primary users: students, teachers, and small learning centers.',
          'Secondary users: creators and support teams who need structured educational content.',
        ],
      },
      {
        slug: 'business-model',
        kind: 'text',
        eyebrow: 'YC pitch deck',
        title: 'Business model',
        summary: 'The product can support freemium access, school licensing, and premium assistant workflows.',
        bullets: [
          'Free core assistant for discovery and adoption.',
          'Premium plans for higher volume, school dashboards, and publishing controls.',
          'Institutional licensing for classroom or team deployments.',
        ],
      },
      {
        slug: 'traction',
        kind: 'text',
        eyebrow: 'YC pitch deck',
        title: 'Traction',
        summary: 'This build already ships as a polished working prototype with multiple AI-assisted workflows and deployment wiring.',
        bullets: [
          'React + Node app is operational.',
          'Anthropic proxy and local settings flow are already live.',
          'Build and deploy configuration is present for Render.',
        ],
      },
      {
        slug: 'competition',
        kind: 'text',
        eyebrow: 'YC pitch deck',
        title: 'Competition',
        summary: 'Most competitors either offer generic AI chat or single-purpose education tools.',
        bullets: [
          'Generic AI chat lacks learning-specific UX.',
          'Note-taking or quiz generators do not close the loop between teacher and student workflows.',
          'Lamina differentiates through a more complete education operating surface.',
        ],
      },
      {
        slug: 'unique-advantage',
        kind: 'text',
        eyebrow: 'YC pitch deck',
        title: 'Unique advantage',
        summary: 'The combination of bilingual support, education-specific flows, and a presentation layer that can become a live pitch deck is the moat.',
        bullets: [
          'Bangladesh-first language and learning context.',
          'One workflow surface for students and teachers.',
          'A docs system that can be shown to judges, investors, or collaborators without rebuilds.',
        ],
      },
      {
        slug: 'go-to-market',
        kind: 'text',
        eyebrow: 'YC pitch deck',
        title: 'Go-to-market',
        summary: 'The fastest path is a showcase-led launch with students, educators, and competition judges as the first audience.',
        bullets: [
          'Use demo loops and showcase windows to drive adoption.',
          'Seed with teacher and student communities before institutional rollout.',
          'Turn the docs page into a shareable proof point.',
        ],
      },
      {
        slug: 'team',
        kind: 'team',
        eyebrow: 'YC pitch deck',
        title: 'Team',
        summary: 'The team section doubles as a showcase card grid with consistent profile handling.',
        teamName: 'Lamina',
        members: teamMembers,
      },
      {
        slug: 'vision',
        kind: 'text',
        eyebrow: 'YC pitch deck',
        title: 'Vision',
        summary: 'Lamina should become the default academic companion for students and teachers who want trustworthy help, not just fast answers.',
        bullets: [
          'A learning assistant that respects context.',
          'A docs system that can evolve into a live investor or judging deck.',
          'A product surface that stays useful after the demo ends.',
        ],
      },
      {
        slug: 'product-overview',
        kind: 'text',
        eyebrow: 'Product overview',
        title: 'What it does',
        summary: 'Lamina is a React + Node education assistant with a multi-panel interface for different learning tasks.',
        bullets: [
          'Supports adaptive tutoring, teaching support, multilingual conversion, answer generation, and question creation.',
          'Targets students, teachers, and small education teams.',
          'Keeps settings and API access local to the user unless the server is configured otherwise.',
        ],
      },
      {
        slug: 'feature-matrix',
        kind: 'matrix',
        eyebrow: 'Live synced',
        title: 'Feature matrix',
        summary: 'Current product capabilities are mapped against future work and planned expansion.',
        items: featureRowsFromTabs(APP_FEATURES).concat([
          { name: 'Docs / Pitch Deck', status: 'current', note: 'This module.' },
          { name: 'Admin Publishing Controls', status: 'upcoming', note: 'Scheduled visibility and editing are being added.' },
          { name: 'Users / Teams Sync', status: 'planned', note: 'Broader live sync adapters will follow.' },
        ]),
      },
      {
        slug: 'architecture',
        kind: 'diagram',
        eyebrow: 'Technical docs',
        title: 'Architecture diagram',
        summary: 'UI, API, services, and persisted docs state are separated so the docs system can stay live and controlled.',
        diagram: {
          nodes: [
            'UI shell',
            'Docs API',
            'Docs state file',
            'Anthropic proxy',
            'Admin controls',
          ],
        },
      },
      {
        slug: 'data-flow',
        kind: 'diagram',
        eyebrow: 'Technical docs',
        title: 'Data flow diagram',
        summary: 'Input, processing, AI, output, and feedback are treated as a single loop.',
        diagram: {
          nodes: [
            'Input',
            'Processing',
            'AI layer',
            'Output',
            'Feedback loop',
          ],
        },
      },
      {
        slug: 'technology-stack',
        kind: 'stack',
        eyebrow: 'Technical docs',
        title: 'Technology stack',
        summary: 'The current implementation is intentionally lightweight and easy to deploy.',
        items: [
          { label: 'Frontend', value: 'React 18, Vite, Framer Motion' },
          { label: 'Backend', value: 'Node.js, Express, Anthropic proxy' },
          { label: 'Styling', value: 'Tailwind, custom CSS variables, inline system styles' },
          { label: 'Deployment', value: 'Render blueprint and Node service' },
          { label: 'Docs store', value: 'Repo-local JSON file' },
        ],
      },
      {
        slug: 'api-documentation',
        kind: 'api',
        eyebrow: 'Technical docs',
        title: 'API documentation',
        summary: 'The docs module exposes public and admin endpoints for reading and publishing content.',
        endpoints: [
          { method: 'GET', path: '/api/docs', auth: 'public', description: 'Returns public docs state and access metadata.' },
          { method: 'GET', path: '/api/docs/admin', auth: 'admin key', description: 'Returns full docs content for the editor.' },
          { method: 'POST', path: '/api/docs/admin', auth: 'admin key', description: 'Saves docs edits, schedule, and publish state.' },
          { method: 'POST', path: '/api/claude', auth: 'API key header', description: 'Existing Anthropic proxy used by the core app.' },
        ],
      },
      {
        slug: 'data-layer',
        kind: 'text',
        eyebrow: 'Technical docs',
        title: 'Data layer',
        summary: 'The docs content is file-backed, versioned, and suitable for scheduled publishing.',
        bullets: [
          'Current source of truth lives in a repo-local JSON file.',
          'Version snapshots are written on publish edits.',
          'The live snapshot can be rehydrated from the server on load.',
        ],
      },
      {
        slug: 'ai-layer',
        kind: 'text',
        eyebrow: 'Technical docs',
        title: 'AI layer',
        summary: 'The app uses Anthropic-backed request handling and can grow into RAG or GraphRAG later.',
        bullets: [
          'Prompt builders are already separated by workflow.',
          'The docs layer can describe model choice, reasoning, and explanation strategy.',
          'Future personalization hooks can sit beside the existing API proxy.',
        ],
      },
      {
        slug: 'roadmap',
        kind: 'roadmap',
        eyebrow: 'Technical docs',
        title: 'Product roadmap',
        summary: 'Near, mid, and long-term work stays visible to judges and collaborators.',
        phases: [
          { label: 'Short term', items: ['Ship /docs access control', 'Add draft and publish editing', 'Polish export and share flows'] },
          { label: 'Mid term', items: ['Introduce richer live sync adapters', 'Add team and user data sources', 'Add section plugins'] },
          { label: 'Long term', items: ['Move to stronger versioning', 'Add PDF export pipeline', 'Support multi-workspace showcase pages'] },
        ],
      },
      {
        slug: 'performance',
        kind: 'metrics',
        eyebrow: 'Technical docs',
        title: 'Performance and scalability',
        summary: 'The docs page should stay fast even when the content gets deep.',
        metrics: [
          { label: 'Load strategy', value: 'Lazy load heavy sections and diagrams' },
          { label: 'Cache strategy', value: 'Reuse fetched docs state until saved or refreshed' },
          { label: 'Rendering', value: 'Section-based, anchor-first navigation' },
        ],
      },
      {
        slug: 'security',
        kind: 'metrics',
        eyebrow: 'Technical docs',
        title: 'Security',
        summary: 'Visibility and edits are controlled by server-side checks, not client-only toggles.',
        metrics: [
          { label: 'Access control', value: 'Admin key required for edit routes' },
          { label: 'Data protection', value: 'No docs edit writes without validation' },
          { label: 'Publish window', value: 'Default schedule can be overridden by admins' },
        ],
      },
      {
        slug: 'analytics',
        kind: 'metrics',
        eyebrow: 'Technical docs',
        title: 'Analytics',
        summary: 'The docs page can report the usage signals that matter for judging and launch.',
        metrics: [
          { label: 'Primary KPI', value: 'Docs visits converted to product understanding' },
          { label: 'Secondary KPI', value: 'Section completion and time-on-page' },
          { label: 'Admin KPI', value: 'Successful scheduled publishes' },
        ],
      },
      {
        slug: 'contributors',
        kind: 'team',
        eyebrow: 'Team and contributors',
        title: 'Team & contributors',
        summary: 'This section can expand as collaborators are added.',
        teamName: 'Lamina',
        members: teamMembers,
      },
      {
        slug: 'changelog',
        kind: 'changelog',
        eyebrow: 'Version history',
        title: 'Changelog',
        summary: 'The current docs build starts the version history for future scheduled showcases.',
        items: [],
      },
    ],
  };
}

function getLatestGitCommits(limit = 6) {
  try {
    const output = execSync(`git log -n ${limit} --date=short --pretty=format:%H%x09%ad%x09%s`, {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (!output) return [];

    return output.split('\n').map((line) => {
      const [hash, date, message] = line.split('\t');
      return {
        version: String(hash || '').slice(0, 7) || 'commit',
        date: date || '',
        note: message || 'Git commit',
      };
    });
  } catch {
    return [
      {
        version: `v${PACKAGE_JSON.version || '0.1.0'}`,
        date: new Date().toISOString().slice(0, 10),
        note: 'Deployable release snapshot',
      },
    ];
  }
}

function syncDynamicDocsSections(state) {
  const nextState = normalizeDocsState(state);
  const latestCommits = getLatestGitCommits(6);
  const teamMembers = [
    { name: 'MD. Sadman Saif', role: 'Project Lead', email: 'sadman@lamina.app', avatar: '' },
    { name: 'Nusaiba Zafnah', role: 'Product / UX', email: 'nusaiba@lamina.app', avatar: '' },
    { name: 'Md Aryan Rahman', role: 'Full-stack Engineer', email: 'aryan@lamina.app', avatar: '' },
    { name: 'Mohtasiba Hossain', role: 'AI / Content', email: 'mohtasiba@lamina.app', avatar: '' },
    { name: 'Noha Saabreen', role: 'Research / QA', email: 'noha@lamina.app', avatar: '' },
    { name: 'Golam Muhammad Walid', role: 'Systems / DevOps', email: 'walid@lamina.app', avatar: '' },
  ];

  nextState.sections = nextState.sections.map((section) => {
    if (section.slug === 'team' || section.slug === 'contributors') {
      return {
        ...section,
        teamName: 'Lamina',
        members: teamMembers,
      };
    }

    if (section.slug === 'changelog') {
      return {
        ...section,
        items: latestCommits.length ? latestCommits : (section.items || []),
      };
    }

    return section;
  });

  return nextState;
}

function normalizeDocsState(rawState) {
  const fallback = createDefaultDocsState();
  const state = rawState && typeof rawState === 'object' ? rawState : {};
  const meta = { ...fallback.meta, ...(state.meta || {}) };
  const publish = { ...fallback.publish, ...(state.publish || {}) };
  publish.window = { ...fallback.publish.window, ...((state.publish && state.publish.window) || {}) };
  const sections = Array.isArray(state.sections) && state.sections.length ? state.sections : fallback.sections;
  return { ...fallback, ...state, meta, publish, sections };
}

function readDocsState() {
  ensureDocsStorage();
  if (!fs.existsSync(DOCS_DATA_FILE)) {
    const defaultState = syncDynamicDocsSections(createDefaultDocsState());
    fs.writeFileSync(DOCS_DATA_FILE, JSON.stringify(defaultState, null, 2), 'utf8');
    return defaultState;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(DOCS_DATA_FILE, 'utf8'));
    return syncDynamicDocsSections(raw);
  } catch (err) {
    console.error('Failed to read docs state, restoring defaults:', err);
    const defaultState = syncDynamicDocsSections(createDefaultDocsState());
    fs.writeFileSync(DOCS_DATA_FILE, JSON.stringify(defaultState, null, 2), 'utf8');
    return defaultState;
  }
}

function writeDocsState(nextState) {
  ensureDocsStorage();
  const normalized = normalizeDocsState(nextState);
  normalized.meta.updatedAt = new Date().toISOString();
  normalized.meta.version = normalized.meta.version || '0.1.0';
  fs.writeFileSync(DOCS_DATA_FILE, JSON.stringify(normalized, null, 2), 'utf8');
  const historyName = `docs-${normalized.meta.updatedAt.replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(path.join(DOCS_HISTORY_DIR, historyName), JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
}

function listDocsHistory() {
  ensureDocsStorage();
  if (!fs.existsSync(DOCS_HISTORY_DIR)) return [];

  return fs.readdirSync(DOCS_HISTORY_DIR)
    .filter((fileName) => fileName.endsWith('.json'))
    .map((fileName) => {
      const filePath = path.join(DOCS_HISTORY_DIR, fileName);
      const stat = fs.statSync(filePath);
      return {
        id: fileName.replace(/^docs-/, '').replace(/\.json$/, ''),
        fileName,
        updatedAt: stat.mtime.toISOString(),
      };
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function parseLocalDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const [year, month, day] = String(dateValue).split('-').map(Number);
  const [hour, minute] = String(timeValue).split(':').map(Number);
  if ([year, month, day, hour, minute].some((value) => Number.isNaN(value))) return null;
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function getPublishRange(publish) {
  const window = publish?.window || {};
  const start = parseLocalDateTime(window.startDate, window.startTime) || new Date('2026-06-10T00:00:00');
  const end = publish?.mode === 'duration'
    ? new Date(start.getTime() + Number(publish.durationMinutes || 0) * 60 * 1000)
    : parseLocalDateTime(window.endDate, window.endTime) || new Date('2026-06-14T23:59:00');
  return { start, end };
}

function evaluateDocsAccess(state, now = new Date()) {
  const publish = state?.publish || {};
  const enabled = publish.enabled !== false;
  const { start, end } = getPublishRange(publish);
  const inWindow = now >= start && now <= end;
  const allowed = enabled && inWindow;
  let reason = 'Available';

  if (!enabled) {
    reason = 'Publishing is disabled';
  } else if (!inWindow) {
    reason = now < start ? 'Scheduled to open later' : 'Publish window closed';
  }

  return {
    allowed,
    enabled,
    inWindow,
    reason,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    mode: publish.mode || 'window',
  };
}

function buildLiveSnapshot(state) {
  const sections = Array.isArray(state?.sections) ? state.sections : [];
  const featureMatrix = sections.find((section) => section.slug === 'feature-matrix');
  const apiSection = sections.find((section) => section.slug === 'api-documentation');
  const liveFeatures = featureRowsFromTabs(APP_FEATURES);

  return {
    generatedAt: new Date().toISOString(),
    syncedFrom: ['features', 'settings', 'apis', 'events'],
    featureCount: liveFeatures.length,
    featureRows: liveFeatures,
    apiCount: apiSection?.endpoints?.length || 0,
    activeSections: sections.length,
    status: 'live',
  };
}

function isValidDocsAdminKey(key) {
  if (!DOCS_ADMIN_KEY) return false;
  return String(key || '') === String(DOCS_ADMIN_KEY);
}

function stripDocsForPublicView(state) {
  const access = evaluateDocsAccess(state);
  return {
    access: {
      ...access,
      allowed: true,
      reason: 'Public',
      visibility: 'public',
    },
    docs: state,
    live: buildLiveSnapshot(state),
  };
}

function renderDocsBlockedPage(reason) {
  const safeReason = String(reason || 'Docs are currently unavailable.');
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Lamina Docs Unavailable</title>
      <style>
        body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f5f1ea; color: #2e2b2a; font-family: 'DM Sans', system-ui, sans-serif; }
        main { width: min(720px, calc(100% - 32px)); background: #fffaf2; border: 1px solid #e3d8c8; border-radius: 24px; padding: 32px; box-shadow: 0 20px 60px rgba(77,58,34,.08); }
        h1 { font-family: 'Crimson Pro', Georgia, serif; font-size: clamp(2rem, 4vw, 3.25rem); margin: 0 0 10px; }
        p { line-height: 1.7; color: #5f564c; }
        a { color: #0f766e; font-weight: 700; text-decoration: none; }
        .meta { margin-top: 18px; padding: 14px 16px; border-radius: 16px; background: #f3ece1; border: 1px solid #e1d5c1; font-size: 14px; }
      </style>
    </head>
    <body>
      <main>
        <p class="meta">403 / Not available</p>
        <h1>Docs are hidden right now.</h1>
        <p>${safeReason}</p>
        <p>The docs module only opens during its publish window unless a preview session is used by an admin.</p>
        <p><a href="/">Return to Lamina</a></p>
      </main>
    </body>
  </html>`;
}

app.get('/api/docs', (req, res) => {
  const state = readDocsState();
  return res.json({ ok: true, ...stripDocsForPublicView(state) });
});

app.get('/api/docs/admin', (req, res) => {
  const key = req.headers['x-docs-admin-key'] || req.query.key || '';
  if (!isValidDocsAdminKey(key)) {
    return res.status(403).json({ ok: false, error: 'Unauthorized' });
  }

  const state = readDocsState();
  return res.json({ ok: true, access: evaluateDocsAccess(state), docs: state, live: buildLiveSnapshot(state), history: listDocsHistory(), admin: true });
});

app.get('/api/docs/history', (req, res) => {
  const key = req.headers['x-docs-admin-key'] || req.query.key || '';
  if (!isValidDocsAdminKey(key)) {
    return res.status(403).json({ ok: false, error: 'Unauthorized' });
  }

  return res.json({ ok: true, history: listDocsHistory() });
});

app.post('/api/docs/admin', (req, res) => {
  const key = req.headers['x-docs-admin-key'] || '';
  if (!isValidDocsAdminKey(key)) {
    return res.status(403).json({ ok: false, error: 'Unauthorized' });
  }

  const current = readDocsState();
  const incoming = req.body?.docs || req.body || {};
  const merged = normalizeDocsState({
    ...current,
    ...incoming,
    meta: { ...current.meta, ...(incoming.meta || {}) },
    publish: {
      ...current.publish,
      ...(incoming.publish || {}),
      window: { ...current.publish.window, ...((incoming.publish && incoming.publish.window) || {}) },
    },
    sections: Array.isArray(incoming.sections) && incoming.sections.length ? incoming.sections : current.sections,
  });

  const saved = writeDocsState(merged);
  return res.json({ ok: true, access: evaluateDocsAccess(saved), docs: saved, live: buildLiveSnapshot(saved), history: listDocsHistory(), saved: true });
});

// Basic rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

const CLAUDE_KEY = process.env.CLAUDE_KEY;
if (!CLAUDE_KEY) console.warn('WARNING: CLAUDE_KEY is not set in environment');
const MAX_OUTPUT_TOKENS = Number(process.env.ANTHROPIC_MAX_OUTPUT_TOKENS || 12000);
const MODEL_CANDIDATES = [
  process.env.ANTHROPIC_MODEL,
  'claude-sonnet-4-6',
  'claude-sonnet-4-5-20250929',
  'claude-3-5-sonnet-20241022',
  'claude-sonnet-4-20250514',
].filter(Boolean);

function extractText(data) {
  if (!data) return "";
  if (typeof data.output_text === 'string') return data.output_text;
  if (!Array.isArray(data.content)) return "";
  return data.content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part.text === 'string') return part.text;
      return '';
    })
    .join('');
}

async function callAnthropic(model, system, messages, apiKey) {
  const keyToUse = apiKey || CLAUDE_KEY;
  const maxTokens = /lesson plan/i.test(system) ? Math.min(MAX_OUTPUT_TOKENS, 4000) : MAX_OUTPUT_TOKENS;
  const payload = JSON.stringify({ model, max_tokens: maxTokens, system, messages });

  return new Promise((resolve, reject) => {
    const req = https.request(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'x-api-key': keyToUse,
          'anthropic-version': '2023-06-01',
          'accept-encoding': 'identity',
        },
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          let data;
          try {
            data = body ? JSON.parse(body) : {};
          } catch {
            const error = new Error(body || 'upstream_error');
            error.status = res.statusCode || 500;
            error.code = 'upstream_error';
            reject(error);
            return;
          }

          if (res.statusCode < 200 || res.statusCode >= 300) {
            const message = data?.error?.message || data?.error || 'upstream_error';
            const error = new Error(message);
            error.status = res.statusCode;
            error.code = data?.error?.type || 'upstream_error';
            reject(error);
            return;
          }

          resolve(data);
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function completeAnthropicResponse(model, system, user) {
  return callAnthropic(model, system, [{ role: 'user', content: user }]);
}

app.post('/api/claude', async (req, res) => {
  try {
    const { system, user } = req.body || {};
    if (!system || !user) return res.status(400).json({ error: 'Missing system or user in request body' });
    // Allow clients to send a per-request API key via header `x-claude-key`.
    const apiKeyHeader = req.headers['x-claude-key'] || req.headers['x-anthropic-key'] || null;
    const modelOverride = req.headers['x-model-override'] || null;
    const candidates = modelOverride ? [modelOverride, ...MODEL_CANDIDATES.filter(m => m !== modelOverride)] : MODEL_CANDIDATES;
    let lastError = null;
    for (const model of candidates) {
      try {
        const data = await callAnthropic(model, system, [{ role: 'user', content: user }], apiKeyHeader);
        return res.json(data);
      } catch (err) {
        lastError = err;
        if (err?.code !== 'model_not_found' && err?.status !== 404) {
          break;
        }
      }
    }

    const status = lastError?.status || 500;
    return res.status(status).json({ error: lastError?.message || 'server_error' });
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: err.message || 'server_error' });
  }
});

async function start() {
  const isProd = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT || 5173);
  const host = process.env.HOST || '0.0.0.0';

  if (isProd) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      appType: 'custom',
      server: {
        middlewareMode: true,
        hmr: false,
      },
    });

    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (err) {
        vite.ssrFixStacktrace(err);
        next(err);
      }
    });
  }

  const server = app.listen(port, host, () => {
    console.log(`Lamina running at http://${host}:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the other process or set PORT to another value.`);
      process.exit(1);
    }
    if (err.code === 'EACCES') {
      console.error(`Permission denied when binding port ${port}. Try a different PORT.`);
      process.exit(1);
    }
    throw err;
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
