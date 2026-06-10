import React, { useState, useRef, useCallback } from 'react';
import { CardHeader, Field, Label, inputStyle, primaryBtn, chipStyle, AutoTextarea } from './UIHelpers.jsx';
import ResponseBox from './ResponseBox.jsx';

export default function TeacherPanel({ bn, callAPI, buildTeacherPrompt }) {
  const [type, setType] = useState('lesson');
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
    try {
      const sys = buildTeacherPrompt ? buildTeacherPrompt(bn, type) : '';
      setOutput(await callAPI(sys, t));
    } catch (e) { setError(e.message || String(e)); }
    setLoading(false);
  }, [bn, type, callAPI, buildTeacherPrompt]);

  const TEACHER_TYPES = [
    ['lesson','📋','Lesson Plan','পাঠ পরিকল্পনা'],
    ['quiz','📝','Quiz','কুইজ'],
    ['rubric','⭐','Rubric','রুব্রিক'],
  ];

  return (
    <>
      <CardHeader icon="👩‍🏫" color="#b5d4c8" title={bn ? 'শিক্ষক সহকারী' : 'Teacher Copilot'} subtitle={bn ? 'পাঠ পরিকল্পনা, কুইজ, রুব্রিক — যা দরকার তৈরি করুন।' : 'Generate lesson plans, quizzes, and rubrics — instantly.'} />

      <Field>
        <Label>{bn ? 'সহায়তার ধরন' : 'Type of Support'}</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {TEACHER_TYPES.map(([v, ic, en, bnLabel]) => (
            <button key={v} onClick={() => setType(v)} className={type !== v ? 'chip-inactive' : ''} style={chipStyle(type === v, '#b5d4c8')}>{ic} {bn ? bnLabel : en}</button>
          ))}
        </div>
      </Field>

      <Field>
        <Label>{bn ? 'আপনার অনুরোধ' : 'Describe what you need'}</Label>
        <AutoTextarea minRows={4} style={inputStyle} value={input} onChange={e => setInput(e.target.value)} placeholder={bn ? 'যেমন: ক্লাস ৯-এর জন্য নিউটনের...' : 'e.g. Create a 45-min lesson plan for Class 9...'} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setInput(bn ? 'ক্লাস ৯-এর জন্য নিউটনের সূত্রের উপর ৪৫ মিনিটের পাঠ পরিকল্পনা তৈরি করুন' : 'Create a 45-min lesson plan for Class 9 on Newton\'s Laws of Motion')} style={{ background: 'none', border: 'none', color: '#b5d4c8', fontSize: 11, cursor: 'pointer', padding: '4px 0', opacity: 0.75 }}>{bn ? 'উদাহরণ দেখুন' : 'Try an example'}</button>
        </div>
      </Field>

      <button style={primaryBtn('#b5d4c8','rgba(181,212,200,.28)')} onClick={() => run(input)} disabled={loading || !input.trim()}>
        👩‍🏫 {loading ? (bn ? 'তৈরি হচ্ছে...' : 'Generating…') : (bn ? 'তৈরি করুন' : 'Generate')}
      </button>

      <ResponseBox text={output} accent="#b5d4c8" onRegenerate={output ? () => run() : null} loading={loading} bn={bn} />
    </>
  );
}
