import React, { useEffect, useState } from 'react';
import MicrophoneIcon from '@heroicons/react/24/outline/MicrophoneIcon';
import StopCircleIcon from '@heroicons/react/24/outline/StopCircleIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import { cn } from '../../lib/utils.js';
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
 *   lang      — BCP-47 tag, default 'bn-BD'
 *   append    — if true, recognized text is appended to value (with
 *               a single space if needed). If false, the input is
 *               replaced. Default true.
 */
export default function VoiceInput({ value, onChange, lang = 'bn-BD', append = true, className, accent }) {
  const { supported, listening, interim, error, toggle } = useVoiceRecognition({ lang });
  const [hovered, setHovered] = useState(false);

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
    : listening
      ? 'Tap to stop recording'
      : error
        ? `Microphone error: ${error}`
        : 'Tap to dictate';

  const Icon = error && !listening
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
        error && !listening && 'voice-mic-btn--error',
        !supported && 'voice-mic-btn--disabled',
        className
      )}
      style={accent ? { '--voice-accent': accent } : undefined}
    >
      <Icon className="w-4 h-4" />
      {hovered && !listening && supported && !error && (
        <span className="voice-mic-tooltip">
          {lang === 'bn-BD' ? 'বাংলায় বলুন' : 'Speak now'}
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
