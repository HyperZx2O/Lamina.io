import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UserGroupIcon, ClipboardDocumentListIcon, StarIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { cn } from '../lib/utils.js';
import { CardHeader, Field, Label, inputStyle, primaryBtn, chipStyle, AutoTextarea } from './UIHelpers.jsx';
import ResponseBox from './ResponseBox.jsx';

const TEACHER_ICONS = {
  lesson: ClipboardDocumentListIcon,
  quiz: DocumentTextIcon,
  rubric: StarIcon,
};

const TEACHER_TYPES = [
  ['lesson', 'Lesson Plan', 'পাঠ পরিকল্পনা'],
  ['quiz', 'Quiz', 'কুইজ'],
  ['rubric', 'Rubric', 'রুব্রিক'],
];

export default function TeacherPanel({ bn, callAPI, buildTeacherPrompt, trackActivity }) {
  const [type, setType] = useState('lesson');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const lastInput = useRef('');
  const abortRef = useRef(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(async (txt) => {
    const t = txt !== undefined ? txt : lastInput.current;
    if (!t.trim()) return;
    lastInput.current = t;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true); setOutput('');
    try {
      const sys = buildTeacherPrompt ? buildTeacherPrompt(bn, type) : '';
      const resp = await callAPI(sys, t, controller.signal);
      if (trackActivity) trackActivity(t, 'teacher', resp);
      setOutput(resp);
    } catch (e) { setOutput(e.message || String(e)); }
    setLoading(false);
  }, [bn, type, callAPI, buildTeacherPrompt]);

  return (
    <>
      <CardHeader icon={UserGroupIcon} color="#b5d4c8" title={bn ? 'শিক্ষক সহায়ক' : 'Teacher Copilot'} subtitle={bn ? 'পাঠ পরিকল্পনা, কুইজ, রুব্রিক — যা দরকার তৈরি করুন।' : 'Generate lesson plans, quizzes, and rubrics — instantly.'} />

      <Field>
        <Label>{bn ? 'সহায়তার ধরন' : 'Type of Support'}</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {TEACHER_TYPES.map(([v, en, bnLabel]) => {
            const IconComponent = TEACHER_ICONS[v];
            return (
              <button key={v} onClick={() => setType(v)} className={cn(type !== v && 'chip-inactive', 'inline-flex items-center gap-1.5')} style={chipStyle(type === v, '#b5d4c8')}>
                {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                {bn ? bnLabel : en}
              </button>
            );
          })}
        </div>
      </Field>

      <Field>
        <Label>{bn ? 'আপনার অনুরোধ' : 'Describe what you need'}</Label>
        <AutoTextarea minRows={4} style={inputStyle} value={input} onChange={e => setInput(e.target.value)} placeholder={bn ? 'যেমন: ক্লাস ৯-এর জন্য নিউটনের...' : 'e.g. Create a 45-min lesson plan for Class 9...'} />
        <div className="flex justify-between items-center">
          <button onClick={() => setInput(bn ? 'ক্লাস ৯-এর জন্য নিউটনের সূত্রের উপর ৪৫ মিনিটের পাঠ পরিকল্পনা তৈরি করুন' : 'Create a 45-min lesson plan for Class 9 on Newton\'s Laws of Motion')} className="bg-transparent border-none text-[#b5d4c8] text-[11px] cursor-pointer px-0 py-1 opacity-75 hover:opacity-100 transition-opacity">{bn ? 'উদাহরণ দেখুন' : 'Try an example'}</button>
        </div>
      </Field>

      <button style={primaryBtn('#b5d4c8','rgba(181,212,200,.28)')} onClick={() => run(input)} disabled={loading || !input.trim()}>
        <UserGroupIcon className="w-4 h-4" />
        {loading ? (bn ? 'তৈরি হচ্ছে...' : 'Generating…') : (bn ? 'তৈরি করুন' : 'Generate')}
      </button>

      <ResponseBox text={output} accent="#b5d4c8" onRegenerate={output ? () => run() : null} loading={loading} bn={bn} />
    </>
  );
}
