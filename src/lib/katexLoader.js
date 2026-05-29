let __katex = null;
let __katexPromise = null;
export function getKaTeX() { return __katex; }
export function ensureKaTeX() {
  if (__katex) return Promise.resolve(__katex);
  if (__katexPromise) return __katexPromise;
  __katexPromise = import('katex').then((m) => { __katex = m; import('katex/dist/katex.min.css'); window.dispatchEvent(new Event('katex-ready')); return __katex; }).catch(() => { __katexPromise = null; });
  return __katexPromise;
}
export function escapeHtml(v) { return (v || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
