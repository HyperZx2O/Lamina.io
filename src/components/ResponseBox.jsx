import React, { useState, useEffect, useCallback } from 'react';
import { getKaTeX, ensureKaTeX, escapeHtml } from '../lib/katexLoader';

function formatInline(text) {
  if (!text) return '';
  const e = escapeHtml;
  const renderMath = (expr, display) => {
    try {
      const k = getKaTeX();
      if (k) return k.renderToString(expr.trim(), { throwOnError: false, displayMode: !!display });
      ensureKaTeX().catch(()=>{});
      return `<span class="katex-fallback">${e(expr)}</span>`;
    } catch { return e(expr); }
  };
  let out = e(text).replace(/`([^`]+)`/g, (_, code) => `<code style="background:rgba(156,196,178,.1);padding:2px 7px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#9cc4b2;border:1px solid rgba(156,196,178,.15)">${e(code)}</code>`);
  out = out.replace(/\$(?!\$)(.+?)\$(?!\$)/g, (_, expr) => renderMath(expr, false));
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8ddd6;font-weight:600">$1</strong>');
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');
  out = out.replace(/\[Easy\]/g, '<span class="badge badge-easy">Easy</span>');
  out = out.replace(/\[Medium\]/g, '<span class="badge badge-medium">Medium</span>');
  out = out.replace(/\[Hard\]/g, '<span class="badge badge-hard">Hard</span>');
  out = out.replace(/\[সহজ\]/g, '<span class="badge badge-easy">সহজ</span>');
  out = out.replace(/\[মধ্যম\]/g, '<span class="badge badge-medium">মধ্যম</span>');
  out = out.replace(/\[কঠিন\]/g, '<span class="badge badge-hard">কঠিন</span>');
  return out;
}

function renderMarkdown(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const els = [];
  let listItems = [];
  let mathLines = [];
  let inMathBlock = false;
  let key = 0;

  const flushMath = () => {
    if (!mathLines.length) return;
    const expr = mathLines.join('\n').trim();
    if (!expr) { mathLines = []; return; }
    const k = getKaTeX();
    const html = k ? k.renderToString(expr, { throwOnError: false, displayMode: true }) : escapeHtml(expr);
    els.push(<div key={key++} style={{ margin: '12px 0', overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: html }} />);
    mathLines = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    els.push(
      <ul key={key++} style={{ margin: '6px 0 10px 0', padding: 0, listStyle: 'none' }}>
        {listItems.map((li, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
            <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 4, fontSize: 7, opacity: 0.7 }}>◆</span>
            <span style={{ color: '#a89890', lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: formatInline(li) }} />
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((raw) => {
    const l = raw.trim();
    if (inMathBlock) {
      if (l.endsWith('$$')) { mathLines.push(l.slice(0, -2).trim()); inMathBlock = false; flushMath(); }
      else { mathLines.push(raw); }
      return;
    }
    if (l.startsWith('$$')) { inMathBlock = true; mathLines.push(l.slice(2).trim()); return; }
    if (/^\*\s+/.test(l)) { listItems.push(l.replace(/^\*\s+/, '')); return; }
    flushList(); flushMath();
    els.push(<p key={key++} style={{ margin: '4px 0', color: '#a89890', lineHeight: 1.65, fontSize: 13.5 }} dangerouslySetInnerHTML={{ __html: formatInline(l) }} />);
  });
  flushMath(); flushList();
  return els;
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, []);
  return [copied, copy];
}

export default function ResponseBox({ text, accent = '#9cc4b2', onRegenerate, loading, bn, streaming = true }) {
  const [copied, copy] = useCopy();
  const [displayed, setDisplayed] = useState('');

  // progressive reveal (simulated streaming) when streaming enabled
  useEffect(() => {
    if (!streaming || !text) { setDisplayed(text || ''); return; }
    const parts = text.match(/[^.!?]+[.!?]*/g) || [text];
    let i = 0;
    setDisplayed('');
    const t = setInterval(() => {
      setDisplayed((d) => d + (parts[i] || ''));
      i += 1;
      if (i >= parts.length) clearInterval(t);
    }, 120);
    return () => clearInterval(t);
  }, [text, streaming]);

  if (!displayed) return (
    <div style={{ marginTop: 24, border: `1px dashed ${accent}22`, borderRadius: 12, padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: loading ? 0.85 : 0.5 }}>
      {loading ? (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="skeleton" style={{ height: 14, width: '80%' }} />
          <div className="skeleton" style={{ height: 14, width: '90%' }} />
          <div className="skeleton" style={{ height: 14, width: '60%' }} />
        </div>
      ) : (
        <>
          <div style={{ fontSize: 22, opacity: 0.4 }}>✦</div>
          <div style={{ fontSize: 12.5, color: '#6b5e58' }}>{bn ? 'আপনার উত্তর এখানে দেখাবে' : 'Your response will appear here'}</div>
        </>
      )}
    </div>
  );

  const cssVars = { '--accent': accent, '--accent-dim': `${accent}25` };
  return (
    <div style={{ ...cssVars, marginTop: 24, animation: 'fadeUp .4s ease' }}>
      <div style={{ background: 'linear-gradient(135deg, rgba(46,43,42,.65) 0%, rgba(36,33,32,.75) 100%)', border: `1px solid ${accent}20`, borderLeft: `3px solid ${accent}`, borderRadius: '0 12px 0 0', padding: '22px 24px 18px', fontSize: 13.5, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", overflowX: 'auto', boxShadow: '0 4px 32px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.03)' }}>
        {renderMarkdown(displayed)}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: `${accent}08`, border: `1px solid ${accent}18`, borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '9px 14px' }}>
        <span style={{ fontSize: 10.5, color: '#6b5e58', marginRight: 'auto' }}>{displayed.length}c</span>
        <button onClick={() => copy(displayed)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)', background: 'transparent', color: '#a89890', cursor: 'pointer' }}>{copied ? '✓ Copied' : '⍘ Copy'}</button>
        {onRegenerate && <button onClick={onRegenerate} disabled={loading} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)', background: 'transparent', color: '#a89890', cursor: 'pointer' }}>↺ Regenerate</button>}
        <button onClick={() => window.print()} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)', background: 'transparent', color: '#a89890', cursor: 'pointer' }}>🖨 Print</button>
      </div>
    </div>
  );
}
