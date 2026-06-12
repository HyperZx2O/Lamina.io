import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../lib/utils';
import { getPack } from '../lib/offlineStore';

// Code-split the quiz view so the read chunk stays light.
const PackQuiz = lazy(() => import('./PackQuiz.jsx'));

/**
 * Renders a single offline pack's lesson content: summary, sections,
 * key terms, and flashcards. The "Take quiz" CTA hands off to the
 * PackQuiz sub-route. Always reads from IndexedDB (the whole point of
 * saving a pack), so this works fully offline.
 */
export default function PackReader({ packId, bn = false, onClose }) {
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flipped, setFlipped] = useState({}); // cardIndex -> bool
  const [quizPath, setQuizPath] = useState(null); // null = read view

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPack(packId);
        if (cancelled) return;
        if (!data) {
          setError(bn ? 'এই প্যাকটি সেভ করা নেই' : 'Pack not saved offline');
        } else {
          setPack(data);
        }
      } catch (err) {
        console.error('[PackReader] load failed', err);
        setError(bn ? 'প্যাক লোড ব্যর্থ' : 'Could not load pack');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [packId, bn]);

  const flip = useCallback((i) => {
    setFlipped((prev) => ({ ...prev, [i]: !prev[i] }));
  }, []);

  const openQuiz = useCallback(() => {
    if (!pack) return;
    const path = `/offline/pack/${encodeURIComponent(packId)}/quiz`;
    setQuizPath(path);
    window.history.pushState({ quizPackId: packId }, '', path);
    window.dispatchEvent(new CustomEvent('lamina:navigate'));
  }, [pack, packId]);

  const closeQuiz = useCallback(() => {
    const path = `/offline/pack/${encodeURIComponent(packId)}`;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('lamina:navigate'));
    setQuizPath(null);
  }, [packId]);

  if (quizPath) {
    return (
      <Suspense
        fallback={
          <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--bg-base)]">
            <div className="h-8 w-8 rounded-full border-2 border-[var(--accent-sage)] border-t-transparent animate-spin" />
          </div>
        }
      >
        <PackQuiz
          packId={packId}
          bn={bn}
          onClose={closeQuiz}
          onExit={onClose}
        />
      </Suspense>
    );
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[var(--bg-base)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--surface-3)] bg-[var(--surface-1)] p-2 hover:bg-[var(--surface-2)] transition-colors"
            aria-label={bn ? 'ফিরে যান' : 'Back to catalogue'}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          {loading ? (
            <div className="flex-1 h-5 rounded bg-[var(--surface-2)] animate-pulse" />
          ) : pack ? (
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-soft)]">
                Class {pack.class} · {pack.subject}
              </div>
              <h1 className="font-display text-xl text-[var(--text-strong)] truncate">
                {bn && pack.titleBn ? pack.titleBn : pack.title}
              </h1>
            </div>
          ) : (
            <h1 className="flex-1 text-sm text-[var(--accent-coral)]">{error}</h1>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-[var(--surface-1)] animate-pulse border border-[var(--surface-3)]"
              />
            ))}
          </div>
        )}

        {pack && !loading && (
          <div className="space-y-6">
            {/* Summary */}
            {pack.summary && (
              <section className="rounded-xl border border-[var(--surface-3)] bg-[var(--surface-1)] p-4">
                <h2 className="font-display text-sm text-[var(--accent-sage)] uppercase tracking-wide mb-1.5">
                  {bn ? 'সারাংশ' : 'Summary'}
                </h2>
                <p className="text-sm leading-relaxed text-[var(--text-strong)]">
                  {pack.summary}
                </p>
              </section>
            )}

            {/* Sections */}
            {Array.isArray(pack.sections) && pack.sections.length > 0 && (
              <section>
                <h2 className="font-display text-sm text-[var(--accent-sage)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <BookOpenIcon className="h-4 w-4" />
                  {bn ? 'পাঠ' : 'Lessons'}
                </h2>
                <div className="space-y-3">
                  {pack.sections.map((s, i) => (
                    <article
                      key={i}
                      className="rounded-xl border border-[var(--surface-3)] bg-[var(--surface-1)] p-4"
                    >
                      <h3 className="font-medium text-[var(--text-strong)] mb-1.5">
                        {bn && s.titleBn ? s.titleBn : s.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-[var(--text)] whitespace-pre-line">
                        {s.content}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Key terms */}
            {Array.isArray(pack.keyTerms) && pack.keyTerms.length > 0 && (
              <section>
                <h2 className="font-display text-sm text-[var(--accent-sage)] uppercase tracking-wide mb-2">
                  {bn ? 'মূল শব্দ' : 'Key Terms'}
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {pack.keyTerms.map((t, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-[var(--surface-3)] bg-[var(--surface-1)] px-2.5 py-1 text-xs text-[var(--text)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Flashcards */}
            {Array.isArray(pack.flashcards) && pack.flashcards.length > 0 && (
              <section>
                <h2 className="font-display text-sm text-[var(--accent-sage)] uppercase tracking-wide mb-2">
                  {bn ? 'ফ্ল্যাশকার্ড' : 'Flashcards'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {pack.flashcards.map((card, i) => {
                    const isFlipped = !!flipped[i];
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => flip(i)}
                        className={cn(
                          'rounded-xl border p-4 text-left min-h-[88px] transition-all',
                          isFlipped
                            ? 'border-[var(--accent-sage)]/50 bg-[var(--accent-sage)]/10'
                            : 'border-[var(--surface-3)] bg-[var(--surface-1)] hover:border-[var(--accent-sage)]/30'
                        )}
                      >
                        <div className="text-[10px] uppercase tracking-wide text-[var(--text-soft)] mb-1">
                          {isFlipped
                            ? bn
                              ? 'উত্তর'
                              : 'Answer'
                            : bn
                            ? 'প্রশ্ন'
                            : 'Question'}
                        </div>
                        <div className="text-sm text-[var(--text-strong)]">
                          {isFlipped ? card.back : card.front}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-[var(--text-soft)] text-center">
                  {bn ? 'উল্টাতে ট্যাপ করুন' : 'Tap a card to flip it'}
                </p>
              </section>
            )}

            {/* Quiz CTA */}
            {Array.isArray(pack.questions) && pack.questions.length > 0 && (
              <section className="sticky bottom-3">
                <button
                  type="button"
                  onClick={openQuiz}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-sage)] px-4 py-3 text-sm font-medium text-white shadow-md hover:brightness-110"
                >
                  <AcademicCapIcon className="h-5 w-5" />
                  {bn
                    ? `কুইজ দিন (${pack.questions.length}টি প্রশ্ন)`
                    : `Take the quiz (${pack.questions.length} questions)`}
                </button>
              </section>
            )}

            <footer className="pt-2 pb-8 text-center text-[11px] text-[var(--text-soft)]">
              {bn
                ? `জেনারেটর: ${pack.generator} · ${new Date(
                    pack.generatedAt
                  ).toLocaleDateString('en-GB')}`
                : `Generated by ${pack.generator} on ${new Date(
                    pack.generatedAt
                  ).toLocaleDateString('en-GB')}`}
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
