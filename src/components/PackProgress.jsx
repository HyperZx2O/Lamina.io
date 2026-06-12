import { useEffect, useState, useCallback } from 'react';
import {
  ChartBarIcon,
  CheckBadgeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../lib/utils';
import { listUnsyncedAttempts } from '../lib/offlineStore';

/**
 * Progress summary card for the offline catalogue. Pulls the user's
 * aggregate stats from `/api/progress/summary` and overlays a small
 * indicator if there are unsynced attempts sitting in IndexedDB.
 */
export default function PackProgress({ userId = 'anon', bn = false }) {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [res, pendingList] = await Promise.all([
        fetch(`/api/progress/summary?userId=${encodeURIComponent(userId)}`),
        listUnsyncedAttempts().catch(() => []),
      ]);
      if (res.ok) {
        const json = await res.json();
        setStats(json);
      }
      setPending(pendingList.length);
    } catch (err) {
      console.debug('[PackProgress] refresh failed', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener('lamina:pending-changed', onChange);
    window.addEventListener('lamina:syncing', onChange);
    window.addEventListener('lamina:pack-saved', onChange);
    return () => {
      window.removeEventListener('lamina:pending-changed', onChange);
      window.removeEventListener('lamina:syncing', onChange);
      window.removeEventListener('lamina:pack-saved', onChange);
    };
  }, [refresh]);

  const retrySync = useCallback(async () => {
    setSyncing(true);
    try {
      const pending = await listUnsyncedAttempts();
      if (pending.length === 0) return;
      const res = await fetch('/api/progress/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, attempts: pending }),
      });
      if (res.ok) {
        const json = await res.json();
        // mark all sent ones as synced
        const { markSynced } = await import('../lib/offlineStore');
        for (const a of pending) {
          try {
            await markSynced(a.id);
          } catch (_) {
            /* ignore */
          }
        }
        window.dispatchEvent(new CustomEvent('lamina:pending-changed'));
        if (json && typeof json.accepted === 'number') {
          // best-effort refresh
          refresh();
        }
      }
    } catch (err) {
      console.warn('[PackProgress] retry sync failed', err);
    } finally {
      setSyncing(false);
    }
  }, [userId, refresh]);

  const total = stats?.totalAttempts ?? 0;
  const correct = stats?.correctAttempts ?? 0;
  const accuracy = stats?.accuracy ?? 0;
  const unique = stats?.uniquePacks ?? 0;

  return (
    <section className="rounded-xl border border-[var(--surface-3)] bg-[var(--surface-1)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <ChartBarIcon className="h-4 w-4 text-[var(--accent-sage)]" />
        <h2 className="font-display text-sm uppercase tracking-wide text-[var(--accent-sage)]">
          {bn ? 'আপনার অগ্রগতি' : 'Your progress'}
        </h2>
        <button
          type="button"
          onClick={refresh}
          className="ml-auto rounded-md p-1 text-[var(--text-soft)] hover:bg-[var(--surface-2)]"
          aria-label={bn ? 'রিফ্রেশ' : 'Refresh'}
        >
          <ArrowPathIcon className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label={bn ? 'কুইজ' : 'Quizzes'} value={total} />
        <Stat label={bn ? 'সঠিকতা' : 'Accuracy'} value={`${Math.round(accuracy * 100)}%`} />
        <Stat
          label={bn ? 'ইউনিক প্যাক' : 'Packs'}
          value={unique}
        />
      </div>
      {pending > 0 && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 px-2.5 py-1.5 text-xs">
          <div className="inline-flex items-center gap-1.5 text-[var(--accent-gold)]">
            <CheckBadgeIcon className="h-3.5 w-3.5" />
            {bn
              ? `${pending}টি স্থানীয় স্কোর সিঙ্কের অপেক্ষায়`
              : `${pending} score${pending === 1 ? '' : 's'} waiting to sync`}
          </div>
          <button
            type="button"
            onClick={retrySync}
            disabled={syncing}
            className="rounded-md border border-[var(--accent-gold)]/40 px-2 py-0.5 text-[11px] text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/15 disabled:opacity-60"
          >
            {syncing ? (bn ? 'সিঙ্ক হচ্ছে…' : 'Syncing…') : bn ? 'এখনই সিঙ্ক' : 'Sync now'}
          </button>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-[var(--surface-3)] bg-[var(--surface-2)] px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-soft)]">
        {label}
      </div>
      <div className="text-base font-display text-[var(--text-strong)] mt-0.5">
        {value}
      </div>
    </div>
  );
}
