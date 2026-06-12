import { useEffect, useState } from 'react';
import { SignalSlashIcon, ArrowPathIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { cn } from '../lib/utils';
import { flushPendingAI, pendingAICount } from '../lib/offlineStore';

/**
 * Slim status strip that sits under the Header. It surfaces three
 * things:
 *   1. The user is offline (shows a coral banner with a retry).
 *   2. There are queued AI requests waiting to sync (amber banner).
 *   3. A sync is currently in flight (indigo spinner).
 *
 * The banner is non-blocking: it never covers the main UI. It just
 * nudges the user when something needs attention.
 */
export default function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      // Auto-flush any pending AI requests the moment we reconnect.
      flushPendingAI().catch(() => {});
    };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    let cancelled = false;
    async function refresh() {
      try {
        const count = await pendingAICount();
        if (!cancelled) setPending(count);
      } catch (_) {
        /* IDB not ready */
      }
    }
    refresh();
    const onChanged = () => refresh();
    window.addEventListener('lamina:pending-changed', onChanged);
    const onSyncing = (e) => setSyncing(!!e.detail);
    window.addEventListener('lamina:syncing', onSyncing);

    return () => {
      cancelled = true;
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('lamina:pending-changed', onChanged);
      window.removeEventListener('lamina:syncing', onSyncing);
    };
  }, []);

  if (online && pending === 0 && !syncing) return null;

  return (
    <div
      className={cn(
        'mx-auto my-2 max-w-3xl px-3',
        'rounded-xl border text-caption font-medium',
        'flex items-center gap-2 py-2',
        !online
          ? 'border-[var(--accent-coral)]/40 bg-[var(--accent-coral)]/10 text-[var(--accent-coral)]'
          : syncing
          ? 'border-[var(--accent-blue)]/40 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'
          : 'border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]'
      )}
      role="status"
      aria-live="polite"
    >
      {!online ? (
        <SignalSlashIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : syncing ? (
        <ArrowPathIcon className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <CloudArrowUpIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span>
        {!online
          ? 'You are offline. Cached packs still work.'
          : syncing
          ? 'Syncing your progress…'
          : `${pending} answer${pending === 1 ? '' : 's'} waiting to sync.`}
      </span>
      {online && pending > 0 && !syncing && (
        <button
          type="button"
          onClick={() => flushPendingAI().catch(() => {})}
          className="ml-auto rounded-md border border-current/30 px-2 py-0.5 text-[11px] uppercase tracking-wide hover:bg-current/10"
        >
          Sync now
        </button>
      )}
    </div>
  );
}
