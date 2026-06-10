import React, { useState, useRef, useCallback } from 'react';
import { CardHeader, Field, Label, inputStyle, primaryBtn, AutoTextarea, CustomDropdown } from './UIHelpers.jsx';
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
  { en: 'Career Ed.', bn: 'ক্যারিয়ার শিক্ষা' },
];

const subjectExample = {
  'Physics': 'Work, Power and Energy',
  'Chemistry': 'Chemical Reactions and Equations',
  'Biology': 'Cell Division and Genetics',
  'Math': 'Quadratic Equations',
  'Higher Math': 'Matrices and Determinants',
  'ICT': 'Programming Basics with Python',
  'Bangla': 'পদ প্রকরণ ও বাক্য',
  'English': 'Nelson Mandela: A Long Walk to Freedom',
  'BGS': 'Bangladesh Economy and Development',
  'History & Social Sci.': 'British Colonial Rule in Bengal',
  'Geography & Env.': 'Physical Geography of Bangladesh',
  'Economics': 'Basic Concepts of Economics',
  'Civics': 'Citizenship and Human Rights',
  'Accounting': 'Introduction to Accounting',
  'Business Principles': 'Business Environment and Organization',
  'Finance & Banking': 'Banking and Financial System of Bangladesh',
  'Islam & Moral Ed.': 'Islamic Beliefs and Modern Life',
  'Hindu Religion': 'Hindu Philosophy and Scriptures',
  'Christian Religion': 'Christian Life and Service',
  'Buddhist Religion': 'Buddhist Philosophy and Meditation',
  'Agriculture': 'Agriculture in Bangladesh',
  'Home Science': 'Nutrition and Meal Planning',
  'Phy. Education': 'Physical Fitness and Disease Prevention',
  'Work & Life Ed.': 'Career Planning and Financial Literacy',
  'Arts & Crafts': 'Bangladeshi Art Heritage and Design',
  'Career Ed.': 'Career Planning and Financial Literacy',
};

const subjectExampleBn = {
  'Physics': 'কাজ, ক্ষমতা ও শক্তি',
  'Chemistry': 'রাসায়নিক বিক্রিয়া ও সমীকরণ',
  'Biology': 'কোষ বিভাজন ও জিনতত্ত্ব',
  'Math': 'দ্বিঘাত সমীকরণ',
  'Higher Math': 'ম্যাট্রিক্স ও ডিটারমিন্যান্ট',
  'ICT': 'পাইথন দিয়ে প্রোগ্রামিং',
  'Bangla': 'পদ প্রকরণ ও বাক্য',
  'English': 'নেলসন ম্যান্ডেলা',
  'BGS': 'বাংলাদেশের অর্থনীতি ও উন্নয়ন',
  'History & Social Sci.': 'বাংলায় ব্রিটিশ শাসন',
  'Geography & Env.': 'বাংলাদেশের ভৌগোলিক পরিচিতি',
  'Economics': 'অর্থনীতির মৌলিক ধারণা',
  'Civics': 'নাগরিকত্ব ও মানবাধিকার',
  'Accounting': 'হিসাববিজ্ঞানের পরিচিতি',
  'Business Principles': 'ব্যবসায় পরিবেশ ও সংগঠন',
  'Finance & Banking': 'ব্যাংকিং ও আর্থিক ব্যবস্থা',
  'Islam & Moral Ed.': 'ইসলামী বিশ্বাস ও আধুনিক জীবন',
  'Hindu Religion': 'হিন্দু দর্শন ও ধর্মগ্রন্থ',
  'Christian Religion': 'খ্রীষ্টিয় জীবন ও সেবা',
  'Buddhist Religion': 'বৌদ্ধ দর্শন ও ধ্যান',
  'Agriculture': 'বাংলাদেশে কৃষি',
  'Home Science': 'পুষ্টি ও খাদ্য পরিকল্পনা',
  'Phy. Education': 'শারীরিক সুস্থতা ও রোগ প্রতিরোধ',
  'Work & Life Ed.': 'ক্যারিয়ার পরিকল্পনা ও আর্থিক সাক্ষরতা',
  'Arts & Crafts': 'বাংলাদেশের শিল্প ঐতিহ্য ও নকশা',
  'Career Ed.': 'ক্যারিয়ার পরিকল্পনা ও আর্থিক সাক্ষরতা',
};

export default function QuestionsPanel({ bn, callAPI, buildQuestionsPrompt, QUESTION_TYPES = [['mixed','Mixed Types','মিশ্র ধরন'],['mcq','Multiple Choice (MCQ)','বহুনির্বাচনী (MCQ)'],['short','Short Answer','সংক্ষিপ্ত উত্তর'],['problem','Problem Solving','সমস্যা সমাধান'],['creative','Creative / Essay','সৃজনশীল']] }) {
  const [subject, setSubject] = useState(subjects[0]);
  const [qType, setQType] = useState('mixed');
  const [count, setCount] = useState('5');
  const [topic, setTopic] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const lastArgs = useRef(null);

  const run = useCallback(async (args) => {
    const { sub, qt, cnt, top } = args || lastArgs.current || { sub: subject.en, qt: qType, cnt: count, top: topic };
    if (!top.trim()) return;
    lastArgs.current = { sub, qt, cnt, top };
    setLoading(true); setOutput(''); setError('');
    try { const sys = buildQuestionsPrompt ? buildQuestionsPrompt(bn, qt, cnt) : ''; const msg = bn ? `বিষয়: ${subject.bn}, টপিক: ${top}, প্রশ্নের সংখ্যা: ${cnt}` : `Subject: ${sub}, Topic: ${top}, Count: ${cnt}`; setOutput(await callAPI(sys, msg)); }
    catch (e) { setError(e.message || String(e)); }
    setLoading(false);
  }, [bn, subject, qType, count, topic, callAPI, buildQuestionsPrompt]);

  return (
    <>
      <CardHeader icon="❓" color="#e76d83" title={bn ? 'প্রশ্ন সাজেস্ট করুন' : 'Suggest Questions'} subtitle={bn ? 'যেকোনো টপিকের জন্য NCTB-সামঞ্জস্যপূর্ণ অনুশীলন প্রশ্ন তৈরি করুন।' : 'Generate NCTB-aligned practice questions at mixed difficulty levels for any topic or chapter.'} />
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
        <AutoTextarea minRows={2} style={inputStyle} value={topic} onChange={e => setTopic(e.target.value)} placeholder={bn ? 'যেমন: আলোর প্রতিফলন...' : 'e.g. Laws of Thermodynamics...'} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setTopic(bn ? subjectExampleBn[subject.en] : subjectExample[subject.en])} style={{ background: 'none', border: 'none', color: '#e76d83', fontSize: 11, cursor: 'pointer', padding: '4px 0', opacity: 0.75 }}>{bn ? 'উদাহরণ দেখুন' : 'Try an example'}</button>
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
