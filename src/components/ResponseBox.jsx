import React, { useState, useEffect, useCallback } from 'react';
import { renderMathInline, escapeHtml, formatInline } from '../lib/katexLoader';

// Helper to format inline markdown-like syntax

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
    mathLines = [];
    if (!expr) return;
    const html = renderMathInline(expr, true);
    els.push(<div key={key++} style={{ margin: '12px 0', overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: html }} />);
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

  const pushBlock = (tag, style, content) => {
    els.push(
      React.createElement(tag, { key: key++, style, dangerouslySetInnerHTML: { __html: formatInline(content) } })
    );
  };

  lines.forEach((raw) => {
    const l = raw.trim();
    if (inMathBlock) {
      if (l.endsWith('$$')) { mathLines.push(l.slice(0, -2).trim()); inMathBlock = false; flushMath(); }
      else { mathLines.push(raw); }
      return;
    }
    if (l.startsWith('$$')) {
      flushList();
      const inner = l.slice(2);
      if (inner.endsWith('$$')) { mathLines.push(inner.slice(0, -2).trim()); flushMath(); return; }
      inMathBlock = true; mathLines.push(inner.trim()); return;
    }
    if (/^\*\s+/.test(l)) { listItems.push(l.replace(/^\*\s+/, '')); return; }
    flushList();
    if (/^#{3}\s+/.test(l)) { pushBlock('h3', { margin: '16px 0 6px', fontSize: 16, fontWeight: 700, color: '#e8ddd6' }, l.replace(/^#{3}\s+/, '')); return; }
    if (/^#{2}\s+/.test(l)) { pushBlock('h2', { margin: '18px 0 6px', fontSize: 18, fontWeight: 700, color: '#e8ddd6' }, l.replace(/^#{2}\s+/, '')); return; }
    if (/^#{1}\s+/.test(l)) { pushBlock('h1', { margin: '20px 0 8px', fontSize: 21, fontWeight: 700, color: '#e8ddd6' }, l.replace(/^#\s+/, '')); return; }
    if (/^---+\s*$/.test(l)) { els.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid #3a3634', margin: '16px 0' }} />); return; }
    if (!l) { els.push(<div key={key++} style={{ height: 8 }} />); return; }
    pushBlock('p', { margin: '4px 0', color: '#a89890', lineHeight: 1.65, fontSize: 13.5 }, l);
  });
  flushMath();
  flushList();
  return els;
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);
  return [copied, copy];
}

export default function ResponseBox({ text, accent = '#9cc4b2', onRegenerate, loading, bn, streaming = true, panel, topic }) {
  const [copied, copy] = useCopy();
  const [displayed, setDisplayed] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [totalRatings, setTotalRatings] = useState(0);
  const [positiveRatings, setPositiveRatings] = useState(0);
  // Load existing stats on mount
  useEffect(() => {
    const existing = JSON.parse(localStorage.getItem('lamina_feedback') || '[]');
    setTotalRatings(existing.length);
    setPositiveRatings(existing.filter(e => e.rating === 'positive').length);
  }, []);

  // Reset feedback when new text arrives (new query or regeneration)
  useEffect(() => {
    setFeedbackSubmitted(false);
  }, [text]);

  const submitFeedback = (rating) => {
    try {
      const existing = JSON.parse(localStorage.getItem('lamina_feedback') || '[]');
      const entry = { panel, topic, rating, timestamp: Date.now() };
      existing.push(entry);
      localStorage.setItem('lamina_feedback', JSON.stringify(existing));
      setTotalRatings(existing.length);
      setPositiveRatings(existing.filter(e => e.rating === 'positive').length);
    } catch { /* localStorage not available */ }
    setFeedbackSubmitted(true);
  };

  // Streaming effect for the AI response
  useEffect(() => {
    if (!streaming || !text) { setDisplayed(text || ''); return; }
    const parts = text.match(/[^.!?]+[.!?]*/g) || [text];
    let i = 0;
    let cancelled = false;
    setDisplayed('');
    const timer = setInterval(() => {
      if (cancelled) { clearInterval(timer); return; }
      setDisplayed(d => d + (parts[i] || ''));
      i += 1;
      if (i >= parts.length) clearInterval(timer);
    }, 120);
    return () => { cancelled = true; clearInterval(timer); };
  }, [text, streaming]);

  if (!displayed) {
    return (
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
  }

  const cssVars = { '--accent': accent, '--accent-dim': `${accent}25` };
  return (
    <div className="response-print" style={{ ...cssVars, marginTop: 24, animation: 'fadeUp .4s ease' }}>
      <div className="printable">
        {topic && <div className="print-prompt" style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>{topic}</div>}
        <div style={{ background: 'linear-gradient(135deg, rgba(46,43,42,.65) 0%, rgba(36,33,32,.75) 100%)', border: `1px solid ${accent}20`, borderLeft: `3px solid ${accent}`, borderRadius: '0 12px 0 0', padding: '22px 24px 18px', fontSize: 13.5, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", overflowX: 'auto', boxShadow: '0 4px 32px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.03)' }}>
          {renderMarkdown(displayed)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: `${accent}08`, border: `1px solid ${accent}18`, borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '9px 14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', marginRight: 'auto' }}>
          <span style={{ fontSize: 10.5, color: '#6b5e58' }}>{displayed.length}c</span>
          <span style={{ fontSize: '11px', color: '#7a6d69', fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic', marginTop: 2 }}>
            {bn ? 'এআই-দ্বারা তৈরি তথ্য — সর্বদা শিক্ষক বা পাঠ্যবইয়ের সাথে যাচাই করে নিন।' : 'AI-generated content — always verify with your teacher or textbook.'}
          </span>
        </div>
        <button onClick={() => copy(displayed)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)', background: 'transparent', color: '#a89890', cursor: 'pointer' }}>{copied ? '✓ Copied' : '⍘ Copy'}</button>
        {onRegenerate && (
          <button onClick={onRegenerate} disabled={loading} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)', background: 'transparent', color: '#a89890', cursor: 'pointer' }}>↺ Regenerate</button>
        )}
        <button onClick={() => window.print()} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)', background: 'transparent', color: '#a89890', cursor: 'pointer' }}>🖨 Print</button>
        {!feedbackSubmitted && displayed && !loading && (
          <> 
            <button onClick={() => submitFeedback('positive')} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.03)', background: 'transparent', color: '#9cc4b2', cursor: 'pointer' }}>👍</button>
            <button onClick={() => submitFeedback('negative')} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.03)', background: 'transparent', color: '#e76d83', cursor: 'pointer' }}>👎</button>
          </>
        )}
        {feedbackSubmitted && (
          <>
            <span style={{ fontSize: '11px', color: '#7a6d69', fontStyle: 'italic' }}>Thanks for your feedback!</span>
            <span style={{ fontSize: '12px', color: '#7a6d69', fontStyle: 'italic', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", textAlign: 'center', display: 'block', marginTop: 2 }}>{totalRatings ? `${((positiveRatings / totalRatings) * 100).toFixed(1)}% satisfaction among ${totalRatings} ratings` : '0% satisfaction among 0 ratings'}</span>
          </>
        )}
      </div>
    </div>
  );
}
