import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../lib/utils';
import { getPack, saveAttempt, listUnsyncedAttempts, markSynced } from '../lib/offlineStore';

/**
 * Offline quiz UI. Walks the user through every question in the pack
 * one at a time, shows immediate feedback after each answer, then
 * records the whole attempt to IndexedDB and tries to sync to the
 * server. If the network is down, the attempt stays in IDB and a
 * background flush picks it up on next online.
 */
export default function PackQuiz({ packId, bn = false, onClose, onExit }) {
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]); // per question: chosenIndex | null
  const [revealed, setRevealed] = useState([]); // per question: bool
  const [done, setDone] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // 'ok' | 'queued' | 'err'

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPack(packId);
        if (cancelled) return;
        if (!data) {
          setError(bn ? 'প্যাকটি সেভ করা নেই' : 'Pack not saved offline');
        } else {
          setPack(data);
          setAnswers(new Array((data.questions || []).length).fill(null));
          setRevealed(new Array((data.questions || []).length).fill(false));
        }
      } catch (err) {
        console.error('[PackQuiz] load failed', err);
        setError(bn ? 'প্যাক লোড ব্যর্থ' : 'Could not load pack');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [packId, bn]);

  const questions = useMemo(
    () => (pack && Array.isArray(pack.questions) ? pack.questions : []),
    [pack]
  );
  const total = questions.length;
  const q = questions[step];
  const chosen = answers[step];
  const isRevealed = revealed[step];
  const correctCount = useMemo(() => {
    if (!questions.length) return 0;
    return answers.reduce((acc, a, i) => {
      if (a == null) return acc;
      const correct = questions[i].answerIndex;
      return acc + (a === correct ? 1 : 0);
    }, 0);
  }, [answers, questions]);

  const choose = useCallback(
    (idx) => {
      if (isRevealed) return;
      setAnswers((prev) => {
        const next = [...prev];
        next[step] = idx;
        return next;
      });
      setRevealed((prev) => {
        const next = [...prev];
        next[step] = true;
        return next;
      });
    },
    [step, isRevealed]
  );

  const next = useCallback(() => {
    if (step + 1 < total) {
      setStep(step + 1);
    } else {
      setDone(true);
    }
  }, [step, total]);

  // Persist + sync when quiz finishes
  useEffect(() => {
    if (!done || !pack) return;
    let cancelled = false;
    (async () => {
      const attempt = {
        id: `${packId}-${Date.now()}`,
        packId,
        class: pack.class,
        subject: pack.subject,
        chapter: pack.id,
        answers: questions.map((q, i) => ({
          questionId: q.id || i,
          chosen: answers[i],
          correct: q.answerIndex,
          correctFlag: answers[i] === q.answerIndex,
        })),
        totalQuestions: total,
        correctCount,
        finishedAt: new Date().toISOString(),
        synced: false,
      };
      await saveAttempt(attempt);
      setSyncing(true);
      try {
        const res = await fetch('/api/progress/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'anon', attempts: [attempt] }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await markSynced(attempt.id);
        if (!cancelled) setSyncStatus('ok');
      } catch (err) {
        console.warn('[PackQuiz] sync failed, will retry', err);
        if (!cancelled) setSyncStatus('queued');
        window.dispatchEvent(new CustomEvent('lamina:pending-changed'));
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [done, pack, packId, questions, answers, total, correctCount]);

  // If a sync lands while we're sitting on the results screen, refresh status.
  useEffect(() => {
    if (!done) return;
    const handler = async () => {
      try {
        const pending = await listUnsyncedAttempts();
        if (pending.length === 0) setSyncStatus('ok');
      } catch (_) {
        /* noop */
      }
    };
    window.addEventListener('lamina:pending-changed', handler);
    return () => window.removeEventListener('lamina:pending-changed', handler);
  }, [done]);

  if (loading) {
    return (
      <Centered>
        <div className="h-6 w-6 rounded-full border-2 border-[var(--accent-sage)] border-t-transparent animate-spin" />
      </Centered>
    );
  }

  if (error || !pack) {
    return (
      <Centered>
        <div className="rounded-xl border border-[var(--accent-coral)]/40 bg-[var(--accent-coral)]/10 p-4 text-sm text-[var(--accent-coral)]">
          {error || (bn ? 'প্যাক পাওয়া যায়নি' : 'Pack not found')}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 text-sm text-[var(--text-soft)] underline"
        >
          {bn ? 'ফিরে যান' : 'Go back'}
        </button>
      </Centered>
    );
  }

  // Results screen
  if (done) {
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--bg)]">
        <div className="mx-auto max-w-md px-4 py-10 text-center">
          <TrophyIcon className="mx-auto h-12 w-12 text-[var(--accent-gold)]" />
          <h2 className="font-display text-2xl mt-3 text-[var(--text-strong)]">
            {bn ? 'কুইজ সম্পন্ন!' : 'Quiz complete!'}
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label={bn ? 'মোট' : 'Total'} value={total} />
            <Stat label={bn ? 'সঠিক' : 'Correct'} value={correctCount} />
            <Stat label={bn ? 'শতাংশ' : 'Score'} value={`${pct}%`} />
          </div>
          <SyncStatus status={syncStatus} syncing={syncing} bn={bn} />
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setStep(0);
                setAnswers(new Array(total).fill(null));
                setRevealed(new Array(total).fill(false));
                setDone(false);
                setSyncStatus(null);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--surface-3)] bg-[var(--surface-1)] px-4 py-2.5 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--surface-2)]"
            >
              <ArrowPathIcon className="h-4 w-4" />
              {bn ? 'আবার চেষ্টা করুন' : 'Try again'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[var(--accent-sage)] px-4 py-2.5 text-sm font-medium text-white hover:brightness-110"
            >
              {bn ? 'পাঠে ফিরুন' : 'Back to lesson'}
            </button>
            <button
              type="button"
              onClick={onExit}
              className="text-xs text-[var(--text-soft)] underline"
            >
              {bn ? 'তালিকায় ফিরুন' : 'Back to catalogue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active question
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--bg)]">
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--surface-3)] bg-[var(--surface-1)] p-2 hover:bg-[var(--surface-2)] transition-colors"
            aria-label={bn ? 'ফিরে যান' : 'Back'}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-wide text-[var(--text-soft)]">
              {bn ? 'প্রশ্ন' : 'Question'} {step + 1} / {total}
            </div>
            <div className="h-1.5 mt-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div
                className="h-full bg-[var(--accent-sage)] transition-all"
                style={{ width: `${((step + 1) / total) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--surface-3)] bg-[var(--surface-1)] p-5">
          <h3 className="text-base font-medium text-[var(--text-strong)] leading-snug">
            {bn && q.promptBn ? q.promptBn : q.prompt}
          </h3>
          <div className="mt-4 space-y-2">
            {(q.options || []).map((opt, i) => {
              const isChosen = chosen === i;
              const isCorrect = q.answerIndex === i;
              let tone =
                'border-[var(--surface-3)] bg-[var(--surface-1)] text-[var(--text)] hover:bg-[var(--surface-2)]';
              if (isRevealed) {
                if (isCorrect) {
                  tone =
                    'border-[var(--accent-sage)]/50 bg-[var(--accent-sage)]/10 text-[var(--text-strong)]';
                } else if (isChosen && !isCorrect) {
                  tone =
                    'border-[var(--accent-coral)]/50 bg-[var(--accent-coral)]/10 text-[var(--text-strong)]';
                } else {
                  tone =
                    'border-[var(--surface-3)] bg-[var(--surface-1)] text-[var(--text-soft)] opacity-60';
                }
              }
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isRevealed}
                  onClick={() => choose(i)}
                  className={cn(
                    'w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-colors',
                    tone,
                    !isRevealed && 'cursor-pointer'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium',
                        isChosen
                          ? 'border-[var(--accent-sage)] bg-[var(--accent-sage)] text-white'
                          : 'border-[var(--surface-3)] text-[var(--text-soft)]'
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">
                      {bn && opt.bn ? opt.bn : opt.text}
                    </span>
                    {isRevealed && isCorrect && (
                      <CheckCircleIcon className="h-4 w-4 text-[var(--accent-sage)]" />
                    )}
                    {isRevealed && isChosen && !isCorrect && (
                      <XCircleIcon className="h-4 w-4 text-[var(--accent-coral)]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {isRevealed && q.explanation && (
            <div className="mt-3 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text)]">
              {bn && q.explanationBn ? q.explanationBn : q.explanation}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={next}
            disabled={!isRevealed}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              isRevealed
                ? 'bg-[var(--accent-sage)] text-white hover:brightness-110'
                : 'bg-[var(--surface-2)] text-[var(--text-soft)] cursor-not-allowed'
            )}
          >
            {step + 1 === total
              ? bn
                ? 'শেষ করুন'
                : 'Finish'
              : bn
              ? 'পরবর্তী'
              : 'Next'}
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-[var(--surface-3)] bg-[var(--surface-1)] p-3">
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-soft)]">
        {label}
      </div>
      <div className="text-xl font-display text-[var(--text-strong)] mt-0.5">
        {value}
      </div>
    </div>
  );
}

function SyncStatus({ status, syncing, bn }) {
  if (syncing) {
    return (
      <div className="mt-4 text-xs text-[var(--text-soft)] inline-flex items-center gap-1.5">
        <div className="h-3 w-3 rounded-full border-2 border-[var(--accent-blue)] border-t-transparent animate-spin" />
        {bn ? 'সিঙ্ক হচ্ছে…' : 'Syncing…'}
      </div>
    );
  }
  if (status === 'ok') {
    return (
      <div className="mt-4 text-xs text-[var(--accent-sage)] inline-flex items-center gap-1.5">
        <CheckCircleIcon className="h-3.5 w-3.5" />
        {bn ? 'সার্ভারে সেভ হয়েছে' : 'Saved to server'}
      </div>
    );
  }
  if (status === 'queued') {
    return (
      <div className="mt-4 text-xs text-[var(--accent-gold)] inline-flex items-center gap-1.5">
        {bn
          ? 'অফলাইনে সেভ হয়েছে — পরে সিঙ্ক হবে'
          : 'Saved locally — will sync when you are back online'}
      </div>
    );
  }
  return null;
}

function Centered({ children }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--bg)] p-6 text-center">
      {children}
    </div>
  );
}
