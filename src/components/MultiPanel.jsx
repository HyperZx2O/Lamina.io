import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GlobeAltIcon, ScissorsIcon, LanguageIcon } from '@heroicons/react/24/outline';
import { CardHeader, Field, Label, inputStyle, primaryBtn, chipStyle, AutoTextarea } from './UIHelpers.jsx';
import { cn } from '../lib/utils.js';
import ResponseBox from './ResponseBox.jsx';
import { detectBanglish, findNonAllowedLanguage } from '../lib/langDetect.js';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const MULTI_MODES = [
  ['translate', 'Translate', 'অনুবাদ'],
  ['simplify',  'Simplify',  'সরলীকরণ'],
];

const MODE_ICONS = {
  translate: LanguageIcon,
  simplify:  ScissorsIcon,
};

const KIND_LABELS = {
  translate: {
    en:       { en: 'English detected',  bn: 'ইংরেজি শনাক্ত',   intent: { en: 'will translate to Bangla',           bn: 'বাংলায় অনুবাদ হবে' } },
    bn:       { en: 'Bangla detected',   bn: 'বাংলা শনাক্ত',    intent: { en: 'will translate to English',           bn: 'ইংরেজিতে অনুবাদ হবে' } },
    banglish: { en: 'Banglish detected', bn: 'বাংলিশ শনাক্ত',  intent: { en: 'will produce বাংলা + English pair',   bn: 'বাংলা + English জোড়া তৈরি হবে' } },
  },
  simplify: {
    en:       { en: 'English detected',  bn: 'ইংরেজি শনাক্ত',   intent: { en: 'will simplify in English',            bn: 'ইংরেজিতে সরলীকরণ হবে' } },
    bn:       { en: 'Bangla detected',   bn: 'বাংলা শনাক্ত',    intent: { en: 'will simplify in Bangla',             bn: 'বাংলায় সরলীকরণ হবে' } },
    banglish: { en: 'Banglish detected', bn: 'বাংলিশ শনাক্ত',  intent: { en: 'will produce বাংলা + English pair',   bn: 'বাংলা + English জোড়া তৈরি হবে' } },
  },
};

export default function MultiPanel({ bn, callAPI, buildMultiPrompt, trackActivity }) {
  const [mode, setMode] = useState('translate');
  const [input, setInput] = useState('');
  const [sideBySide, setSideBySide] = useState(false);
  const [detectedKind, setDetectedKind] = useState('en');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const lastInput = useRef('');
  const modeRef = useRef(mode);
  const abortRef = useRef(null);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const debouncedInput = useDebounce(input, 400);

  useEffect(() => {
    if (debouncedInput.trim()) {
      setDetectedKind(detectBanglish(debouncedInput));
    }
  }, [debouncedInput]);

  const run = useCallback(async (txt) => {
    const t = txt !== undefined ? txt : lastInput.current;
    if (!t.trim()) return;
    lastInput.current = t;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setOutput('');
    try {
      const otherLang = findNonAllowedLanguage(t);
      if (otherLang) {
        throw new Error(`These are words from ${otherLang} and are not allowed.`);
      }
      const systemPrompt = buildMultiPrompt ? buildMultiPrompt(modeRef.current) : 'Perform the requested operation.';
      const resp = await callAPI(systemPrompt, t, controller.signal);
      if (trackActivity) trackActivity(t, 'multi', resp);
      setOutput(resp);
    } catch (e) {
      setOutput(e.message || String(e));
    }
    setLoading(false);
  }, [callAPI, buildMultiPrompt, trackActivity]);

  const modeLabels = KIND_LABELS[mode] || KIND_LABELS.translate;
  const kind = modeLabels[detectedKind] || modeLabels.en;
  const ModeIcon = MODE_ICONS[mode] || GlobeAltIcon;
  const hasInput = input.trim().length > 0;

  return (
    <>
      <CardHeader
        icon={GlobeAltIcon}
        color="#c98ca7"
        title={bn ? 'বহুভাষিক বিষয়বস্তু' : 'Multilingual Content'}
        subtitle={bn
          ? 'ইংরেজি, বাংলা ও বাংলিশের মধ্যে অনুবাদ, সরলীকরণ ও প্রতিবর্ণীকরণ — ভাষা স্বয়ংক্রিয়ভাবে শনাক্ত হয়।'
          : 'Translate, simplify, or transliterate between English, Bangla, and Banglish — language is auto-detected.'}
      />

      <Field>
        <Label>{bn ? 'রূপান্তরের ধরন' : 'Conversion Mode'}</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {MULTI_MODES.map(([value, enLabel, bnLabel]) => {
            const Icon = MODE_ICONS[value];
            return (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={cn(mode !== value && 'chip-inactive', 'inline-flex items-center gap-1.5')}
                style={chipStyle(mode === value, '#c98ca7')}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {bn ? bnLabel : enLabel}
              </button>
            );
          })}
        </div>
      </Field>

      <Field>
        <Label>{bn ? 'পাঠ্য' : 'Text'}</Label>
        <div className="relative">
          <AutoTextarea
            minRows={5}
            style={inputStyle}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={
              mode === 'translate'
                ? (bn
                    ? 'অনুবাদ বা প্রতিবর্ণীকরণ করতে যেকোনো ইংরেজি, বাংলা বা বাংলিশ পাঠ্য পেস্ট করুন...'
                    : 'Paste any English, Bangla, or Banglish text to translate or transliterate...')
                : (bn
                    ? 'সরলীকরণ করতে যেকোনো ইংরেজি বা বাংলা পাঠ্য পেস্ট করুন...'
                    : 'Paste any English or Bangla text to simplify...')
            }
          />
          {hasInput && (
            <span className="absolute top-1 right-2 text-xs text-accent-sage">
              {(bn ? kind.bn : kind.en)} · {bn ? kind.intent.bn : kind.intent.en}
            </span>
          )}
        </div>
      </Field>

      <div className="flex items-center gap-2 mt-2">
        <button
          style={primaryBtn('#c98ca7', 'rgba(201,140,167,.28)')}
          onClick={() => run(input)}
          disabled={loading || !input.trim()}
        >
          <ModeIcon className="w-4 h-4" />
          {loading
            ? (bn ? 'প্রক্রিয়া চলছে…' : 'Working…')
            : (bn ? 'চালান' : 'Run')}
        </button>
        <button
          style={primaryBtn('#c98ca7', 'rgba(201,140,167,.12)')}
          onClick={() => setSideBySide(!sideBySide)}
        >
          {sideBySide ? 'Single View' : 'Side by Side'}
        </button>
      </div>

      {sideBySide ? (
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[250px]">
            <Label>{bn ? 'মূল ইনপুট' : 'Original'}</Label>
            <div className="bg-base-600 p-3 rounded-lg text-base-50 whitespace-pre-wrap">{input}</div>
          </div>
          <div className="flex-1 min-w-[250px]">
            <Label>{bn ? 'ফলাফল' : 'Result'}</Label>
            <ResponseBox text={output} accent="#c98ca7" onRegenerate={output ? () => run() : null} loading={loading} bn={bn} />
          </div>
        </div>
      ) : (
        <ResponseBox text={output} accent="#c98ca7" onRegenerate={output ? () => run() : null} loading={loading} bn={bn} />
      )}
    </>
  );
}
