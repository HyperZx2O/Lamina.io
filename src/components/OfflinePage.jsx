import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ArrowLeftIcon,
  CloudArrowDownIcon,
  CheckCircleIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  WifiIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../lib/utils';
import {
  savePack,
  deletePack,
  listPacks,
  getPackMeta,
} from '../lib/offlineStore';
import PackReader from './PackReader.jsx';
import PackProgress from './PackProgress.jsx';
import StreakBadge from './StreakBadge.jsx';

/**
 * The offline study-pack catalogue. Renders a filterable, searchable
 * grid of every pack the server has generated. Each card shows a
 * download/saved toggle. Tapping a saved card opens PackReader in a
 * slide-in panel.
 *
 * Routing convention: the page is mounted at /offline by main.jsx. The
 * optional sub-route /offline/pack/:id opens the reader directly.
 */
export default function OfflinePage({ bn = false }) {
  const [packs, setPacks] = useState([]); // server-side catalogue
  const [saved, setSaved] = useState({}); // id -> meta (from IDB)
  const [query, setQuery] = useState('');
  const [activeClass, setActiveClass] = useState('all');
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(null); // pack id or null
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null); // pack id currently being saved
  const [saveError, setSaveError] = useState(null); // last save failure

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, savedList] = await Promise.all([
        fetch('/api/packs/list').then((r) => r.json()),
        getPackMeta(),
      ]);
      setPacks(Array.isArray(list.packs) ? list.packs : []);
      const savedMap = {};
      savedList.forEach((m) => {
        savedMap[m.id] = m;
      });
      setSaved(savedMap);
    } catch (err) {
      console.error('[OfflinePage] load failed', err);
      setError(bn ? 'তালিকা লোড করা যায়নি' : 'Could not load catalogue');
    } finally {
      setLoading(false);
    }
  }, [bn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Sync route -> opening state. We listen for both `popstate` (browser
  // back/forward) and `lamina:navigate` (in-app pushState from the
  // pill/reader) so opening a pack always re-evaluates the URL.
  useEffect(() => {
    const sync = () => {
      const m = window.location.pathname.match(/^\/offline\/pack\/([^/]+)$/);
      setOpening(m ? decodeURIComponent(m[1]) : null);
    };
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener('lamina:navigate', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('lamina:navigate', sync);
    };
  }, []);

  const navigate = useCallback((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('lamina:navigate'));
  }, []);

  const classes = useMemo(() => {
    const set = new Set();
    packs.forEach((p) => {
      if (p.classLabel) set.add(p.classLabel);
    });
    return ['all', ...Array.from(set).sort()];
  }, [packs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return packs.filter((p) => {
      if (activeClass !== 'all' && p.classLabel !== activeClass) return false;
      if (!q) return true;
      return (
        (p.title || '').toLowerCase().includes(q) ||
        (p.titleBn || '').toLowerCase().includes(q) ||
        (p.subjectLabel || p.subject || '').toLowerCase().includes(q)
      );
    });
  }, [packs, activeClass, query]);

  const onSave = useCallback(
    async (id) => {
      setBusyId(id);
      setSaveError(null);
      try {
        const res = await fetch(`/api/packs/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // Server wraps the pack in { ok, pack }; unwrap so savePack sees
        // the real record with id/title/class/subject/questions.
        const body = await res.json();
        const pack = body && body.pack ? body.pack : body;
        if (!pack || !pack.id) {
          throw new Error('Malformed pack response');
        }
        await savePack(pack);
        setSaved((prev) => ({ ...prev, [id]: { id, savedAt: Date.now() } }));
        window.dispatchEvent(new CustomEvent('lamina:pack-saved'));
      } catch (err) {
        console.error('[OfflinePage] save failed', err);
        setSaveError(
          bn
            ? `${id} সেভ করা যায়নি — আবার চেষ্টা করুন`
            : `Couldn't save ${id} — check your connection and try again`
        );
      } finally {
        setBusyId(null);
      }
    },
    [bn]
  );

  const onRemove = useCallback(async (id) => {
    await deletePack(id);
    setSaved((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    window.dispatchEvent(new CustomEvent('lamina:pack-saved'));
  }, []);

  return (
    <div className="min-h-screen w-full px-4 sm:px-8 py-6">
      <div className="mx-auto max-w-5xl">
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-full border border-[var(--surface-3)] bg-[var(--surface-1)] p-2 hover:bg-[var(--surface-2)] transition-colors"
            aria-label={bn ? 'ফিরে যান' : 'Back'}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-2xl text-[var(--text-strong)]">
              {bn ? 'অফলাইন স্টাডি প্যাক' : 'Offline Study Packs'}
            </h1>
            <p className="text-caption text-[var(--text-soft)] mt-0.5">
              {bn
                ? 'ইন্টারনেট ছাড়াই পড়ুন, কুইজ দিন, স্ট্রিক বাড়ান'
                : 'Read lessons, take quizzes, and build your streak — no internet required'}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <StreakBadge bn={bn} />
            <div className="flex items-center gap-1 rounded-full border border-[var(--accent-sage)]/30 bg-[var(--accent-sage)]/10 px-2.5 py-1 text-[11px] uppercase tracking-wide text-[var(--accent-sage)]">
              <WifiIcon className="h-3.5 w-3.5" />
              <span>{Object.keys(saved).length} saved</span>
            </div>
          </div>
        </div>

        <div className="mb-5">
          <PackProgress bn={bn} />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={bn ? 'প্যাক খুঁজুন…' : 'Search packs…'}
              className="w-full rounded-lg border border-[var(--surface-3)] bg-[var(--surface-1)] pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-sage)]"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {classes.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActiveClass(c)}
                className={cn(
                  'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                  activeClass === c
                    ? 'bg-[var(--accent-sage)]/15 border-[var(--accent-sage)]/40 text-[var(--accent-sage)]'
                    : 'border-[var(--surface-3)] bg-[var(--surface-1)] text-[var(--text-soft)] hover:bg-[var(--surface-2)]'
                )}
              >
                {c === 'all' ? (bn ? 'সব' : 'All') : `Class ${c}`}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        {error && (
          <div className="rounded-xl border border-[var(--accent-coral)]/40 bg-[var(--accent-coral)]/10 p-4 text-sm text-[var(--accent-coral)]">
            {error}
          </div>
        )}

        {saveError && (
          <div className="rounded-xl border border-[var(--accent-coral)]/40 bg-[var(--accent-coral)]/10 p-3 text-sm text-[var(--accent-coral)] flex items-start justify-between gap-3">
            <span>{saveError}</span>
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="shrink-0 text-xs underline opacity-80 hover:opacity-100"
            >
              {bn ? 'বন্ধ' : 'Dismiss'}
            </button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-xl border border-[var(--surface-3)] bg-[var(--surface-1)] animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--surface-3)] p-8 text-center text-sm text-[var(--text-soft)]">
            {bn ? 'কোনো প্যাক পাওয়া যায়নি' : 'No packs match your filter'}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((p) => {
              const isSaved = !!saved[p.id];
              return (
                <article
                  key={p.id}
                  className={cn(
                    'group rounded-xl border p-4 flex flex-col gap-2 transition-all',
                    'border-[var(--surface-3)] bg-[var(--surface-1)] hover:border-[var(--accent-sage)]/40 hover:shadow-sm'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] uppercase tracking-wide text-[var(--text-soft)]">
                        Class {p.classLabel} · {p.subjectLabel || p.subject}
                      </div>
                      <h3 className="font-medium text-[var(--text-strong)] leading-tight mt-0.5 line-clamp-2">
                        {bn && p.titleBn ? p.titleBn : p.title}
                      </h3>
                    </div>
                    {isSaved && (
                      <CheckCircleIcon
                        className="h-5 w-5 shrink-0 text-[var(--accent-sage)]"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--text-soft)]">
                    {p.questionCount} {bn ? 'প্রশ্ন' : 'questions'} ·{' '}
                    {p.lessonSections} {bn ? 'বিভাগ' : 'sections'} ·{' '}
                    {Math.round((p.sizeBytes || 0) / 1024)} KB
                  </div>
                  <div className="mt-auto flex gap-2 pt-2">
                    {isSaved ? (
                      <>
                        <button
                          type="button"
                          onClick={() => navigate(`/offline/pack/${p.id}`)}
                          className="flex-1 rounded-lg border border-[var(--accent-sage)]/40 bg-[var(--accent-sage)]/10 px-3 py-1.5 text-xs font-medium text-[var(--accent-sage)] hover:bg-[var(--accent-sage)]/20"
                        >
                          {bn ? 'পড়ুন' : 'Read'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(p.id)}
                          className="rounded-lg border border-[var(--surface-3)] p-1.5 text-[var(--text-soft)] hover:text-[var(--accent-coral)] hover:border-[var(--accent-coral)]/40"
                          aria-label={bn ? 'মুছুন' : 'Remove from offline'}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSave(p.id)}
                        disabled={busyId === p.id}
                        className={cn(
                          'flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                          busyId === p.id
                            ? 'border-[var(--surface-3)] bg-[var(--surface-2)] text-[var(--text-soft)] cursor-wait'
                            : 'border-[var(--surface-3)] bg-[var(--surface-2)] text-[var(--text-strong)] hover:bg-[var(--surface-3)]'
                        )}
                      >
                        {busyId === p.id ? (
                          <span className="h-3 w-3 rounded-full border-2 border-[var(--text-soft)] border-t-transparent animate-spin" />
                        ) : (
                          <CloudArrowDownIcon className="h-4 w-4" />
                        )}
                        {busyId === p.id
                          ? bn ? 'সেভ হচ্ছে…' : 'Saving…'
                          : bn ? 'সেভ করুন' : 'Save offline'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Pack reader overlay */}
      {opening && (
        <PackReader
          packId={opening}
          bn={bn}
          onClose={() => navigate('/offline')}
        />
      )}
    </div>
  );
}
