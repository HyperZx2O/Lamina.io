import React, { useState, useRef, useCallback, useEffect } from 'react';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import { cn } from '../lib/utils.js';
import { CardHeader, Field, Label, inputStyle, primaryBtn, AutoTextarea, CustomDropdown, WordCount } from './UIHelpers.jsx';
import ResponseBox from './ResponseBox.jsx';
import VoiceInput from './voice/VoiceInput.jsx';
import { subjects, tutorExamples, tutorExamplesBn, subjectToRAG } from '../lib/curriculum.js';

const TECHNICAL_ERROR_RE = /TypeError|Error:|undefined|Cannot read/i;

async function fetchRAGContext(query, subjectEn) {
  try {
    const ragSubject = subjectToRAG[subjectEn];
    const res = await fetch('/api/rag/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, subject: ragSubject }),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    return { error: e.message || 'RAG fetch failed' };
  }
}

export default function TutorPanel({ bn, callAPI, buildTutorPrompt, trackActivity }) {
  const [subject, setSubject] = useState(subjects[0]);
  const [level, setLevel] = useState('beginner');
  const [topic, setTopic] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [useRAG, setUseRAG] = useState(true);
  const [ragStatus, setRagStatus] = useState('');

  const lastArgs = useRef(null);

  const followUpRef = useRef(false);
  useEffect(() => { followUpRef.current = isFollowUp; }, [isFollowUp]);

  const abortRef = useRef(null);
  const runningRef = useRef(false);
  useEffect(() => () => abortRef.current?.abort(), []);

  // Listen for URL-based prefill (?topic=) so deep links can pre-populate the input.
  useEffect(() => {
    const onPrefill = (e) => {
      const topic = e?.detail?.topic;
      if (typeof topic === 'string' && topic.trim()) setTopic(topic);
    };
    window.addEventListener('lamina-prefill', onPrefill);
    return () => window.removeEventListener('lamina-prefill', onPrefill);
  }, []);

  const run = useCallback(async (args) => {
    if (runningRef.current) return;
    runningRef.current = true;
    const incoming = args || lastArgs.current || { sub: subject.en, lvl: level, top: topic };
    const sub = (incoming.sub && typeof incoming.sub === 'object') ? incoming.sub.en : incoming.sub;
    const lvl = incoming.lvl;
    const top = incoming.top;
    if (!top.trim()) { runningRef.current = false; return; }
    const followUp = followUpRef.current;
    const activeHistory = followUp ? history : [];
    if (!followUp) setHistory([]);
    lastArgs.current = { sub, lvl, top };
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setOutput('');
    try {
      let sysBase = buildTutorPrompt ? buildTutorPrompt(bn, sub, lvl) : '';
      let ragSuffix = '';

      if (useRAG) {
        setRagStatus(bn ? 'পাঠ্যবই থেকে তথ্য সংগ্রহ করা হচ্ছে...' : 'Retrieving textbook content…');
        const ragResult = await fetchRAGContext(top, sub);
        if (ragResult && ragResult.error) {
          setRagStatus(bn ? 'পাঠ্যবই উৎস খুঁজে পাওয়া যায়নি' : 'Could not retrieve textbook content');
        } else if (ragResult && ragResult.enriched && ragResult.context) {
          ragSuffix = `\n\nHere is relevant NCTB textbook content to use in your answer:\n${ragResult.context}\n\nUse this curriculum content to provide an accurate answer. If the content doesn't fully cover the question, supplement with your own knowledge but prioritize the textbook content.`;
          setRagStatus(bn ? ragResult.sourceCount + 'টি উৎস থেকে তথ্য পাওয়া গেছে' : ragResult.sourceCount + ' sources retrieved');
        } else {
          setRagStatus(bn ? 'পাঠ্যবইয়ে বিষয়টি পাওয়া যায়নি' : 'No textbook content found');
        }
      }

      const relevanceRule = `CRITICAL RULE — CHECK FIRST BEFORE ANYTHING ELSE:
  The user has selected the subject: ${sub}.
  Read the user's question and decide if it is related to ${sub}.
  If it is NOT related to ${sub}, you MUST respond with exactly this one line and absolutely nothing else:
  ⚠️ This question does not seem related to ${sub}. Please ask a question about ${sub}, or switch to the correct subject above.
  Do not explain. Do not help. Do not answer the question. Just output that one line and stop.
  Only if the question IS related to ${sub}, proceed to answer normally.`;

      const sys = `${relevanceRule}\n${sysBase}${ragSuffix}`;
      const userMsg = top;
      const context = activeHistory
        .map(m => (m.role === 'user' ? 'User: ' : 'AI: ') + m.content)
        .join('\n');
      const combined = context ? `${context}\nUser: ${userMsg}` : userMsg;
      const response = await callAPI(sys, combined, { signal: controller.signal, onChunk: (chunk, full) => {
        if (!controller.signal.aborted) setOutput(full);
      } });
      if (trackActivity) trackActivity(top, 'tutor', response);
      setOutput(response);
      if (!response.startsWith('⚠️')) {
        setHistory(prev => [...prev, { role: 'user', content: userMsg }, { role: 'assistant', content: response }]);
      }
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
    runningRef.current = false;
  }, [bn, subject.en, level, topic, callAPI, buildTutorPrompt, trackActivity, history, useRAG]);

  return (
    <>
      <CardHeader icon={AcademicCapIcon} color="#9cc4b2" title={bn ? 'অ্যাডাপটিভ টিউটর' : 'Adaptive Tutor'} subtitle={bn ? 'আপনার স্তর ও বিষয় অনুযায়ী ব্যক্তিগতকৃত পাঠ পান — NCTB পাঠ্যক্রম অনুযায়ী।' : 'Get a personalised lesson adapted to your level and subject — aligned with the NCTB curriculum.'} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field>
          <Label>{bn ? 'বিষয়' : 'Subject'}</Label>
          <CustomDropdown
            options={subjects.map(s => ({ value: s.en, label: bn ? s.bn : s.en }))}
            value={subject.en}
            onChange={v => setSubject(subjects.find(s => s.en === v))}
          />
        </Field>
        <Field>
          <Label>{bn ? 'শেখার স্তর' : 'Learning Level'}</Label>
          <CustomDropdown
            options={[
              { value: 'beginner', label: bn ? 'শিক্ষানবিস' : 'Beginner' },
              { value: 'intermediate', label: bn ? 'মধ্যবর্তী' : 'Intermediate' },
              { value: 'advanced', label: bn ? 'উন্নত' : 'Advanced' },
            ]}
            value={level}
            onChange={setLevel}
          />
        </Field>
      </div>
      <div className="flex items-center gap-2.5 my-1.5">
        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-base-300">
          <input
            type="checkbox"
            checked={useRAG}
            onChange={e => setUseRAG(e.target.checked)}
            className="accent-[#9cc4b2]"
          />
          {bn ? 'NCTB পাঠ্যবই থেকে তথ্য নিন' : 'Retrieve from NCTB textbooks'}
        </label>
        {ragStatus && (
          <span className={cn('text-caption italic', (ragStatus.includes('সূত্র') || ragStatus.includes('sources')) ? 'text-accent-sage' : 'text-base-300')}>
            {ragStatus}
          </span>
        )}
      </div>
      <Field>
        <Label>{bn ? 'টপিক বা প্রশ্ন লিখুন' : 'Enter topic or question'}</Label>
        <div className="relative">
          <AutoTextarea minRows={3} maxLength={2000} style={{ ...inputStyle, paddingRight: 48 }} value={topic} onChange={e => setTopic(e.target.value)} placeholder={bn ? 'যেমন: নিউটনের দ্বিতীয় সূত্র...' : "e.g. Newton's Second Law..."} />
          <VoiceInput value={topic} onChange={setTopic} accent="#9cc4b2" />
        </div>
        <div className="flex justify-between items-center">
          <button onClick={() => setTopic(bn ? (tutorExamplesBn[subject.en] || '') : (tutorExamples[subject.en] || ''))} className="bg-transparent border-none text-accent-sage text-caption cursor-pointer px-0 py-1 opacity-75 hover:opacity-100 transition-opacity">{bn ? 'উদাহরণ দেখুন' : 'Try an example'}</button>
          <WordCount text={topic} accent="#9cc4b2" />
        </div>
      </Field>

      <div className="flex flex-wrap items-stretch gap-2.5">
        <button
          style={primaryBtn('#9cc4b2','rgba(156,196,178,.32)')}
          onClick={() => run({ sub: subject.en, lvl: level, top: topic })}
          disabled={loading || !topic.trim()}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2"
        >
          <AcademicCapIcon className="w-4 h-4" />
          {loading ? (bn ? 'তৈরি হচ্ছে...' : 'Generating…') : (bn ? 'পাঠ তৈরি করুন' : 'Generate Lesson')}
        </button>
        {loading && (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-base-500 bg-transparent text-base-200 hover:text-base-50 hover:border-base-400 transition-colors"
            aria-label={bn ? 'বাতিল করুন' : 'Cancel'}
          >
            {bn ? 'বাতিল' : 'Cancel'}
          </button>
        )}
        {output && !loading && history.length > 0 && (
          <button
            style={primaryBtn('#9cc4b2','rgba(156,196,178,.32)')}
            onClick={() => setIsFollowUp(prev => !prev)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2"
            aria-pressed={isFollowUp}
            title={isFollowUp ? 'Following up on previous response' : 'Continue the conversation'}
          >
            <AcademicCapIcon className="w-4 h-4" />
            {isFollowUp
              ? (bn ? 'ফলো আপ চলছে ✓' : 'Following Up ✓')
              : (bn ? 'ফলো আপ' : 'Follow Up')}
          </button>
        )}
      </div>
      {output && !loading && history.length > 0 && (
        <div className="text-caption italic text-base-300 mt-1 font-sans">
          {isFollowUp ? 'Following up on previous response' : 'Click Follow Up to continue this conversation'}
        </div>
      )}
      {output && output.startsWith('⚠️') ? (
        <div className="flex items-start gap-2 mt-2 whitespace-pre-wrap font-sans">
          <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 shrink-0 text-accent-coral" />
          <span className="text-accent-coral">{output.replace(/^⚠️\s*/, '')}</span>
        </div>
      ) : (
        <ResponseBox
          text={output}
          accent="#9cc4b2"
          onRegenerate={output ? () => run(lastArgs.current) : null}
          loading={loading}
          bn={bn}
          isStreaming={loading}
          panel="Tutor"
          topic={topic}
        />
      )}

      {!output && !loading && (
        <div className="mt-4 flex flex-col gap-2" aria-label={bn ? 'উদাহরণ প্রম্পট' : 'Example prompts'}>
          <div className="text-caption text-base-300 uppercase tracking-widest">
            {bn ? 'চেষ্টা করুন' : 'Try asking'}
          </div>
          <div className="flex flex-wrap gap-2">
            {(bn ? (tutorExamplesBn[subject.en] || '') : (tutorExamples[subject.en] || ''))
              .split('|').map(s => s.trim()).filter(Boolean).slice(0, 4)
              .map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTopic(ex)}
                  className="px-3 py-1.5 text-caption rounded-full border border-accent-sage/30 bg-accent-sage/[0.08] text-accent-sage hover:bg-accent-sage/15 hover:border-accent-sage/50 transition-colors text-left"
                >
                  {ex}
                </button>
              ))}
          </div>
        </div>
      )}

    </>
  );
}
