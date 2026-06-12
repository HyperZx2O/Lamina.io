import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import GlobeAltIcon from '@heroicons/react/24/outline/GlobeAltIcon';
import ScissorsIcon from '@heroicons/react/24/outline/ScissorsIcon';
import LanguageIcon from '@heroicons/react/24/outline/LanguageIcon';
import ArrowsRightLeftIcon from '@heroicons/react/24/outline/ArrowsRightLeftIcon';
import Squares2X2Icon from '@heroicons/react/24/outline/Squares2X2Icon';
import { CardHeader, Field, Label, inputStyle, primaryBtn, chipStyle, AutoTextarea } from './UIHelpers.jsx';
import { cn } from '../lib/utils.js';
import ResponseBox from './ResponseBox.jsx';
import VoiceInput from './voice/VoiceInput.jsx';
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

/**
 * Try to split model output into a bilingual {bangla, english} pair.
 * The multilingual system prompt instructs the model to reply with lines like:
 *   বাংলা: <bangla text>
 *   English: <english text>
 * Returns null if the pair shape isn't detected, so the caller can fall back
 * to a single ResponseBox.
 */
function parseBilingualPair(text) {
  if (!text || typeof text !== 'string') return null;
  // Accept either Latin "English" or Bangla "ইংরেজি" as the English label,
  // and either "বাংলা" or "Bangla" as the Bangla label.
  const banglaRe   = /(?:^|\n)\s*(?:বাংলা|Bangla)\s*[:：]\s*([\s\S]*?)(?=\n\s*(?:English|ইংরেজি)\s*[:：]|$)/i;
  const englishRe  = /(?:^|\n)\s*(?:English|ইংরেজি)\s*[:：]\s*([\s\S]*?)$/i;
  const b = text.match(banglaRe);
  const e = text.match(englishRe);
  if (!b || !e) return null;
  const bangla  = b[1].trim();
  const english = e[1].trim();
  if (!bangla || !english) return null;
  return { bangla, english };
}

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

  // Listen for URL-based prefill (?topic=) so deep links can pre-populate the input.
  useEffect(() => {
    const onPrefill = (e) => {
      const topic = e?.detail?.topic;
      if (typeof topic === 'string' && topic.trim()) setInput(topic);
    };
    window.addEventListener('lamina-prefill', onPrefill);
    return () => window.removeEventListener('lamina-prefill', onPrefill);
  }, []);

  const debouncedInput = useDebounce(input, 400);

  useEffect(() => {
    if (debouncedInput.trim()) {
      setDetectedKind(detectBanglish(debouncedInput));
    }
  }, [debouncedInput]);

  // Parse streaming output for a bilingual "বাংলা: ... / English: ..." pair.
  // Memoized so re-renders caused by other state changes don't re-parse.
  const bilingualPair = useMemo(() => parseBilingualPair(output), [output]);

  // Track the most recent run id so we can auto-flip the side-by-side toggle
  // exactly once per run when the first bilingual-shaped chunk arrives.
  const runIdRef = useRef(0);
  const autoFlippedForRef = useRef(0);

  const run = useCallback(async (txt) => {
    const t = txt !== undefined ? txt : lastInput.current;
    if (!t.trim()) return;
    lastInput.current = t;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const myRunId = ++runIdRef.current;
    setLoading(true);
    setOutput('');
    try {
      const otherLang = findNonAllowedLanguage(t);
      if (otherLang) {
        throw new Error(`These are words from ${otherLang} and are not allowed.`);
      }
      const systemPrompt = buildMultiPrompt ? buildMultiPrompt(modeRef.current) : 'Perform the requested operation.';
      const resp = await callAPI(systemPrompt, t, {
        signal: controller.signal,
        onChunk: (chunk, full) => {
          if (controller.signal.aborted) return;
          setOutput(full);
          // The first time a run yields a complete bilingual pair, flip the
          // user into side-by-side mode automatically so they actually see
          // the two columns.
          if (
            autoFlippedForRef.current !== myRunId &&
            parseBilingualPair(full)
          ) {
            autoFlippedForRef.current = myRunId;
            setSideBySide(true);
          }
        },
      });
      if (trackActivity) trackActivity(t, 'multi', resp);
      setOutput(resp);
      if (autoFlippedForRef.current !== myRunId && parseBilingualPair(resp)) {
        autoFlippedForRef.current = myRunId;
        setSideBySide(true);
      }
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
            style={{ ...inputStyle, paddingRight: 48 }}
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
          <VoiceInput value={input} onChange={setInput} accent="#c98ca7" />
        </div>
      </Field>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
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
          style={primaryBtn('#c98ca7', sideBySide ? 'rgba(201,140,167,.28)' : 'rgba(201,140,167,.12)')}
          onClick={() => setSideBySide(!sideBySide)}
          aria-pressed={sideBySide}
          title={bn
            ? (sideBySide ? 'একক দৃশ্যে ফিরে যান' : 'পাশাপাশি দৃশ্য দেখুন')
            : (sideBySide ? 'Switch to single view' : 'Show input and result side by side')}
        >
          {sideBySide
            ? <Squares2X2Icon className="w-4 h-4" />
            : <ArrowsRightLeftIcon className="w-4 h-4" />}
          {sideBySide
            ? (bn ? 'একক দৃশ্য' : 'Single View')
            : (bn ? 'পাশাপাশি' : 'Side by Side')}
          {bilingualPair && (
            <span
              className="ml-1 inline-flex items-center px-1.5 py-0.5 text-[10px] rounded-full bg-accent-rose/20 text-accent-rose border border-accent-rose/30"
              title={bn ? 'বাংলা + English জোড়া পাওয়া গেছে' : 'Bilingual pair detected'}
            >
              বাং/EN
            </span>
          )}
        </button>
        {loading && (
          <button type="button" onClick={() => abortRef.current?.abort()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-base-500 bg-transparent text-base-200 hover:text-base-50 hover:border-base-400 transition-colors"
            aria-label={bn ? 'বাতিল করুন' : 'Cancel'}>
            {bn ? 'বাতিল' : 'Cancel'}
          </button>
        )}
      </div>

      {sideBySide ? (
        bilingualPair ? (
          // Bilingual pair detected — render two language columns that
          // stream in lockstep with `output`. The columns stay in sync
          // because both pull from the same `bilingualPair` memo.
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <Label>বাংলা</Label>
              <div
                dir="auto"
                className="bg-base-600 p-3 rounded-lg text-base-50 whitespace-pre-wrap min-h-[80px] border border-accent-rose/20"
              >
                {bilingualPair.bangla || (loading
                  ? <span className="inline-block w-3 h-4 bg-accent-rose/60 animate-pulse rounded-sm" />
                  : '')}
              </div>
            </div>
            <div className="flex-1 min-w-[250px]">
              <Label>English</Label>
              <div
                dir="auto"
                className="bg-base-600 p-3 rounded-lg text-base-50 whitespace-pre-wrap min-h-[80px] border border-accent-rose/20"
              >
                {bilingualPair.english || (loading
                  ? <span className="inline-block w-3 h-4 bg-accent-rose/60 animate-pulse rounded-sm" />
                  : '')}
              </div>
            </div>
            {output && !loading && (
              <div className="w-full flex justify-end">
                <button
                  type="button"
                  onClick={() => run()}
                  className="text-caption px-3 py-1.5 rounded-full border border-accent-rose/30 bg-accent-rose/[0.08] text-accent-rose hover:bg-accent-rose/15 hover:border-accent-rose/50 transition-colors"
                >
                  {bn ? 'পুনরায় চালান' : 'Regenerate'}
                </button>
              </div>
            )}
          </div>
        ) : (
          // Single-language or pre-pair output — fall back to input + result.
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <Label>{bn ? 'মূল ইনপুট' : 'Original'}</Label>
              <div className="bg-base-600 p-3 rounded-lg text-base-50 whitespace-pre-wrap min-h-[80px]">{input}</div>
            </div>
            <div className="flex-1 min-w-[250px]">
              <Label>{bn ? 'ফলাফল' : 'Result'}</Label>
              <ResponseBox text={output} accent="#c98ca7" onRegenerate={output ? () => run() : null} loading={loading} bn={bn} isStreaming={loading} />
            </div>
          </div>
        )
      ) : (
        <ResponseBox text={output} accent="#c98ca7" onRegenerate={output ? () => run() : null} loading={loading} bn={bn} isStreaming={loading} />
      )}

      {!output && !loading && !input.trim() && (
        <div className="mt-4 flex flex-col gap-2" aria-label={bn ? 'উদাহরণ প্রম্পট' : 'Example prompts'}>
          <div className="text-caption text-base-300 uppercase tracking-widest">
            {bn ? 'চেষ্টা করুন' : 'Try one of these'}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              bn ? 'আমাকে বাংলিশ শিখতে সাহায্য করুন' : 'Translate this to Bangla: "I am studying for my exam tomorrow."',
              bn ? 'এই পাঠ্যটি সরল করুন' : 'Simplify: "The photosynthetic process facilitates..."',
              bn ? 'ইংরেজিতে অনুবাদ করুন' : 'Translate this to English: আমি কাল পরীক্ষার জন্য পড়ছি।',
            ].map((ex, i) => (
              <button key={i} type="button" onClick={() => setInput(ex)}
                className="px-3 py-1.5 text-caption rounded-full border border-accent-rose/30 bg-accent-rose/[0.08] text-accent-rose hover:bg-accent-rose/15 hover:border-accent-rose/50 transition-colors text-left">
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
