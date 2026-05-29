import React, { useState, useRef, useCallback } from 'react';
import { CardHeader, Field, Label, inputStyle, primaryBtn } from './UIHelpers.jsx';
import ResponseBox from './ResponseBox.jsx';

function AutoTextarea({ value, onChange, onKeyDown, placeholder, minRows = 3, style }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, minRows * 24 + 22) + 'px';
  }, [value, minRows]);
  return <textarea ref={ref} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} rows={minRows} style={{ ...style, resize: 'none', overflow: 'hidden' }} />;
}

function WordCount({ text, accent }) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  if (!chars) return null;
  return (
    <div style={{ textAlign: 'right', fontSize: 10.5, color: '#6b5e58', marginTop: 5 }}>
      <span style={{ color: words > 0 ? accent : '#6b5e58' }}>{words}w</span>
      <span style={{ margin: '0 4px', opacity: 0.4 }}>·</span>
      {chars}c
    </div>
  );
}

export default function TutorPanel({ bn, callAPI, buildTutorPrompt }) {
  const [subject, setSubject] = useState('Physics');
  const [level, setLevel] = useState('beginner');
  const [topic, setTopic] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const lastArgs = useRef(null);

  const run = useCallback(async (args) => {
    const { sub, lvl, top } = args || lastArgs.current || { sub: subject, lvl: level, top: topic };
    if (!top.trim()) return;
    lastArgs.current = { sub, lvl, top };
    setLoading(true); setOutput(''); setError('');
    try {
      const sys = buildTutorPrompt ? buildTutorPrompt(bn, sub, lvl) : '';
      const msg = bn ? `বিষয়: ${sub}\nটপিক: ${top}` : `Subject: ${sub}\nTopic: ${top}`;
      setOutput(await callAPI(sys, msg));
    } catch (e) { setError(e.message || String(e)); }
    setLoading(false);
  }, [bn, subject, level, topic, callAPI, buildTutorPrompt]);

  return (
    <>
      <CardHeader icon="🎓" color="#9cc4b2" title={bn ? 'অ্যাডাপটিভ টিউটর' : 'Adaptive Tutor'} subtitle={bn ? 'আপনার স্তর ও বিষয় অনুযায়ী ব্যক্তিগতকৃত পাঠ পান — NCTB পাঠ্যক্রম অনুযায়ী।' : 'Get a personalised lesson adapted to your level and subject — aligned with the NCTB curriculum.'} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <Field>
          <Label>{bn ? 'বিষয়' : 'Subject'}</Label>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={subject} onChange={e => setSubject(e.target.value)}>
            {['Physics','Chemistry','Biology','Mathematics','English','Bangla','History','ICT'].map(s => <option key={s} value={s}>{bn ? s : s}</option>)}
          </select>
        </Field>
        <Field>
          <Label>{bn ? 'শেখার স্তর' : 'Learning Level'}</Label>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={level} onChange={e => setLevel(e.target.value)}>
            <option value="beginner">{bn ? 'শিক্ষানবিস' : 'Beginner'}</option>
            <option value="intermediate">{bn ? 'মধ্যবর্তী' : 'Intermediate'}</option>
            <option value="advanced">{bn ? 'উন্নত' : 'Advanced'}</option>
          </select>
        </Field>
      </div>

      <Field>
        <Label>{bn ? 'টপিক বা প্রশ্ন লিখুন' : 'Enter topic or question'}</Label>
        <AutoTextarea minRows={3} style={inputStyle} value={topic} onChange={e => setTopic(e.target.value)} placeholder={bn ? 'যেমন: নিউটনের দ্বিতীয় সূত্র...' : 'e.g. Newton\'s Second Law...'} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setTopic(bn ? 'নিউটনের দ্বিতীয় সূত্র ব্যাখ্যা করুন' : 'Explain Newton\'s Second Law of Motion')} style={{ background: 'none', border: 'none', color: '#9cc4b2', fontSize: 11, cursor: 'pointer', padding: '4px 0', opacity: 0.75 }}>{bn ? 'উদাহরণ দেখুন' : 'Try an example'}</button>
          <WordCount text={topic} accent="#9cc4b2" />
        </div>
      </Field>

      <button style={primaryBtn('#9cc4b2','rgba(156,196,178,.32)')} onClick={() => run({ sub: subject, lvl: level, top: topic })} disabled={loading || !topic.trim()}>
        🎓 {loading ? (bn ? 'তৈরি হচ্ছে...' : 'Generating…') : (bn ? 'পাঠ তৈরি করুন' : 'Generate Lesson')}
      </button>

      <ResponseBox text={output} accent="#9cc4b2" onRegenerate={output ? () => run(lastArgs.current) : null} loading={loading} bn={bn} />
    </>
  );
}
