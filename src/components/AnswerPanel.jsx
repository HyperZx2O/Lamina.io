import React, { useState, useRef, useCallback, useEffect } from 'react';
import LightBulbIcon from '@heroicons/react/24/outline/LightBulbIcon';
import ArrowUturnLeftIcon from '@heroicons/react/24/outline/ArrowUturnLeftIcon';
import { cn } from '../lib/utils.js';
import { CardHeader, Field, Label, inputStyle, primaryBtn, secondaryBtn, chipStyle, AutoTextarea } from './UIHelpers.jsx';
import ResponseBox from './ResponseBox.jsx';

const TECHNICAL_ERROR_RE = /TypeError|Error:|undefined|Cannot read/i;

const LEVEL_DOT_CLASS = {
  beginner: 'bg-green-500',
  intermediate: 'bg-yellow-500',
  advanced: 'bg-red-500',
};

const ANSWER_LEVELS = [
  ['beginner', 'Simple & Clear', 'সহজ ও স্পষ্ট'],
  ['intermediate', 'Detailed (Class 10)', 'বিস্তারিত (শ্রেণী ১০)'],
  ['advanced', 'Exam-Ready (SSC)', 'পরীক্ষার জন্য (SSC)'],
];

export default function AnswerPanel({ bn, callAPI, buildAnswerPrompt, trackActivity }) {
  const [level, setLevel] = useState('beginner');
  const [question, setQuestion] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [isFollowUp, setIsFollowUp] = useState(false);
  const lastQ = useRef('');
  const abortRef = useRef(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  // Listen for URL-based prefill (?topic=) so deep links can pre-populate the question.
  useEffect(() => {
    const onPrefill = (e) => {
      const topic = e?.detail?.topic;
      if (typeof topic === 'string' && topic.trim()) setQuestion(topic);
    };
    window.addEventListener('lamina-prefill', onPrefill);
    return () => window.removeEventListener('lamina-prefill', onPrefill);
  }, []);

  const run = useCallback(async (q) => {
    const t = q !== undefined ? q : lastQ.current;
    if (!t.trim()) return;
    const followUp = isFollowUp;
    if (!followUp) setHistory([]);
    lastQ.current = t;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setOutput('');
    try {
      const context = history.map(m => (m.role === 'user' ? 'User: ' : 'AI: ') + m.content).join('\n');
      const combined = context ? `${context}\nUser: ${t}` : t;
      const resp = await callAPI(buildAnswerPrompt ? buildAnswerPrompt(bn, level) : '', combined, { signal: controller.signal, onChunk: (chunk, full) => { if (!controller.signal.aborted) setOutput(full); } });
      if (trackActivity) trackActivity(t, 'answer', resp);
      setOutput(resp);
      setHistory(prev => [...prev, { role: 'user', content: t }, { role: 'assistant', content: resp }]);
    } catch (e) {
      const msg = e.message || String(e);
      const isTechnical = TECHNICAL_ERROR_RE.test(msg);
      setOutput(isTechnical
        ? (bn ? 'একটি ত্রুটি হয়েছে। দয়া করে আবার চেষ্টা করুন।' : 'Something went wrong. Please try again.')
        : msg
      );
    }
    setLoading(false);
    setIsFollowUp(false);
  }, [bn, level, callAPI, buildAnswerPrompt, trackActivity, history, isFollowUp]);

  return (
    <>
      <CardHeader icon={LightBulbIcon} color="#d5bbb1" title={bn ? 'উত্তর তৈরি করুন' : 'Generate Answer'} subtitle={bn ? 'যেকোনো প্রশ্নের কাঠামোগত উত্তর পান — পরীক্ষার উপযোগী ফরম্যাটে।' : 'Get a structured, exam-ready answer with explanation, examples and key takeaways.'} />

      <Field>
        <Label>{bn ? 'উত্তরের গভীরতা' : 'Answer Depth'}</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {ANSWER_LEVELS.map(([v, en, bnLabel]) => (
            <button key={v} onClick={() => setLevel(v)} className={cn(level !== v && 'chip-inactive', 'inline-flex items-center gap-1.5')} style={chipStyle(level === v, '#d5bbb1')}>
              <span className={cn('inline-block w-2 h-2 rounded-full', LEVEL_DOT_CLASS[v])} />
              {bn ? bnLabel : en}
            </button>
          ))}
        </div>
      </Field>

      <Field>
        <Label>{bn ? 'আপনার প্রশ্ন' : 'Your Question'}</Label>
        <AutoTextarea minRows={4} maxLength={2000} style={inputStyle} value={question} onChange={e => setQuestion(e.target.value)} placeholder={bn ? 'যেকোনো বিষয়ের প্রশ্ন লিখুন...' : 'e.g. What is the difference between evaporation and condensation?'} />
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <button style={primaryBtn('#d5bbb1','rgba(213,187,177,.28)')} onClick={() => run(question)} disabled={loading || !question.trim()}>
          <LightBulbIcon className="w-4 h-4" />
          {loading ? (bn ? 'তৈরি হচ্ছে...' : 'Generating…') : (bn ? 'উত্তর তৈরি করুন' : 'Generate Answer')}
        </button>
        {loading && (
          <button type="button" onClick={() => abortRef.current?.abort()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-base-500 bg-transparent text-base-200 hover:text-base-50 hover:border-base-400 transition-colors"
            aria-label={bn ? 'বাতিল করুন' : 'Cancel'}>
            {bn ? 'বাতিল' : 'Cancel'}
          </button>
        )}
      </div>

      <ResponseBox text={output} accent="#d5bbb1" onRegenerate={output ? () => run() : null} loading={loading} bn={bn} isStreaming={loading} />

      {!output && !loading && !question.trim() && (
        <div className="mt-4 flex flex-col gap-2" aria-label={bn ? 'উদাহরণ প্রশ্ন' : 'Example questions'}>
          <div className="text-caption text-base-300 uppercase tracking-widest">
            {bn ? 'চেষ্টা করুন' : 'Try one of these'}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              bn ? 'বাষ্পীভবন ও ঘনীভবনের মধ্যে পার্থক্য কী?' : 'What is the difference between evaporation and condensation?',
              bn ? 'মৌলিক সংখ্যা কী এবং এটি কেন গুরুত্বপূর্ণ?' : 'What are prime numbers and why are they important?',
              bn ? 'নিউটনের তৃতীয় সূত্র ব্যাখ্যা করুন' : 'Explain Newton\'s Third Law of Motion with examples.',
              bn ? 'কোষের মাইটোকন্ড্রিয়ার কাজ কী?' : 'What is the function of mitochondria in a cell?',
            ].map((ex, i) => (
              <button key={i} type="button" onClick={() => setQuestion(ex)}
                className="px-3 py-1.5 text-caption rounded-full border border-accent-rose/30 bg-accent-rose/[0.08] text-accent-rose hover:bg-accent-rose/15 hover:border-accent-rose/50 transition-colors text-left">
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
      {output && !loading && history.length > 0 && (
        <button style={secondaryBtn('#d5bbb1')} className="inline-flex items-center gap-1.5" onClick={() => { setIsFollowUp(true); setQuestion(''); }}>
          <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
          {isFollowUp ? 'Following Up' : 'Follow Up'}
        </button>
      )}
    </>
  );
}
