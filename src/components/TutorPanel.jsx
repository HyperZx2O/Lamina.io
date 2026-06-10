import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CardHeader, Field, Label, inputStyle, primaryBtn, secondaryBtn, AutoTextarea, CustomDropdown } from './UIHelpers.jsx';
import ResponseBox from './ResponseBox.jsx';

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

// Full NCTB subject list
const subjects = [
  { en: 'Physics', bn: 'পদার্থবিজ্ঞান' },
  { en: 'Chemistry', bn: 'রসায়ন' },
  { en: 'Biology', bn: 'জীববিজ্ঞান' },
  { en: 'Math', bn: 'গণিত' },
  { en: 'Higher Math', bn: 'উচ্চতর গণিত' },
  { en: 'ICT', bn: 'তথ্য ও যোগাযোগ প্রযুক্তি' },
  { en: 'Bangla', bn: 'বাংলা' },
  { en: 'English', bn: 'ইংরেজি' },
  { en: 'BGS', bn: 'বাংলাদেশ ও বিশ্বপরিচয়' },
  { en: 'History & Social Sci.', bn: 'ইতিহাস ও সমাজবিজ্ঞান' },
  { en: 'Geography & Env.', bn: 'ভূগোল ও পরিবেশ' },
  { en: 'Economics', bn: 'অর্থনীতি' },
  { en: 'Civics', bn: 'নাগরিক শিক্ষা' },
  { en: 'Accounting', bn: 'হিসাববিজ্ঞান' },
  { en: 'Business Principles', bn: 'ব্যবসায় নীতি' },
  { en: 'Finance & Banking', bn: 'অর্থ ও ব্যাংকিং' },
  { en: 'Islam & Moral Ed.', bn: 'ইসলাম ও নৈতিক শিক্ষা' },
  { en: 'Hindu Religion', bn: 'হিন্দু ধর্ম' },
  { en: 'Christian Religion', bn: 'ক্রিশ্চিয়ান ধর্ম' },
  { en: 'Buddhist Religion', bn: 'বৌদ্ধ ধর্ম' },
  { en: 'Agriculture', bn: 'কৃষি' },
  { en: 'Home Science', bn: 'গৃহ বিজ্ঞান' },
  { en: 'Phy. Education', bn: 'শারীরিক শিক্ষা' },
  { en: 'Work & Life Ed.', bn: 'কর্ম ও জীবনমুখী শিক্ষা' },
  { en: 'Arts & Crafts', bn: 'শিল্প ও হস্তশিল্প' },
  { en: 'Career Ed.', bn: 'ক্যারিয়ার শিক্ষা' }
];

const subjectExample = {
  'Physics': 'Explain Newton\'s Second Law of Motion',
  'Chemistry': 'Explain the process of balancing chemical equations',
  'Biology': 'Describe the process of mitosis and its importance',
  'Math': 'How do you solve a quadratic equation using the quadratic formula?',
  'Higher Math': 'How do you find the determinant of a 3x3 matrix?',
  'ICT': 'What is a computer network and what are its types?',
  'Bangla': 'পদ প্রকরণ কাকে বলে? উদাহরণ সহ ব্যাখ্যা করুন।',
  'English': 'Summarise the story of Nelson Mandela\'s fight for freedom',
  'BGS': 'What are the fundamental principles of the Constitution of Bangladesh?',
  'History & Social Sci.': 'What were the causes and effects of the Battle of Plassey?',
  'Geography & Env.': 'Describe the major river systems of Bangladesh',
  'Economics': 'Explain the law of demand and supply with examples',
  'Civics': 'What are the fundamental rights of citizens in Bangladesh?',
  'Accounting': 'What is double-entry bookkeeping? Explain with an example',
  'Business Principles': 'What are the different types of business organisations?',
  'Finance & Banking': 'How does mobile banking work in Bangladesh?',
  'Islam & Moral Ed.': 'What are the Five Pillars of Islam? Explain each briefly',
  'Hindu Religion': 'What are the core teachings of the Bhagavad Gita?',
  'Christian Religion': 'What are the Ten Commandments and their significance?',
  'Buddhist Religion': 'What are the Four Noble Truths in Buddhism?',
  'Agriculture': 'What are the major crops grown in Bangladesh?',
  'Home Science': 'What are the components of a balanced diet?',
  'Phy. Education': 'What are the benefits of regular physical exercise?',
  'Work & Life Ed.': 'What are the qualities of a good leader?',
  'Arts & Crafts': 'What are the traditional crafts of Bangladesh?',
  'Career Ed.': 'How do you plan for a successful career?',
};

const subjectExampleBn = {
  'Physics': 'নিউটনের দ্বিতীয় সূত্র ব্যাখ্যা করুন',
  'Chemistry': 'রাসায়নিক সমীকরণ ভারসাম্যের প্রক্রিয়া ব্যাখ্যা করুন',
  'Biology': 'মাইটোসিস প্রক্রিয়া ও এর গুরুত্ব বর্ণনা করুন',
  'Math': 'দ্বিঘাত সূত্র ব্যবহার করে কীভাবে দ্বিঘাত সমীকরণ সমাধান করবেন?',
  'Higher Math': 'কীভাবে ৩x৩ ম্যাট্রিক্সের ডিটারমিন্যান্ট বের করবেন?',
  'ICT': 'কম্পিউটার নেটওয়ার্ক কী এবং এর প্রকারভেদগুলো কী কী?',
  'Bangla': 'পদ প্রকরণ কাকে বলে? উদাহরণ সহ ব্যাখ্যা করুন।',
  'English': 'নেলসন ম্যান্ডেলার স্বাধীনতা সংগ্রামের গল্প সংক্ষেপে বলুন',
  'BGS': 'বাংলাদেশ সংবিধানের মৌলিক নীতিগুলো কী কী?',
  'History & Social Sci.': 'পলাশীর যুদ্ধের কারণ ও ফলাফল কী ছিল?',
  'Geography & Env.': 'বাংলাদেশের প্রধান নদী ব্যবস্থা বর্ণনা করুন',
  'Economics': 'চাহিদা ও যোগানের নিয়ম উদাহরণ সহ ব্যাখ্যা করুন',
  'Civics': 'বাংলাদেশে নাগরিকদের মৌলিক অধিকারগুলো কী কী?',
  'Accounting': 'দ্বৈত নথি পদ্ধতি কী? একটি উদাহরণ সহ ব্যাখ্যা করুন',
  'Business Principles': 'ব্যবসায় সংগঠনের বিভিন্ন প্রকার কী কী?',
  'Finance & Banking': 'বাংলাদেশে কীভাবে মোবাইল ব্যাংকিং কাজ করে?',
  'Islam & Moral Ed.': 'ইসলামের পঞ্চস্তম্ভ কী কী? প্রতিটি সংক্ষেপে ব্যাখ্যা করুন',
  'Hindu Religion': 'ভগবদ গীতার মূল শিক্ষাগুলো কী কী?',
  'Christian Religion': 'দশটি আদেশ কী এবং এর গুরুত্ব কী?',
  'Buddhist Religion': 'বৌদ্ধধর্মের চারটি মহৎ সত্য কী কী?',
  'Agriculture': 'বাংলাদেশের প্রধান ফসলগুলো কী কী?',
  'Home Science': 'সুষম খাদ্যের উপাদানগুলো কী কী?',
  'Phy. Education': 'নিয়মিত শারীরিক ব্যায়ামের সুবিধাগুলো কী কী?',
  'Work & Life Ed.': 'একজন ভালো নেতার গুণাবলী কী কী?',
  'Arts & Crafts': 'বাংলাদেশের ঐতিহ্যবাহী কারুশিল্পগুলো কী কী?',
  'Career Ed.': 'কীভাবে একটি সফল ক্যারিয়ারের পরিকল্পনা করবেন?',
};

const subjectToRAG = {
  'Physics': 'physics', 'Chemistry': 'chemistry', 'Biology': 'biology',
  'Math': 'math', 'Higher Math': 'higher-math', 'ICT': 'ict',
  'Bangla': 'bangla', 'English': 'english',
  'BGS': 'bgs', 'History & Social Sci.': 'history', 'Geography & Env.': 'geography',
  'Economics': 'economics', 'Civics': 'civics',
  'Accounting': 'accounting', 'Business Principles': 'business-principles',
  'Finance & Banking': 'finance-banking',
  'Islam & Moral Ed.': 'religion', 'Hindu Religion': 'hindu-religion',
  'Christian Religion': 'christian-religion', 'Buddhist Religion': 'buddhist-religion',
  'Agriculture': 'agriculture', 'Home Science': 'home-science',
  'Phy. Education': 'physical-education', 'Work & Life Ed.': 'work-life',
  'Arts & Crafts': 'arts-crafts', 'Career Ed.': 'career-education',
};

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
  } catch {
    return null;
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

  const run = useCallback(async (args) => {
    const { sub, lvl, top } = args || lastArgs.current || { sub: subject.en, lvl: level, top: topic };
    if (!top.trim()) return;
    const followUp = followUpRef.current;
    const activeHistory = followUp ? history : [];
    if (!followUp) setHistory([]);
    lastArgs.current = { sub, lvl, top };
    setLoading(true);
    setOutput('');
    try {
      let sysBase = buildTutorPrompt ? buildTutorPrompt(bn, sub, lvl) : '';
      let ragSuffix = '';

      if (useRAG) {
        setRagStatus(bn ? 'পাঠ্যবই থেকে তথ্য সংগ্রহ করা হচ্ছে...' : 'Retrieving textbook content…');
        const ragResult = await fetchRAGContext(top, sub);
        if (ragResult && ragResult.enriched && ragResult.context) {
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
      const response = await callAPI(sys, combined);
      if (trackActivity) trackActivity(top, 'tutor', response);
      setOutput(response);
      if (!response.startsWith('⚠️')) {
        setHistory(prev => [...prev, { role: 'user', content: userMsg }, { role: 'assistant', content: response }]);
      }
    } catch (e) {
      setOutput(e.message || String(e));
    }
    setLoading(false);
    setIsFollowUp(false);
  }, [bn, subject, level, topic, callAPI, buildTutorPrompt, trackActivity, history, useRAG]);

  return (
    <>
      <CardHeader icon="🎓" color="#9cc4b2" title={bn ? 'অ্যাডাপটিভ টিউটর' : 'Adaptive Tutor'} subtitle={bn ? 'আপনার স্তর ও বিষয় অনুযায়ী ব্যক্তিগতকৃত পাঠ পান — NCTB পাঠ্যক্রম অনুযায়ী।' : 'Get a personalised lesson adapted to your level and subject — aligned with the NCTB curriculum.'} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#b5a8a2' }}>
          <input
            type="checkbox"
            checked={useRAG}
            onChange={e => setUseRAG(e.target.checked)}
            style={{ accentColor: '#9cc4b2' }}
          />
          {bn ? 'NCTB পাঠ্যবই থেকে তথ্য নিন' : 'Retrieve from NCTB textbooks'}
        </label>
        {ragStatus && (
          <span style={{ fontSize: 11, color: ragStatus.includes('সূত্র') || ragStatus.includes('sources') ? '#9cc4b2' : '#7a6d69', fontStyle: 'italic' }}>
            {ragStatus}
          </span>
        )}
      </div>
      <Field>
        <Label>{bn ? 'টপিক বা প্রশ্ন লিখুন' : 'Enter topic or question'}</Label>
        <AutoTextarea minRows={3} style={inputStyle} value={topic} onChange={e => setTopic(e.target.value)} placeholder={bn ? 'যেমন: নিউটনের দ্বিতীয় সূত্র...' : "e.g. Newton's Second Law..."} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setTopic(bn ? subjectExampleBn[subject.en] : subjectExample[subject.en])} style={{ background: 'none', border: 'none', color: '#9cc4b2', fontSize: 11, cursor: 'pointer', padding: '4px 0', opacity: 0.75 }}>{bn ? 'উদাহরণ দেখুন' : 'Try an example'}</button>
          <WordCount text={topic} accent="#9cc4b2" />
        </div>
      </Field>
      <button
        style={primaryBtn('#9cc4b2','rgba(156,196,178,.32)')}
        onClick={() => run({ sub: subject, lvl: level, top: topic })}
        disabled={loading || !topic.trim()}
      >
        {`🎓 ${loading ? (bn ? 'তৈরি হচ্ছে...' : 'Generating…') : (bn ? 'পাঠ তৈরি করুন' : 'Generate Lesson')}`}
      </button>
        {output && !loading && history.length > 0 && (
          <>
            <button
              style={secondaryBtn('#9cc4b2')}
              onClick={() => setIsFollowUp(prev => !prev)}
            >
              {isFollowUp ? 'Following Up ✓' : 'Follow Up'}
            </button>
            <div style={{fontFamily: 'DM Sans', fontSize: 11, fontStyle: 'italic', color: '#7a6d69', marginTop: 4}}>
              {isFollowUp ? 'Following up on previous response' : 'Starting a new conversation'}
            </div>
          </>
        )}
      {output && output.startsWith('⚠️') ? (
        <div style={{ color: '#e76d83', fontFamily: 'DM Sans', marginTop: 8, whiteSpace: 'pre-wrap' }}>{output}</div>
      ) : (
        <ResponseBox
          text={output}
          accent="#9cc4b2"
          onRegenerate={output ? () => run(lastArgs.current) : null}
          loading={loading}
          bn={bn}
          panel="Tutor"
          topic={topic}
        />
      )}

    </>
  );
}
