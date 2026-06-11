let _katex = null;
let _promise = null;

function startLoad() {
  if (!_promise) {
    _promise = import('katex').then(mod => {
      _katex = mod.default || mod;
      return import('katex/dist/katex.min.css');
    });
  }
  return _promise;
}

export function getKaTeX() { return _katex; }
export function isKaTeXReady() { return _katex !== null; }
export function onKaTeXReady(fn) { if (_katex) { fn(_katex); return; } startLoad().then(() => fn(_katex)); }
export function ensureKaTeX() { return startLoad(); }

export function escapeHtml(v) { return (v || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

function tryRender(expr, display) {
  try {
    if (_katex) return _katex.renderToString(expr.trim(), { throwOnError: false, displayMode: !!display });
  } catch {}
  return null;
}

export function renderMathInline(expr, display) {
  const html = tryRender(expr, display);
  if (html !== null) return html;
  startLoad();
  return `<span class="katex-fallback">${escapeHtml(expr.trim())}</span>`;
}

export function formatInline(text) {
  if (!text) return '';
  const e = escapeHtml;
  let out = e(text)
    .replace(/`([^`]+)`/g, (_, code) => `<code style="background:rgba(156,196,178,.1);padding:2px 7px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#9cc4b2;border:1px solid rgba(156,196,178,.15)">${code}</code>`)
    .replace(/\$\$(.+?)\$\$/g, (_, expr) => renderMathInline(expr, true))
    .replace(/\$(.+?)\$/g, (_, expr) => renderMathInline(expr, false))
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8ddd6;font-weight:600">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:underline">$1</a>')
    .replace(/\[Easy\]/g, '<span class="badge badge-easy">Easy</span>')
    .replace(/\[Medium\]/g, '<span class="badge badge-medium">Medium</span>')
    .replace(/\[Hard\]/g, '<span class="badge badge-hard">Hard</span>')
    .replace(/\[সহজ\]/g, '<span class="badge badge-easy">সহজ</span>')
    .replace(/\[মধ্যম\]/g, '<span class="badge badge-medium">মধ্যম</span>')
    .replace(/\[কঠিন\]/g, '<span class="badge badge-hard">কঠিন</span>');
  return out;
}

export function renderResponseToHtml(text) {
  if (!text) return '';
  startLoad();
  // First split out fenced code blocks (```...```) so they don't get mangled by math/inline formatters.
  const codeBlockRe = /```([a-zA-Z0-9_+\-#]*)\n?([\s\S]*?)```/g;
  const segments = [];
  let last = 0;
  let m;
  while ((m = codeBlockRe.exec(text)) !== null) {
    if (m.index > last) segments.push({ type: 'text', content: text.slice(last, m.index) });
    segments.push({ type: 'code', lang: (m[1] || '').trim(), content: m[2] || '' });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ type: 'text', content: text.slice(last) });

  return segments.map((seg) => {
    if (seg.type === 'code') {
      const langLabel = seg.lang ? `<div class="code-block-lang">${escapeHtml(seg.lang)}</div>` : '';
      return `<div class="code-block">${langLabel}<pre><code class="language-${escapeHtml(seg.lang || 'text')}">${escapeHtml(seg.content.replace(/^\n+|\n+$/g, ''))}</code></pre></div>`;
    }
    // Existing math + paragraph rendering for the prose segments.
    const parts = seg.content.split(/(\$\$[\s\S]*?\$\$)/g);
    return parts.map((part) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const expr = part.slice(2, -2).trim();
        try {
          if (_katex) return `<div style="margin:10px 0;overflow-x:auto">${_katex.renderToString(expr, { throwOnError: false, displayMode: true })}</div>`;
        } catch {}
        return escapeHtml(expr);
      }
      const paragraphs = part.split(/\n{2,}/);
      return paragraphs.map(p => {
        p = p.trim();
        if (!p) return '';
        const lines = p.split('\n').map(l => formatInline(l)).join('<br/>');
        return `<p style="margin:6px 0;color:#d5bbb1;line-height:1.7;font-size:14px">${lines}</p>`;
      }).join('');
    }).join('');
  }).join('');
}
