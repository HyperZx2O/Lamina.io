import React, { useState, useRef, useCallback } from 'react';
import { CardHeader, Field, Label, inputStyle, primaryBtn, chipStyle } from './UIHelpers.jsx';
import ResponseBox from './ResponseBox.jsx';

function AutoTextarea({ value, onChange, onKeyDown, placeholder, minRows = 5, style }) {
  const ref = React.useRef(null);
  React.useEffect(() => { const el = ref.current; if (!el) return; el.style.height = 'auto'; el.style.height = Math.max(el.scrollHeight, minRows * 24 + 22) + 'px'; }, [value, minRows]);
  return <textarea ref={ref} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} rows={minRows} style={{ ...style, resize: 'none', overflow: 'hidden' }} />;
}

export default function MultiPanel({ bn, callAPI, buildMultiPrompt }) {
  const [mode, setMode] = useState('en-bn');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const lastInput = useRef('');

  const run = useCallback(async (txt) => {
    const t = txt !== undefined ? txt : lastInput.current;
    if (!t.trim()) return;
    lastInput.current = t;
    setLoading(true); setOutput(''); setError('');
    try { setOutput(await callAPI(buildMultiPrompt ? buildMultiPrompt(mode) : '', t)); }
    catch (e) { setError(e.message || String(e)); }
    setLoading(false);
  }, [mode, callAPI, buildMultiPrompt]);

  const MULTI_MODES = [
    ['en-bn','🇬🇧→🇧🇩','English → Bangla','ইংরেজি → বাংলা'],
    ['bn-en','🇧🇩→🇬🇧','Bangla → English','বাংলা → ইংরেজি'],
    ['simplify-en','✂️','Simplify English','ইংরেজিতে সরলীকরণ'],
    ['simplify-bn','✂️','Simplify Bangla','বাংলায় সরলীকরণ'],
  ];

  return (
    <>
      <CardHeader icon="🌐" color="#c98ca7" title={bn ? 'বহুভাষিক বিষয়বস্তু' : 'Multilingual Content'} subtitle={bn ? 'ইংরেজি ও বাংলার মধ্যে শিক্ষামূলক সামগ্রী অনুবাদ ও সরলীকরণ করুন।' : 'Translate and simplify educational content between English and Bangla.'} />

      <Field>
        <Label>{bn ? 'রূপান্তরের ধরন' : 'Conversion Mode'}</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {MULTI_MODES.map(([v, ic, en, bnLabel]) => (
            <button key={v} onClick={() => setMode(v)} className={mode !== v ? 'chip-inactive' : ''} style={chipStyle(mode === v, '#c98ca7')}>{ic} {bn ? bnLabel : en}</button>
          ))}
        </div>
      </Field>

      <Field>
        <Label>{bn ? 'টেক্সট লিখুন বা পেস্ট করুন' : 'Paste or type educational content'}</Label>
        <AutoTextarea minRows={5} style={inputStyle} value={input} onChange={e => setInput(e.target.value)} placeholder={bn ? 'অনুবাদ বা সরলীকরণ করার জন্য...' : 'Paste any textbook paragraph...'} />
      </Field>

      <button style={primaryBtn('#c98ca7','rgba(201,140,167,.28)')} onClick={() => run(input)} disabled={loading || !input.trim()}>
        🌐 {loading ? (bn ? 'রূপান্তর হচ্ছে...' : 'Converting…') : (bn ? 'রূপান্তর করুন' : 'Convert')}
      </button>

      <ResponseBox text={output} accent="#c98ca7" onRegenerate={output ? () => run() : null} loading={loading} bn={bn} />
    </>
  );
}
