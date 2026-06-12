import React, { useState, useRef, useCallback, useEffect } from 'react';
import QuestionMarkCircleIcon from '@heroicons/react/24/outline/QuestionMarkCircleIcon';
import { CardHeader, Field, Label, inputStyle, primaryBtn, AutoTextarea, CustomDropdown, WordCount } from './UIHelpers.jsx';
import ResponseBox from './ResponseBox.jsx';
import VoiceInput from './voice/VoiceInput.jsx';
import { subjects, questionExamples, questionExamplesBn } from '../lib/curriculum.js';

export default function QuestionsPanel({ bn, callAPI, buildQuestionsPrompt, trackActivity, QUESTION_TYPES = [['mixed','Mixed Types','মিশ্র ধরন'],['mcq','Multiple Choice (MCQ)','বহুনির্বাচনী (MCQ)'],['short','Short Answer','সংক্ষিপ্ত উত্তর'],['problem','Problem Solving','সমস্যা সমাধান'],['creative','Creative / Essay','সৃজনশীল']] }) {
  const [subject, setSubject] = useState(subjects[0]);
  const [qType, setQType] = useState('mixed');
  const [count, setCount] = useState('5');
  const [topic, setTopic] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const lastArgs = useRef(null);
  const abortRef = useRef(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  // Listen for URL-based prefill (?topic=) so deep links can pre-populate the topic.
  useEffect(() => {
    const onPrefill = (e) => {
      const topic = e?.detail?.topic;
      if (typeof topic === 'string' && topic.trim()) setTopic(topic);
    };
    window.addEventListener('lamina-prefill', onPrefill);
    return () => window.removeEventListener('lamina-prefill', onPrefill);
  }, []);

  const run = useCallback(async (args) => {
    const { sub, qt, cnt, top } = args || lastArgs.current || { sub: subject.en, qt: qType, cnt: count, top: topic };
    if (!top.trim()) return;
    lastArgs.current = { sub, qt, cnt, top };
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true); setOutput('');
    try { const sys = buildQuestionsPrompt ? buildQuestionsPrompt(bn, qt, cnt) : ''; const msg = bn ? `বিষয়: ${subject.bn}, টপিক: ${top}, প্রশ্নের সংখ্যা: ${cnt}` : `Subject: ${sub}, Topic: ${top}, Count: ${cnt}`; const resp = await callAPI(sys, msg, { signal: controller.signal, onChunk: (chunk, full) => { if (!controller.signal.aborted) setOutput(full); } }); setOutput(resp); if (trackActivity) trackActivity(top, 'questions', resp); }
    catch (e) { setOutput(e.message || String(e)); }
    setLoading(false);
  }, [bn, subject.en, qType, count, topic, callAPI, buildQuestionsPrompt, trackActivity]);

  return (
    <>
      <CardHeader icon={QuestionMarkCircleIcon} color="#e76d83" title={bn ? 'প্রশ্ন সাজেস্ট করুন' : 'Suggest Questions'} subtitle={bn ? 'যেকোনো টপিকের জন্য NCTB-সামঞ্জস্যপূর্ণ অনুশীলন প্রশ্ন তৈরি করুন।' : 'Generate NCTB-aligned practice questions at mixed difficulty levels for any topic or chapter.'} />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Field>
          <Label>{bn ? 'বিষয়' : 'Subject'}</Label>
          <CustomDropdown
            options={subjects.map(s => ({ value: s.en, label: bn ? s.bn : s.en }))}
            value={subject.en}
            onChange={v => setSubject(subjects.find(s => s.en === v))}
          />
        </Field>
        <Field>
          <Label>{bn ? 'প্রশ্নের ধরন' : 'Question Type'}</Label>
          <CustomDropdown
            options={QUESTION_TYPES.map(([v, en, bnLabel]) => ({ value: v, label: bn ? bnLabel : en }))}
            value={qType}
            onChange={setQType}
          />
        </Field>
        <Field>
          <Label>{bn ? 'প্রশ্নের সংখ্যা' : 'Number of Questions'}</Label>
          <CustomDropdown
            options={['3','5','8','10'].map(n => ({ value: n, label: `${n} ${bn ? 'টি প্রশ্ন' : 'Questions'}` }))}
            value={count}
            onChange={setCount}
          />
        </Field>
      </div>
      <Field>
        <Label>{bn ? 'টপিক বা অধ্যায়' : 'Topic or Chapter'}</Label>
        <div className="relative">
          <AutoTextarea minRows={2} maxLength={2000} style={{ ...inputStyle, paddingRight: 48 }} value={topic} onChange={e => setTopic(e.target.value)} placeholder={bn ? 'যেমন: আলোর প্রতিফলন...' : 'e.g. Laws of Thermodynamics...'} />
          <VoiceInput value={topic} onChange={setTopic} accent="#e76d83" />
        </div>
        <div className="flex justify-between items-center">
          <button onClick={() => setTopic(bn ? (questionExamplesBn[subject.en] || '') : (questionExamples[subject.en] || ''))} className="bg-transparent border-none text-accent-coral text-caption cursor-pointer px-0 py-1 opacity-75 hover:opacity-100 transition-opacity">{bn ? 'উদাহরণ দেখুন' : 'Try an example'}</button>
          <WordCount text={topic} accent="#e76d83" />
        </div>
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <button style={primaryBtn('#e76d83','rgba(231,109,131,.28)')} onClick={() => run({ qt: qType, cnt: count, top: topic })} disabled={loading || !topic.trim()}>
          <QuestionMarkCircleIcon className="w-4 h-4" />
          {loading ? (bn ? 'তৈরি হচ্ছে...' : 'Generating…') : (bn ? 'প্রশ্ন তৈরি করুন' : 'Generate Questions')}
        </button>
        {loading && (
          <button type="button" onClick={() => abortRef.current?.abort()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-base-500 bg-transparent text-base-200 hover:text-base-50 hover:border-base-400 transition-colors"
            aria-label={bn ? 'বাতিল করুন' : 'Cancel'}>
            {bn ? 'বাতিল' : 'Cancel'}
          </button>
        )}
      </div>
      <ResponseBox text={output} accent="#e76d83" onRegenerate={output ? () => run(lastArgs.current) : null} loading={loading} bn={bn} isStreaming={loading} />

      {!output && !loading && !topic.trim() && (
        <div className="mt-4 flex flex-col gap-2" aria-label={bn ? 'উদাহরণ টপিক' : 'Example topics'}>
          <div className="text-caption text-base-300 uppercase tracking-widest">
            {bn ? 'চেষ্টা করুন' : 'Try one of these topics'}
          </div>
          <div className="flex flex-wrap gap-2">
            {(bn ? (questionExamplesBn[subject.en] || '') : (questionExamples[subject.en] || ''))
              .split('|').map(s => s.trim()).filter(Boolean).slice(0, 4)
              .map((ex, i) => (
                <button key={i} type="button" onClick={() => setTopic(ex)}
                  className="px-3 py-1.5 text-caption rounded-full border border-accent-coral/30 bg-accent-coral/[0.08] text-accent-coral hover:bg-accent-coral/15 hover:border-accent-coral/50 transition-colors text-left">
                  {ex}
                </button>
              ))}
          </div>
        </div>
      )}
    </>
  );
}
