import React, { useState, useRef, useCallback } from 'react';
import { CardHeader, Field, Label, inputStyle, primaryBtn, chipStyle } from './UIHelpers.jsx';
import ResponseBox from './ResponseBox.jsx';

function AutoTextarea({ value, onChange, onKeyDown, placeholder, minRows = 4, style }) {
  const ref = React.useRef(null);
  React.useEffect(() => { const el = ref.current; if (!el) return; el.style.height = 'auto'; el.style.height = Math.max(el.scrollHeight, minRows * 24 + 22) + 'px'; }, [value, minRows]);
  return <textarea ref={ref} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} rows={minRows} style={{ ...style, resize: 'none', overflow: 'hidden' }} />;
}

export default function AnswerPanel({ bn, callAPI, buildAnswerPrompt }) {
  const [level, setLevel] = useState('beginner');
  const [question, setQuestion] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const lastQ = useRef('');

  const ANSWER_LEVELS = [
    ['beginner','🟢','Simple & Clear','সহজ ও স্পষ্ট'],
    ['intermediate','🟡','Detailed (Class 10)','বিস্তারিত (শ্রেণী ১০)'],
    ['advanced','🔴','Exam-Ready (SSC)','পরীক্ষার জন্য (SSC)'],
  ];

  const run = useCallback(async (q) => {
    const t = q !== undefined ? q : lastQ.current;
    if (!t.trim()) return;
    lastQ.current = t;
    setLoading(true); setOutput(''); setError('');
    try { setOutput(await callAPI(buildAnswerPrompt ? buildAnswerPrompt(bn, level) : '', t)); }
    catch (e) { setError(e.message || String(e)); }
    setLoading(false);
  }, [bn, level, callAPI, buildAnswerPrompt]);

  return (
    <>
      <CardHeader icon="💡" color="#d5bbb1" title={bn ? 'উত্তর তৈরি করুন' : 'Generate Answer'} subtitle={bn ? 'যেকোনো প্রশ্নের কাঠামোগত উত্তর পান — পরীক্ষার উপযোগী ফরম্যাটে।' : 'Get a structured, exam-ready answer with explanation, examples and key takeaways.'} />

      <Field>
        <Label>{bn ? 'উত্তরের গভীরতা' : 'Answer Depth'}</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {ANSWER_LEVELS.map(([v, ic, en, bnLabel]) => (
            <button key={v} onClick={() => setLevel(v)} className={level !== v ? 'chip-inactive' : ''} style={chipStyle(level === v, '#d5bbb1')}>{ic} {bn ? bnLabel : en}</button>
          ))}
        </div>
      </Field>

      <Field>
        <Label>{bn ? 'আপনার প্রশ্ন' : 'Your Question'}</Label>
        <AutoTextarea minRows={4} style={inputStyle} value={question} onChange={e => setQuestion(e.target.value)} placeholder={bn ? 'যেকোনো বিষয়ের প্রশ্ন লিখুন...' : 'e.g. What is the difference between evaporation and condensation?'} />
      </Field>

      <button style={primaryBtn('#d5bbb1','rgba(213,187,177,.28)')} onClick={() => run(question)} disabled={loading || !question.trim()}>
        💡 {loading ? (bn ? 'তৈরি হচ্ছে...' : 'Generating…') : (bn ? 'উত্তর তৈরি করুন' : 'Generate Answer')}
      </button>

      <ResponseBox text={output} accent="#d5bbb1" onRegenerate={output ? () => run() : null} loading={loading} bn={bn} />
    </>
  );
}
