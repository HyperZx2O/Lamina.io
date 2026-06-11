import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { renderMathInline, formatInline } from '../lib/katexLoader';
import { cn } from '../lib/utils';
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import HandThumbUpIcon from '@heroicons/react/24/outline/HandThumbUpIcon';
import HandThumbDownIcon from '@heroicons/react/24/outline/HandThumbDownIcon';
import PrinterIcon from '@heroicons/react/24/outline/PrinterIcon';
import ClipboardDocumentIcon from '@heroicons/react/24/outline/ClipboardDocumentIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';

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
    els.push(<div key={key++} className="my-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />);
  };

  const flushList = () => {
    if (!listItems.length) return;
    els.push(
      <ul key={key++} className="my-1.5 mb-2.5 p-0 list-none">
        {listItems.map((li, i) => (
          <li key={i} className="flex gap-2.5 mb-1.5">
            <span className="flex-shrink-0 mt-1 text-[7px] opacity-70" style={{ color: 'var(--accent)' }}>◆</span>
            <span className="text-[#a89890] leading-[1.65]" dangerouslySetInnerHTML={{ __html: formatInline(li) }} />
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  const pushBlock = (tag, cls, content) => {
    els.push(
      React.createElement(tag, { key: key++, className: cls, dangerouslySetInnerHTML: { __html: formatInline(content) } })
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
    if (/^#{3}\s+/.test(l)) { pushBlock('h3', 'mt-4 mb-1.5 text-base font-bold text-base-50', l.replace(/^#{3}\s+/, '')); return; }
    if (/^#{2}\s+/.test(l)) { pushBlock('h2', 'mt-4 mb-1.5 text-lg font-bold text-base-50', l.replace(/^#{2}\s+/, '')); return; }
    if (/^#{1}\s+/.test(l)) { pushBlock('h1', 'mt-5 mb-2 text-heading font-bold text-base-50', l.replace(/^#\s+/, '')); return; }
    if (/^---+\s*$/.test(l)) { els.push(<hr key={key++} className="border-none border-t border-[#3a3634] my-4" />); return; }
    if (!l) { els.push(<div key={key++} className="h-2" />); return; }
    pushBlock('p', 'my-1 text-[#a89890] leading-relaxed text-secondary', l);
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

const ResponseBox = React.memo(function ResponseBox({ text, accent = '#9cc4b2', onRegenerate, loading, bn, streaming = true, panel, topic, streamSpeed }) {
  const [copied, copy] = useCopy();
  const [displayed, setDisplayed] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [totalRatings, setTotalRatings] = useState(0);
  const [positiveRatings, setPositiveRatings] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const existing = JSON.parse(localStorage.getItem('lamina_feedback') || '[]');
    setTotalRatings(existing.length);
    setPositiveRatings(existing.filter(e => e.rating === 'positive').length);
  }, []);

  useEffect(() => {
    setFeedbackSubmitted(false);
  }, [text]);

  const submitFeedback = (rating) => {
    let updated = [];
    try {
      const existing = JSON.parse(localStorage.getItem('lamina_feedback') || '[]');
      const entry = { panel: panel || 'unknown', topic: topic || '', rating, timestamp: Date.now() };
      const next = Array.isArray(existing) ? [...existing, entry] : [entry];
      localStorage.setItem('lamina_feedback', JSON.stringify(next));
      // Verify write succeeded by reading it back.
      const verify = JSON.parse(localStorage.getItem('lamina_feedback') || '[]');
      updated = Array.isArray(verify) ? verify : next;
    } catch (e) {
      // Storage may be disabled (private mode) — at least update in-memory counts.
      // eslint-disable-next-line no-console
      console.warn('Feedback storage failed:', e);
    }
    setTotalRatings(updated.length);
    setPositiveRatings(updated.filter(e => e && e.rating === 'positive').length);
    setFeedbackSubmitted(true);
  };

  useEffect(() => {
    if (!streaming || !text) { setDisplayed(text || ''); return; }
    const parts = text.match(/[^.!?]+[.!?]*/g) || [text];
    let i = 0;
    setDisplayed('');
    timerRef.current = setInterval(() => {
      setDisplayed(d => d + (parts[i] || ''));
      i += 1;
      if (i >= parts.length) clearInterval(timerRef.current);
    }, streamSpeed || 120);
    return () => clearInterval(timerRef.current);
  }, [text, streaming]);

  const content = useMemo(() => displayed ? renderMarkdown(displayed) : null, [displayed]);

  if (!displayed) {
    return (
      <div
        className={cn('mt-6 rounded-xl px-6 py-7 flex flex-col items-center gap-2', loading ? 'opacity-85' : 'opacity-50')}
        style={{ border: `1px dashed ${accent}22` }}
      >
        {loading ? (
          <div className="w-full flex flex-col gap-2.5">
            <div className="skeleton w-[80%]" />
            <div className="skeleton w-[90%]" />
            <div className="skeleton w-[60%]" />
          </div>
        ) : (
          <>
            <SparklesIcon className="w-[22px] h-[22px] opacity-40" />
            <div className="text-caption text-base-300">{bn ? 'আপনার উত্তর এখানে দেখাবে' : 'Your response will appear here'}</div>
          </>
        )}
      </div>
    );
  }

  const cssVars = { '--accent': accent, '--accent-dim': `${accent}25` };

  return (
    <div className="response-print mt-8 animate-fade-in" style={cssVars}>
      <div className="printable">
        {topic && <div className="print-prompt text-body font-bold mb-2">{topic}</div>}
        <div
          className="bg-base-600/80 border border-base-500 rounded-xl px-6 pt-5 pb-4 text-secondary overflow-x-auto"
          style={{ borderColor: `${accent}25`, borderTop: `2px solid ${accent}` }}
        >
          {content}
        </div>
      </div>
      <div
        className="flex gap-2 items-center border-t-0 rounded-b-xl rounded-t-none px-3.5 py-2 flex-wrap"
        style={{ background: `${accent}08`, border: `1px solid ${accent}18` }}
      >
        <div className="flex flex-col mr-auto">
          <span className="text-caption text-base-300">{displayed.length}c</span>
          <span className="text-caption text-[#7a6d69] italic mt-0.5">
            {bn ? 'এআই-দ্বারা তৈরি তথ্য — সর্বদা শিক্ষক বা পাঠ্যবইয়ের সাথে যাচাই করে নিন।' : 'AI-generated content — always verify with your teacher or textbook.'}
          </span>
        </div>
        <button
          onClick={() => copy(displayed)}
          className={cn(
            'px-2.5 py-1.5 rounded-lg border border-white/[0.03] bg-transparent text-[#a89890] cursor-pointer flex items-center gap-1.5 transition-colors duration-150 hover:bg-[var(--btn-hover)] active:bg-[var(--btn-active)]',
            copied && 'text-[#9cc4b2]'
          )}
          style={{ '--btn-hover': `${accent}18`, '--btn-active': `${accent}30` }}
        >
          {copied ? (
            <>
              <CheckIcon className="w-3.5 h-3.5" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <ClipboardDocumentIcon className="w-[14px] h-[14px]" />
              <span>Copy</span>
            </>
          )}
        </button>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg border border-white/[0.03] bg-transparent text-[#a89890] cursor-pointer flex items-center gap-1.5 transition-colors duration-150 hover:bg-[var(--btn-hover)] active:bg-[var(--btn-active)] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ '--btn-hover': `${accent}18`, '--btn-active': `${accent}30` }}
          >
            <ArrowPathIcon className={cn('w-[14px] h-[14px]', loading && 'animate-spin')} />
            <span>Regenerate</span>
          </button>
        )}
        <button
          onClick={() => window.print()}
          className="px-2.5 py-1.5 rounded-lg border border-white/[0.03] bg-transparent text-[#a89890] cursor-pointer flex items-center gap-1.5 transition-colors duration-150 hover:bg-[var(--btn-hover)] active:bg-[var(--btn-active)]"
          style={{ '--btn-hover': `${accent}18`, '--btn-active': `${accent}30` }}
        >
          <PrinterIcon className="w-[14px] h-[14px]" />
          <span>Print</span>
        </button>
        {!feedbackSubmitted && displayed && !loading && (
          <>
            <button
              onClick={() => submitFeedback('positive')}
              title={bn ? 'এই উত্তরটি সহায়ক ছিল' : 'Mark this response as helpful'}
              aria-label={bn ? 'সহায়ক' : 'Helpful'}
              className="px-2.5 py-1.5 rounded-lg border border-[#9cc4b2]/40 bg-[#9cc4b2]/10 text-[#9cc4b2] cursor-pointer flex items-center gap-1.5 transition-colors duration-150 hover:bg-[#9cc4b2]/25 active:bg-[#9cc4b2]/35"
            >
              <HandThumbUpIcon className="w-3.5 h-3.5 text-[#9cc4b2]" />
              <span className="text-caption font-medium">{bn ? 'সহায়ক' : 'Helpful'}</span>
            </button>
            <button
              onClick={() => submitFeedback('negative')}
              title={bn ? 'এই উত্তরটি সহায়ক ছিল না' : 'Mark this response as not helpful'}
              aria-label={bn ? 'সহায়ক নয়' : 'Not helpful'}
              className="px-2.5 py-1.5 rounded-lg border border-[#e76d83]/40 bg-[#e76d83]/10 text-[#e76d83] cursor-pointer flex items-center gap-1.5 transition-colors duration-150 hover:bg-[#e76d83]/25 active:bg-[#e76d83]/35"
            >
              <HandThumbDownIcon className="w-3.5 h-3.5 text-[#e76d83]" />
              <span className="text-caption font-medium">{bn ? 'সহায়ক নয়' : 'Not helpful'}</span>
            </button>
          </>
        )}
        {feedbackSubmitted && (
          <>
            <span className="text-caption text-[#7a6d69] italic flex items-center gap-1.5">
              <CheckIcon className="w-3 h-3 text-[#9cc4b2]" />
              {bn ? 'মতামতের জন্য ধন্যবাদ! আপনার রেটিং সংরক্ষিত হয়েছে।' : 'Thanks! Your rating has been recorded.'}
            </span>
            <span className="text-caption text-[#7a6d69] italic text-center block mt-[2px]">
              {totalRatings
                ? `${((positiveRatings / totalRatings) * 100).toFixed(1)}% satisfaction among ${totalRatings} rating${totalRatings === 1 ? '' : 's'}`
                : '0% satisfaction among 0 ratings'}
            </span>
          </>
        )}
      </div>
    </div>
  );
});

export default ResponseBox;
