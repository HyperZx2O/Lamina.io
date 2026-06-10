import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CardHeader, Field, Label, inputStyle, primaryBtn, chipStyle, AutoTextarea } from './UIHelpers.jsx';
import ResponseBox from './ResponseBox.jsx';
import { detectLanguage, findNonAllowedLanguage } from '../lib/langDetect.js';

export default function MultiPanel({ bn, callAPI, buildMultiPrompt, trackActivity }) {
  const [mode, setMode] = useState('en-bn');
  const [input, setInput] = useState('');
  const [sideBySide, setSideBySide] = useState(false);
  const [detectedLang, setDetectedLang] = useState('en');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const lastInput = useRef('');

  
  // Auto-detect language and set mode accordingly
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
  if (input.trim()) {
    const lang = detectLanguage(input);
    setDetectedLang(lang);
    // Auto-switch only for basic translation modes, not simplify or transliterate
    const currentMode = modeRef.current;
    if (currentMode === 'en-bn' || currentMode === 'bn-en') {
      if (lang === 'bn' && currentMode !== 'bn-en') {
        setMode('bn-en');
      } else if (lang === 'en' && currentMode !== 'en-bn') {
        setMode('en-bn');
      }
    }
  }
}, [input]);

  const run = useCallback(async (txt) => {
    const t = txt !== undefined ? txt : lastInput.current;
    if (!t.trim()) return;
    lastInput.current = t;
    setLoading(true);
      setOutput('');
    try {
      const otherLang = findNonAllowedLanguage(t);
      if (otherLang) {
        throw new Error(`These are words from ${otherLang} and are not allowed.`);
      }
      const currentMode = modeRef.current;
      const systemPrompt = buildMultiPrompt ? buildMultiPrompt(currentMode) : 'Perform the requested operation.';
      const resp = await callAPI(systemPrompt, t);
      if (trackActivity) trackActivity(t, 'multi', resp);
      setOutput(resp);
    } catch (e) {
      setOutput(e.message || String(e));
    }
    setLoading(false);
  }, [callAPI, buildMultiPrompt, trackActivity]);

  const MULTI_MODES = [
    ['en-bn', '🇬🇧→🇧🇩', 'English → Bangla', 'ইংরেজি → বাংলা'],
    ['bn-en', '🇧🇩→🇬🇧', 'Bangla → English', 'বাংলা → ইংরেজি'],
    ['simplify-en', '✂️', 'Simplify English', 'ইংরেজিতে সরলীকরণ'],
    ['simplify-bn', '✂️', 'Simplify Bangla', 'বাংলায় সরলীকরণ'],
    ['trans', '🔤', 'Transliterate', 'ফোনেটিক বাংলা']
  ];

  return (
    <>
      <CardHeader
        icon="🌐"
        color="#c98ca7"
        title={bn ? 'বহুভাষিক বিষয়বস্তু' : 'Multilingual Content'}
        subtitle={bn ? 'ইংরেজি ও বাংলার মধ্যে শিক্ষামূলক সামগ্রী অনুবাদ ও সরলীকরণ করুন।' : 'Translate and simplify educational content between English and Bangla.'}
      />

      <Field>
        <Label>{bn ? 'রূপান্তরের ধরন' : 'Conversion Mode'}</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {MULTI_MODES.map(([value, icon, enLabel, bnLabel]) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={mode !== value ? 'chip-inactive' : ''}
              style={chipStyle(mode === value, '#c98ca7')}
            >
              {icon} {bn ? bnLabel : enLabel}
            </button>
          ))}
        </div>
      </Field>

      <Field>
        <Label>{bn ? 'টেক্সট লিখুন বা পেস্ট করুন' : 'Paste or type educational content'}</Label>
        <div style={{ position: 'relative' }}>
          <AutoTextarea
            minRows={5}
            style={inputStyle}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={bn ? 'অনুবাদ বা সরলীকরণ করার জন্য...' : 'Paste any textbook paragraph...'}
          />
          {input.trim() && (
            <span style={{ position: 'absolute', top: 4, right: 8, fontSize: 12, color: '#9cc4b2' }}>
              {detectedLang === 'bn' ? 'Bangla detected' : 'English detected'}
            </span>
          )}
        </div>
      </Field>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <button
          style={primaryBtn('#c98ca7', 'rgba(201,140,167,.28)')}
          onClick={() => run(input)}
          disabled={loading || !input.trim()}
        >
          🌐 {loading ? (bn ? 'রূপান্তর হচ্ছে...' : 'Converting…') : (bn ? 'রূপান্তর করুন' : 'Convert')}
        </button>
        <button
          style={primaryBtn('#c98ca7', 'rgba(201,140,167,.12)')}
          onClick={() => setSideBySide(!sideBySide)}
        >
          {sideBySide ? 'Single View' : 'Side by Side'}
        </button>
      </div>

        {sideBySide ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <Label>{bn ? 'মূল ইনপুট' : 'Original'}</Label>
            <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '8px', color: 'var(--text)' }}>{input}</div>
          </div>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <Label>{bn ? 'অনুবাদ' : 'Translation'}</Label>
            <ResponseBox text={output} accent="#c98ca7" onRegenerate={output ? () => run() : null} loading={loading} bn={bn} />
          </div>
        </div>
      ) : (
        <ResponseBox text={output} accent="#c98ca7" onRegenerate={output ? () => run() : null} loading={loading} bn={bn} />
      )}
    </>
  );
}
