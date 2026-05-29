import React, { useState, useRef, useCallback } from 'react';
import { CardHeader, Field, Label, inputStyle, primaryBtn } from './UIHelpers.jsx';
import ResponseBox from './ResponseBox.jsx';

function AutoTextarea({ value, onChange, onKeyDown, placeholder, minRows = 2, style }) {
  const ref = React.useRef(null);
  React.useEffect(() => { const el = ref.current; if (!el) return; el.style.height = 'auto'; el.style.height = Math.max(el.scrollHeight, minRows * 24 + 22) + 'px'; }, [value, minRows]);
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

export default function QuestionsPanel({ bn, callAPI, buildQuestionsPrompt, QUESTION_TYPES = [['mixed','Mixed Types','মিশ্র ধরন'],['mcq','Multiple Choice (MCQ)','বহুনির্বাচনী (MCQ)'],['short','Short Answer','সংক্ষিপ্ত উত্তর'],['problem','Problem Solving','সমস্যা সমাধান'],['creative','Creative / Essay','সৃজনশীল']] }) {
  const [qType, setQType] = useState('mixed');
  const [count, setCount] = useState('5');
  const [topic, setTopic] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const lastArgs = useRef(null);

  const run = useCallback(async (args) => {
    const { qt, cnt, top } = args || lastArgs.current || { qt: qType, cnt: count, top: topic };
    if (!top.trim()) return;
    lastArgs.current = { qt, cnt, top };
    setLoading(true); setOutput(''); setError('');
    try { const sys = buildQuestionsPrompt ? buildQuestionsPrompt(bn, qt, cnt) : ''; const msg = bn ? `টপিক: ${top}, প্রশ্নের সংখ্যা: ${cnt}` : `Topic: ${top}, Count: ${cnt}`; setOutput(await callAPI(sys, msg)); }
    catch (e) { setError(e.message || String(e)); }
    setLoading(false);
  }, [bn, qType, count, topic, callAPI, buildQuestionsPrompt]);

  return (
    <>
      <CardHeader icon="❓" color="#e76d83" title={bn ? 'প্রশ্ন সাজেস্ট করুন' : 'Suggest Questions'} subtitle={bn ? 'যেকোনো টপিকের জন্য NCTB-সামঞ্জস্যপূর্ণ অনুশীলন প্রশ্ন তৈরি করুন।' : 'Generate NCTB-aligned practice questions at mixed difficulty levels for any topic or chapter.'} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <Field>
          <Label>{bn ? 'প্রশ্নের ধরন' : 'Question Type'}</Label>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={qType} onChange={e => setQType(e.target.value)}>
            {QUESTION_TYPES.map(([v, en, bnLabel]) => <option key={v} value={v}>{bn ? bnLabel : en}</option>)}
          </select>
        </Field>
        <Field>
          <Label>{bn ? 'প্রশ্নের সংখ্যা' : 'Number of Questions'}</Label>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={count} onChange={e => setCount(e.target.value)}>
            {['3','5','8','10'].map(n => <option key={n} value={n}>{n} {bn ? 'টি প্রশ্ন' : 'Questions'}</option>)}
          </select>
        </Field>
      </div>
      <Field>
        <Label>{bn ? 'টপিক বা অধ্যায়' : 'Topic or Chapter'}</Label>
        <AutoTextarea minRows={2} style={inputStyle} value={topic} onChange={e => setTopic(e.target.value)} placeholder={bn ? 'যেমন: আলোর প্রতিফলন...' : 'e.g. Laws of Thermodynamics...'} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setTopic(bn ? 'রাসায়নিক বন্ধন' : 'Chemical Bonding')} style={{ background: 'none', border: 'none', color: '#e76d83', fontSize: 11, cursor: 'pointer', padding: '4px 0', opacity: 0.75 }}>{bn ? 'উদাহরণ দেখুন' : 'Try an example'}</button>
          <WordCount text={topic} accent="#e76d83" />
        </div>
      </Field>
      <button style={primaryBtn('#e76d83','rgba(231,109,131,.28)')} onClick={() => run({ qt: qType, cnt: count, top: topic })} disabled={loading || !topic.trim()}>
        ❓ {loading ? (bn ? 'তৈরি হচ্ছে...' : 'Generating…') : (bn ? 'প্রশ্ন তৈরি করুন' : 'Generate Questions')}
      </button>
      <ResponseBox text={output} accent="#e76d83" onRegenerate={output ? () => run(lastArgs.current) : null} loading={loading} bn={bn} />
    </>
  );
}
