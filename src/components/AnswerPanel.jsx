import React, { useState, useRef, useCallback, useEffect } from 'react';
import { LightBulbIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { cn } from '../lib/utils.js';
import { CardHeader, Field, Label, inputStyle, primaryBtn, secondaryBtn, chipStyle, AutoTextarea } from './UIHelpers.jsx';
import ResponseBox from './ResponseBox.jsx';

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
      const resp = await callAPI(buildAnswerPrompt ? buildAnswerPrompt(bn, level) : '', combined, controller.signal);
      if (trackActivity) trackActivity(t, 'answer', resp);
      setOutput(resp);
      setHistory(prev => [...prev, { role: 'user', content: t }, { role: 'assistant', content: resp }]);
    } catch (e) {
      setOutput(e.message || String(e));
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
        <AutoTextarea minRows={4} style={inputStyle} value={question} onChange={e => setQuestion(e.target.value)} placeholder={bn ? 'যেকোনো বিষয়ের প্রশ্ন লিখুন...' : 'e.g. What is the difference between evaporation and condensation?'} />
      </Field>

      <button style={primaryBtn('#d5bbb1','rgba(213,187,177,.28)')} onClick={() => run(question)} disabled={loading || !question.trim()}>
        <LightBulbIcon className="w-4 h-4" />
        {loading ? (bn ? 'তৈরি হচ্ছে...' : 'Generating…') : (bn ? 'উত্তর তৈরি করুন' : 'Generate Answer')}
      </button>

      <ResponseBox text={output} accent="#d5bbb1" onRegenerate={output ? () => run() : null} loading={loading} bn={bn} />
      {output && !loading && history.length > 0 && (
        <button style={secondaryBtn('#d5bbb1')} className="inline-flex items-center gap-1.5" onClick={() => { setIsFollowUp(true); setQuestion(''); }}>
          <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
          {isFollowUp ? 'Following Up' : 'Follow Up'}
        </button>
      )}
    </>
  );
}
