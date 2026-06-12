import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useVoiceRecognition — thin React wrapper over the Web Speech API.
 *
 * The browser's SpeechRecognition is event-driven, leaks globally-scoped
 * recognition instances, and has wildly different support between Chrome /
 * Edge (full), Firefox (none), and Safari (incomplete). This hook:
 *
 *   - Detects support via window.SpeechRecognition / webkitSpeechRecognition.
 *   - Owns the lifecycle (start/stop/cancel) via a ref so React renders
 *     don't tear down the recognition instance mid-utterance.
 *   - Streams interim transcripts through onInterim so the UI can show
 *     "live" words as the user speaks.
 *   - Calls onFinal with the *appended* final transcript, never the raw
 *     event — so callers can just concatenate into their input value.
 *   - Surfaces errors as a string so the button can show a tooltip.
 *
 * `lang` may be a BCP-47 string ('bn-BD', 'en-US') OR a function that
 * returns one. The function form is evaluated every time start() is
 * called so the recogniser switches to match the user's current input
 * (e.g. mid-session Bangla → English, or vice versa). When omitted
 * we fall back to `bn-BD` since the primary audience is Bangladeshi.
 *
 * Returns { supported, listening, transcript, interim, error, start, stop, toggle }.
 */
export default function useVoiceRecognition({ lang, continuous = true, interimResults = true } = {}) {
  const resolveLang = useCallback(() => {
    if (typeof lang === 'function') return lang();
    if (lang) return lang;
    return 'bn-BD';
  }, [lang]);

  const Ctor = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;
  const supported = Boolean(Ctor);

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  // True when we hit a transient failure (e.g. Chromium 'network' error
  // reaching Google's speech service) and are auto-retrying with a fresh
  // instance. Surfaces a "Reconnecting…" hint to the UI.
  const [retrying, setRetrying] = useState(false);

  const recognitionRef = useRef(null);
  // Track if the user explicitly stopped during a transient retry so we
  // don't yank them back into listening mode.
  const userStoppedRef = useRef(false);
  const retryTimerRef = useRef(null);
  // The lang tag the current SpeechRecognition instance was built
  // with. If the caller asks for a different one, we have to throw
  // the instance away and build a new one — Chrome/Edge ignore
  // `recognition.lang = ...` mutations on an already-created object.
  const lastLangRef = useRef(null);
  // Keep the latest callbacks in a ref so we don't recreate the
  // recognition instance on every render. The instance is created
  // once in start() and reused.
  const optsRef = useRef({ continuous, interimResults });
  optsRef.current = { continuous, interimResults };

  // Stop on unmount so we don't leak a mic indicator in the tab.
  useEffect(() => () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    try { recognitionRef.current?.abort(); } catch { /* noop */ }
  }, []);

  const start = useCallback(() => {
    if (!supported) {
      setError('not-supported');
      return;
    }
    // Offline guard: SpeechRecognition itself works locally in
    // Chromium, but the post-recognition AI call (which the caller
    // will fire via /api/claude) cannot. Block the mic from opening
    // when offline so the user doesn't dictate something that gets
    // dropped on the floor — surface a clear "offline" error instead
    // that the button can render as a tooltip.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('offline');
      setListening(false);
      return;
    }
    setError('');
    setInterim('');
    // Clear any pending retry — the user just asked to listen.
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setRetrying(false);
    userStoppedRef.current = false;

    // Resolve the language each time we start so the recogniser
    // matches whatever the user has typed (or is about to dictate).
    const activeLang = resolveLang();

    // If we already have an instance, just resume it.
    let rec = recognitionRef.current;
    // If the language changed since we last built the instance, the
    // existing recogniser is stuck in the previous model (Chromium
    // ignores lang mutations on a live instance). Tear it down so
    // the rebuild below picks up the new model.
    if (rec && lastLangRef.current && lastLangRef.current !== activeLang) {
      try { rec.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
      rec = null;
    }
    if (!rec) {
      rec = new Ctor();
      recognitionRef.current = rec;
      rec.continuous = optsRef.current.continuous;
      rec.interimResults = optsRef.current.interimResults;
      rec.lang = activeLang;
      rec.maxAlternatives = 1;

      rec.onresult = (event) => {
        let finalText = '';
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }
        if (interimText) setInterim(interimText);
        // The hook itself doesn't write to the input — callers get
        // a `transcript` field they can read or merge. The button
        // component handles appending.
        if (finalText) {
          // Defer to the listener via a custom event so the consumer
          // can choose to append, replace, or ignore.
          window.dispatchEvent(new CustomEvent('lamina-voice-final', {
            detail: { transcript: finalText }
          }));
          setInterim('');
        }
      };

      rec.onerror = (event) => {
        const code = event.error || 'unknown';
        // 'no-speech' is a soft error — user opened mic but didn't talk.
        // We just stop listening and let the button return to idle.
        if (code === 'no-speech' || code === 'aborted') {
          setListening(false);
          return;
        }
        // 'network' is a transient Chromium failure reaching Google's
        // speech service (occasional outage, region block, or the
        // well-known "Missing X-Origin" header). The browser will
        // close the recognition session, so we just start a fresh
        // instance after a short backoff. The user can still hit the
        // mic again to cancel the retry.
        if (code === 'network') {
          if (userStoppedRef.current) {
            setError('network');
            setListening(false);
            setRetrying(false);
            return;
          }
          setRetrying(true);
          // Drop the dead instance so the retry starts clean.
          try { recognitionRef.current?.abort(); } catch { /* noop */ }
          recognitionRef.current = null;
          setListening(false);
          retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            if (userStoppedRef.current) {
              setRetrying(false);
              return;
            }
            setRetrying(false);
            setError('');
            // Recursively call start() — it will build a fresh
            // recognition instance and attach all the handlers again.
            start();
          }, 600);
          return;
        }
        setError(code);
        setListening(false);
      };

      rec.onend = () => {
        setListening(false);
        setInterim('');
        // If the user wanted continuous mode and the browser auto-stopped
        // (Chrome ends recognition after ~60s of silence in non-continuous
        // mode), don't auto-restart. The user can tap the mic again.
      };
    } else {
      // Same lang as last time, and the instance is alive — nothing
      // to do. (We already handled the lang-changed case above by
      // tearing down the instance.)
    }

    // Remember which language this instance was built for so we can
    // rebuild it next time the caller switches.
    lastLangRef.current = activeLang;

    try {
      rec.start();
      setListening(true);
    } catch (e) {
      // start() throws if recognition is already started. Ignore.
      setListening(true);
    }
  }, [Ctor, supported, resolveLang]);

  const stop = useCallback(() => {
    // Mark user-intent so an in-flight retry doesn't yank the mic back on.
    userStoppedRef.current = true;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setRetrying(false);
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    setListening(false);
    setInterim('');
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, interim, error, retrying, start, stop, toggle };
}
