import React, { useEffect, useMemo, useState } from 'react';
import MicrophoneIcon from '@heroicons/react/24/outline/MicrophoneIcon';
import StopCircleIcon from '@heroicons/react/24/outline/StopCircleIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import { cn } from '../../lib/utils.js';
import { detectLanguage } from '../../lib/langDetect.js';
import useVoiceRecognition from '../../lib/useVoiceRecognition.js';

/**
 * VoiceInput — a small mic button that drives the Web Speech API via
 * useVoiceRecognition and streams recognized text into a parent's
 * controlled input value.
 *
 * Place it inside a `relative` wrapper next to an input or textarea.
 * The button is positioned absolutely in the bottom-right corner and
 * inherits the theme via the .voice-mic-btn* CSS classes.
 *
 * Props:
 *   value     — current input value (string)
 *   onChange  — (newValue: string) => void
 *   lang      — BCP-47 tag (e.g. 'bn-BD', 'en-US') OR a function
 *               `() => bcp47` evaluated on every start. Pass a
 *               function when the language should follow whatever
 *               the user has already typed.
 *   append    — if true, recognized text is appended to value (with
 *               a single space if needed). If false, the input is
 *               replaced. Default true.
 */
export default function VoiceInput({ value, onChange, lang, append = true, className, accent }) {
  // If the caller didn't supply a lang, default to a function that
  // follows the value's script. This is the common case for the five
  // input panels — they don't pass lang at all and expect bilingual
  // behaviour out of the box.
  const langProvider = useMemo(() => {
    if (lang) return typeof lang === 'function' ? lang : () => lang;
    return () => {
      const tag = detectLanguage(value || '');
      if (tag === 'bn') return 'bn-BD';
      // Latin script (including empty input, English, or Banglish)
      // → default to en-US. en-US is the most widely-supported model
      // and handles mixed Roman-letter Bengali poorly, so callers
      // who want Banglish can pass `lang={() => 'en-IN'}` explicitly.
      return 'en-US';
    };
  }, [lang, value]);
  const { supported, listening, interim, error, retrying, toggle } = useVoiceRecognition({ lang: langProvider });
  const [hovered, setHovered] = useState(false);
  // Live BCP-47 tag for the tooltip — read from the input value so
  // the "Speak now" hint switches when the user types in a new script.
  const activeBcp = langProvider();
  const isBangla = activeBcp === 'bn-BD';

  // Stream final transcripts into the input value. We listen to the
  // custom event the hook fires on every `isFinal` result, so the
  // hook itself stays presentation-agnostic.
  useEffect(() => {
    if (!supported) return;
    const onFinal = (e) => {
      const text = e?.detail?.transcript?.trim();
      if (!text) return;
      if (append) {
        const needsSpace = value && !value.endsWith(' ') && !value.endsWith('\n');
        onChange((value || '') + (needsSpace ? ' ' : '') + text);
      } else {
        onChange(text);
      }
    };
    window.addEventListener('lamina-voice-final', onFinal);
    return () => window.removeEventListener('lamina-voice-final', onFinal);
  }, [supported, append, value, onChange]);

  const tooltip = !supported
    ? 'Voice input not supported in this browser. Try Chrome or Edge.'
    : retrying
      ? 'Reconnecting to speech service…'
      : listening
        ? 'Tap to stop recording'
        : error === 'offline'
          ? isBangla
            ? 'অফলাইনে ভয়েস ইনপুট বন্ধ — সংযোগ ফিরে এলে আবার চেষ্টা করুন'
            : 'Voice input is unavailable offline. Reconnect to use it.'
          : error
            ? `Microphone error: ${error}`
          : 'Tap to dictate';

  // Icon priority: retrying (spinner) > error (gold triangle) > recording
  // (stop circle) > idle (mic).
  const Icon = retrying
    ? ArrowPathIcon
    : error && !listening
      ? ExclamationTriangleIcon
      : listening
        ? StopCircleIcon
        : MicrophoneIcon;

  return (
    <button
      type="button"
      onClick={toggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={!supported}
      aria-label={listening ? 'Stop voice input' : 'Start voice input'}
      title={tooltip}
      className={cn(
        'voice-mic-btn',
        listening && 'voice-mic-btn--recording',
        retrying && 'voice-mic-btn--retrying',
        error && !listening && !retrying && 'voice-mic-btn--error',
        !supported && 'voice-mic-btn--disabled',
        className
      )}
      style={accent ? { '--voice-accent': accent } : undefined}
    >
      <Icon className={cn('w-4 h-4', retrying && 'voice-mic-icon--spin')} />
      {hovered && !listening && supported && !error && (
        <span className="voice-mic-tooltip">
          {isBangla ? 'বাংলায় বলুন' : 'Speak now'}
        </span>
      )}
      {interim && listening && (
        <span className="voice-mic-interim" aria-live="polite">
          {interim.length > 24 ? interim.slice(0, 24) + '…' : interim}
        </span>
      )}
    </button>
  );
}
