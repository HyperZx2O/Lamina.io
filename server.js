require('dotenv').config();
const fs = require('fs');
const { execFileSync } = require('child_process');
const https = require('https');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());

// CORS
app.use(cors());

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "ws:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "data:"],
      styleSrc: ["'self'", "'unsafe-inline'", "data:", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "data:", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      connectSrc: [
        "'self'",
        "ws://127.0.0.1:*",
        "ws://localhost:*",
        "http://127.0.0.1:*",
        "http://localhost:*",
      ],
    },
  },
}));

// Rate limiting for all API routes
const apiLimiter = rateLimit({
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

const DOCS_DATA_DIR = path.resolve(__dirname, 'data');
const DOCS_DATA_FILE = path.join(DOCS_DATA_DIR, 'docs.json');
const DOCS_HISTORY_DIR = path.join(DOCS_DATA_DIR, 'history');
const DOCS_ADMIN_KEY = process.env.DOCS_ADMIN_KEY || '';
const { featureRowsFromTabs, APP_FEATURES } = require('./docsCatalog.cjs');
const { createDefaultDocsState, TEAM_MEMBERS } = require('./docsDefaultState.cjs');
const PACKAGE_JSON = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

const ragEngine = require('./src/lib/ragEngine.js');
const packStore = require('./src/lib/packStore.cjs');

// Load RAG content on startup (async)
ragEngine.loadContent().then((count) => {
  console.log(`RAG engine loaded: ${count} chunks from NCTB curriculum`);
}).catch((e) => {
  console.warn('RAG engine not available:', e.message);
});

function ensureDocsStorage() {
  fs.mkdirSync(DOCS_DATA_DIR, { recursive: true });
  fs.mkdirSync(DOCS_HISTORY_DIR, { recursive: true });
}

function getLatestGitCommits(limit = 6) {
  try {
    const n = Math.max(1, Math.min(100, parseInt(limit, 10) || 6));
    const output = execFileSync('git', ['log', '-n', String(n), '--date=short', '--pretty=format:%H%x09%ad%x09%s'], {
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
  const teamMembers = TEAM_MEMBERS;

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
  const defaultStart = process.env.DOCS_DEFAULT_START || '2026-06-10T00:00:00';
  const defaultEnd = process.env.DOCS_DEFAULT_END || '2026-06-14T23:59:00';
  const start = parseLocalDateTime(window.startDate, window.startTime) || new Date(defaultStart);
  const end = publish?.mode === 'duration'
    ? new Date(start.getTime() + Number(publish.durationMinutes || 0) * 60 * 1000)
    : parseLocalDateTime(window.endDate, window.endTime) || new Date(defaultEnd);
  return { start, end };
}

function evaluateDocsAccess(state) {
  const publish = state?.publish || {};
  const { start, end } = getPublishRange(publish);
  const now = new Date();
  const inWindow = now >= start && now <= end;
  return {
    allowed: true,
    enabled: publish.enabled !== false,
    inWindow,
    reason: 'Available',
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    mode: publish.mode || 'window',
  };
}

function buildLiveSnapshot(state) {
  const sections = Array.isArray(state?.sections) ? state.sections : [];
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

app.get('/api/docs', (req, res) => {
  const state = readDocsState();
  const access = evaluateDocsAccess(state);
  if (!access.allowed) {
    return res.status(403).json({ ok: false, access, docs: null, live: null, error: access.reason });
  }
  return res.json({ ok: true, access: { ...access, visibility: 'public' }, docs: state, live: buildLiveSnapshot(state) });
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

const CLAUDE_KEY = process.env.CLAUDE_KEY;
if (!CLAUDE_KEY) console.warn('WARNING: CLAUDE_KEY is not set in environment');
const MAX_OUTPUT_TOKENS = Number(process.env.ANTHROPIC_MAX_OUTPUT_TOKENS || 12000);
// Lesson plans, rubrics, and long-form teaching content routinely run 3000-6000 tokens.
// We allow up to 8k for these (still well under MAX_OUTPUT_TOKENS cap of 12k).
const LONG_FORM_MAX_TOKENS = Number(process.env.ANTHROPIC_LONG_FORM_MAX_TOKENS || 8000);
// Generous upstream timeout: 3 minutes covers even the slowest Sonnet generations.
const UPSTREAM_TIMEOUT_MS = Number(process.env.ANTHROPIC_TIMEOUT_MS || 180000);
const ANTHROPIC_API_VERSION = process.env.ANTHROPIC_API_VERSION || '2023-06-01';
const MODEL_CANDIDATES = [
  process.env.ANTHROPIC_MODEL,
  'claude-sonnet-4-6',
  'claude-sonnet-4-5-20250929',
  'claude-3-5-sonnet-20241022',
  'claude-sonnet-4-20250514',
].filter(Boolean);


function buildAnthropicPayload(model, system, messages, maxTokens) {
  return JSON.stringify({
    model,
    max_tokens: maxTokens,
    system,
    messages,
    stream: true,
  });
}

async function callAnthropic(model, system, messages, apiKey) {
  const keyToUse = apiKey || CLAUDE_KEY;
  // Long-form content (lesson plans, rubrics, full units) needs more headroom than
  // short Q&A or vocabulary translations.
  const isLongForm = /lesson plan|rubric|unit plan|full lesson|syllabus/i.test(system);
  const maxTokens = isLongForm
    ? Math.min(MAX_OUTPUT_TOKENS, LONG_FORM_MAX_TOKENS)
    : MAX_OUTPUT_TOKENS;
  // For the buffered (non-streaming) path we explicitly disable streaming.
  const payload = JSON.stringify({
    model,
    max_tokens: maxTokens,
    system,
    messages,
    stream: false,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'x-api-key': keyToUse,
          'anthropic-version': ANTHROPIC_API_VERSION,
          'accept-encoding': 'identity',
        },
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('error', reject);
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

    req.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
      const err = new Error(
        `Upstream request exceeded ${Math.round(UPSTREAM_TIMEOUT_MS / 1000)}s timeout. ` +
        'Please try again or shorten the prompt.'
      );
      err.code = 'upstream_timeout';
      err.status = 504;
      req.destroy(err);
    });
    req.on('error', (err) => {
      if (err && err.code === 'upstream_timeout') return reject(err);
      // Map Node socket-level timeouts to a friendlier message.
      if (err && (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET')) {
        const wrapped = new Error('Connection to upstream was interrupted. Please try again.');
        wrapped.code = 'upstream_timeout';
        wrapped.status = 504;
        return reject(wrapped);
      }
      reject(err);
    });
    req.write(payload);
    req.end();
  });
}

/**
 * Pipes Anthropic's `stream: true` SSE events straight through to a local
 * response object. Translates upstream `content_block_delta` events into
 * client-friendly `data: {delta:{text:"…"}}` frames, and forwards upstream
 * error / stop events. Honours an AbortSignal (e.g. res.on('close')) by
 * destroying the upstream request.
 */
function streamAnthropic(model, system, messages, apiKey, res, signal) {
  return new Promise((resolve, reject) => {
    const keyToUse = apiKey || CLAUDE_KEY;
    const isLongForm = /lesson plan|rubric|unit plan|full lesson|syllabus/i.test(system);
    const maxTokens = isLongForm
      ? Math.min(MAX_OUTPUT_TOKENS, LONG_FORM_MAX_TOKENS)
      : MAX_OUTPUT_TOKENS;
    const payload = buildAnthropicPayload(model, system, messages, maxTokens);

    const req = https.request(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'x-api-key': keyToUse,
          'anthropic-version': ANTHROPIC_API_VERSION,
          'accept': 'text/event-stream',
          'accept-encoding': 'identity',
        },
      },
      (upstream) => {
        if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
          // Non-2xx — read body and surface a normal JSON error so the client
          // can use the existing error-handling path.
          let errBody = '';
          upstream.setEncoding('utf8');
          upstream.on('data', (c) => { errBody += c; });
          upstream.on('end', () => {
            try {
              res.status(upstream.statusCode).json({
                error: (() => {
                  try { return JSON.parse(errBody)?.error?.message || errBody; }
                  catch { return errBody; }
                })(),
                code: 'upstream_error',
              });
              resolve();
            } catch (e) { reject(e); }
          });
          upstream.on('error', reject);
          return;
        }

        // Pipe upstream chunks straight to the client, preserving SSE framing.
        upstream.setEncoding('utf8');
        let buffer = '';
        let stopped = false;
        upstream.on('data', (chunk) => {
          if (stopped) return;
          buffer += chunk;
          // We forward everything we receive so the client sees the raw
          // Anthropic event stream. SSE uses double-newline as a record
          // separator; we don't need to parse it server-side.
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue; // Anthropic doesn't emit this, but be safe
              try {
                const parsed = JSON.parse(data);
                // Forward content_block_delta as-is (already JSON in data:).
                // Re-emit a compact "text" field for clients that prefer a
                // simple cumulative view; the existing client reads
                // .delta.text directly from the upstream event.
                if (parsed?.type === 'content_block_delta' && parsed?.delta?.type === 'text_delta') {
                  res.write(`data: ${JSON.stringify({
                    type: 'content_block_delta',
                    delta: { type: 'text_delta', text: parsed.delta.text },
                  })}\n\n`);
                } else if (parsed?.type === 'message_stop') {
                  res.write(`data: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
                } else if (parsed?.type === 'error') {
                  res.write(`data: ${JSON.stringify(parsed)}\n\n`);
                }
                // Other event types (ping, content_block_start, content_block_stop,
                // message_start) are dropped to keep the wire compact.
              } catch {
                // Non-JSON line — ignore.
              }
            }
          }
        });
        upstream.on('end', () => {
          if (stopped) return;
          stopped = true;
          res.write('data: [DONE]\n\n');
          res.end();
          resolve();
        });
        upstream.on('error', (err) => {
          if (stopped) return;
          stopped = true;
          try {
            res.write(`data: ${JSON.stringify({ type: 'error', error: { message: err.message } })}\n\n`);
            res.end();
          } catch { /* ignore */ }
          reject(err);
        });
      }
    );

    req.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
      const err = new Error(
        `Upstream request exceeded ${Math.round(UPSTREAM_TIMEOUT_MS / 1000)}s timeout. ` +
        'Please try again or shorten the prompt.'
      );
      err.code = 'upstream_timeout';
      req.destroy(err);
    });
    req.on('error', (err) => {
      if (err && err.code === 'upstream_timeout') {
        if (!res.headersSent) {
          res.status(504).json({ error: err.message, code: 'upstream_timeout' });
        }
        return reject(err);
      }
      if (err && (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET')) {
        if (!res.headersSent) {
          res.status(504).json({
            error: 'Connection to upstream was interrupted. Please try again.',
            code: 'upstream_timeout',
          });
        }
        return reject(err);
      }
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'server_error', code: 'proxy_error' });
      }
      reject(err);
    });

    // Wire client disconnect → upstream abort.
    if (signal) {
      const onAbort = () => {
        try { req.destroy(); } catch { /* ignore */ }
      };
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    req.write(payload);
    req.end();
  });
}

app.post('/api/claude', async (req, res) => {
  try {
    const { system, user } = req.body || {};
    if (!system || !user) return res.status(400).json({ error: 'Missing system or user in request body' });
    // Allow clients to send a per-request API key via header `x-claude-key`.
    const apiKeyHeader = req.headers['x-claude-key'] || req.headers['x-anthropic-key'] || null;
    const modelOverride = req.headers['x-model-override'] || null;
    const wantsStream = req.headers.accept && req.headers.accept.includes('text/event-stream');
    const candidates = modelOverride ? [modelOverride, ...MODEL_CANDIDATES.filter(m => m !== modelOverride)] : MODEL_CANDIDATES;

    if (wantsStream) {
      // Set SSE headers early. X-Accel-Buffering disables proxy buffering.
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();
      // AbortSignal that fires when the client disconnects mid-stream.
      const ac = new AbortController();
      req.on('close', () => { if (!ac.signal.aborted) ac.abort(); });

      let lastError = null;
      for (const model of candidates) {
        try {
          await streamAnthropic(model, system, [{ role: 'user', content: user }], apiKeyHeader, res, ac.signal);
          return;
        } catch (err) {
          lastError = err;
          if (err?.code !== 'model_not_found' && err?.status !== 404) {
            break;
          }
        }
      }
      // If streaming already started, we can't switch to JSON — just close.
      if (!res.headersSent) {
        res.status(lastError?.status || 500).json({
          error: lastError?.message || 'server_error',
          code: lastError?.code || 'server_error',
        });
      } else {
        try {
          res.write(`data: ${JSON.stringify({ type: 'error', error: { message: lastError?.message || 'server_error' } })}\n\n`);
          res.end();
        } catch { /* ignore */ }
      }
      return;
    }

    let lastError = null;
    for (const model of candidates) {
      try {
        const data = await callAnthropic(model, system, [{ role: 'user', content: user }], apiKeyHeader);
        return res.json(data);
      } catch (err) {
        lastError = err;
        // If only this model wasn't found, try the next candidate.
        if (err?.code !== 'model_not_found' && err?.status !== 404) {
          break;
        }
      }
    }

    const status = lastError?.status || 500;
    return res.status(status).json({
      error: lastError?.message || 'server_error',
      code: lastError?.code || 'server_error',
    });
  } catch (err) {
    console.error('Proxy error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || 'server_error', code: 'proxy_error' });
    }
  }
});

// ── RAG (NCTB Curriculum) Endpoints ──

app.get('/api/rag/status', (req, res) => {
  const stats = ragEngine.getStats();
  const subjects = ragEngine.getSubjects();
  res.json({ ok: true, stats, subjects });
});

app.post('/api/rag/query', (req, res) => {
  try {
    const { query, topK = 5, class: classFilter, subject: subjectFilter } = req.body || {};
    if (!query || !query.trim()) {
      return res.status(400).json({ ok: false, error: 'Query is required' });
    }
    const minScore = Number(process.env.RAG_MIN_SCORE) || 0.08;
    const results = ragEngine.search(query, { topK, minScore, classFilter, subjectFilter });
    const context = ragEngine.formatContext(results);
    const sources = results.map(r => ({
      id: r.chunk.id,
      class: r.chunk.class,
      subject: r.chunk.subject,
      chapterTitle: r.chunk.chapterTitle,
      sectionTitle: r.chunk.sectionTitle,
      text: r.chunk.raw.slice(0, 200),
      score: r.score,
    }));
    res.json({ ok: true, query, context, sources, totalChunks: ragEngine.chunks.length });
  } catch (err) {
    console.error('RAG query error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/rag/enrich', async (req, res) => {
  try {
    const { query, class: classFilter, subject: subjectFilter, system } = req.body || {};
    if (!query || !query.trim()) {
      return res.status(400).json({ ok: false, error: 'Query is required' });
    }
    const minScore = Number(process.env.RAG_MIN_SCORE) || 0.08;
    const results = ragEngine.search(query, { topK: 5, minScore, classFilter, subjectFilter });
    const context = ragEngine.formatContext(results);
    if (!context) {
      return res.json({ ok: true, query, context: '', enriched: false, note: 'No relevant curriculum content found' });
    }
    const enrichedSystem = system
      ? `${system}\n\nHere is relevant curriculum content from NCTB textbooks to help answer:\n${context}`
      : `You are a helpful tutor for Bangladesh's NCTB curriculum. Use the following textbook content to answer the student's question. If the content is not sufficient, supplement with your own knowledge.\n\nRelevant NCTB content:\n${context}`;

    res.json({ ok: true, query, system: enrichedSystem, context, enriched: true, sourceCount: results.length });
  } catch (err) {
    console.error('RAG enrich error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Study-pack endpoints (offline learning) ──────────────────────────
// These power the client-side offline hub: list available packs, fetch
// a full pack by id, sync quiz attempts, and pull an aggregate
// progress summary. The /api/packs/* routes are also covered by the
// service worker's stale-while-revalidate rule in vite.config.mjs.

// GET /api/packs/list → lightweight catalogue of every pack on disk.
app.get('/api/packs/list', (req, res) => {
  try {
    const packs = packStore.listPacksMeta();
    res.json({ ok: true, packs, count: packs.length });
  } catch (err) {
    console.error('packs list error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/packs/:id → full pack JSON (lesson + questions). Cached
// aggressively by the SW so it's available offline.
app.get('/api/packs/:id', (req, res) => {
  try {
    const pack = packStore.getPackById(req.params.id);
    if (!pack) {
      return res.status(404).json({ ok: false, error: 'Pack not found' });
    }
    res.json({ ok: true, pack });
  } catch (err) {
    console.error('packs get error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/progress/sync
// Body: { userId?: string, attempts: Array<{ id, packId, questionId, correct, timeMs?, createdAt? }> }
// Returns: { ok, accepted: number, duplicates: number, ids: string[] }
app.post('/api/progress/sync', (req, res) => {
  try {
    const body = req.body || {};
    const userId = typeof body.userId === 'string' && body.userId.trim()
      ? body.userId.trim()
      : 'anon';
    const attempts = Array.isArray(body.attempts) ? body.attempts : [];

    if (!attempts.length) {
      return res.json({ ok: true, accepted: 0, duplicates: 0, ids: [] });
    }
    if (attempts.length > 200) {
      return res.status(413).json({
        ok: false,
        error: 'Too many attempts in one batch (max 200)',
      });
    }

    const acceptedIds = [];
    let duplicates = 0;
    for (const attempt of attempts) {
      const result = packStore.saveAttempt(userId, attempt);
      if (result.ok) {
        acceptedIds.push(result.id);
        if (result.alreadySynced) duplicates += 1;
      }
    }

    res.json({
      ok: true,
      accepted: acceptedIds.length - duplicates,
      duplicates,
      ids: acceptedIds,
    });
  } catch (err) {
    console.error('progress sync error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/progress/summary?userId=xxx
// Returns: { ok, summary: { totalAttempts, correctAttempts, accuracy, uniquePacks, streakDays, lastActiveAt } }
app.get('/api/progress/summary', (req, res) => {
  try {
    const userId = typeof req.query.userId === 'string' && req.query.userId.trim()
      ? req.query.userId.trim()
      : 'anon';
    const summary = packStore.summaryStats(userId);
    res.json({ ok: true, userId, summary });
  } catch (err) {
    console.error('progress summary error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

async function start() {
  const isProd = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT || 5173);
  const host = process.env.HOST || (isProd ? '0.0.0.0' : '127.0.0.1');

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
