import katex from 'katex';
import 'katex/dist/katex.min.css';

export function getKaTeX() { return katex; }
export function isKaTeXReady() { return true; }
export function onKaTeXReady(fn) { fn(katex); }
export function ensureKaTeX() { return Promise.resolve(katex); }

export function escapeHtml(v) { return (v || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

export function renderMathInline(expr, display) {
  try {
    const k = getKaTeX();
    if (k) return k.renderToString(expr.trim(), { throwOnError: false, displayMode: !!display });
    return `<span class="katex-fallback">${escapeHtml(expr)}</span>`;
  } catch {
    return escapeHtml(expr);
  }
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
  const parts = text.split(/(\$\$[\s\S]*?\$\$)/g);
  return parts.map((part) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const expr = part.slice(2, -2).trim();
      try {
        const k = getKaTeX();
        if (k) return `<div style="margin:10px 0;overflow-x:auto">${k.renderToString(expr, { throwOnError: false, displayMode: true })}</div>`;
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
}
