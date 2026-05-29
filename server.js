require('dotenv').config();
const fs = require('fs');
const https = require('https');
const path = require('path');
const express = require('express');

const app = express();
app.use(express.json());

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

async function callAnthropic(model, system, messages) {
  const maxTokens = /lesson plan/i.test(system) ? Math.min(MAX_OUTPUT_TOKENS, 4000) : MAX_OUTPUT_TOKENS;
  const payload = JSON.stringify({
    model,
    max_tokens: maxTokens,
    system,
    messages,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'x-api-key': CLAUDE_KEY,
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

    let lastError = null;
    for (const model of MODEL_CANDIDATES) {
      try {
        const data = await completeAnthropicResponse(model, system, user);
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

  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`Lamina running at http://127.0.0.1:${port}`);
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
