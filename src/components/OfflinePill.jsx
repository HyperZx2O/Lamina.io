import { useEffect, useState } from 'react';
import { CloudArrowDownIcon, SignalSlashIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import { cn } from '../lib/utils';
import { getPackMeta } from '../lib/offlineStore';

/**
 * A small status pill that lives in the Header. Tapping it routes the
 * user to the offline study-pack catalogue. The colour and icon show
 * the current state: ready / downloading / offline.
 */
export default function OfflinePill({ className = '' }) {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [packCount, setPackCount] = useState(0);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Count saved packs once on mount. If a Background Sync fires we
    // also re-poll the count so the pill updates without a refresh.
    let cancelled = false;
    async function refresh() {
      try {
        const list = await getPackMeta();
        if (!cancelled) setPackCount(list.length);
      } catch (_) {
        /* IndexedDB not ready yet */
      }
    }
    refresh();
    const onSaved = () => refresh();
    window.addEventListener('lamina:pack-saved', onSaved);

    return () => {
      cancelled = true;
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('lamina:pack-saved', onSaved);
    };
  }, []);

  const tone = !online ? 'offline' : packCount > 0 ? 'ready' : 'empty';

  return (
    <button
      type="button"
      onClick={() => {
        // pushState updates the URL bar but doesn't fire `popstate` —
        // the router in main.jsx listens for a custom `lamina:navigate`
        // event so it can re-evaluate the pathname and remount the
        // correct page.
        window.history.pushState({}, '', '/offline');
        window.dispatchEvent(new CustomEvent('lamina:navigate'));
      }}
      className={cn(
        'group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium',
        'border transition-all duration-200 active:scale-95',
        tone === 'offline' &&
          'border-[var(--accent-coral)]/40 bg-[var(--accent-coral)]/10 text-[var(--accent-coral)]',
        tone === 'ready' &&
          'border-[var(--accent-sage)]/40 bg-[var(--accent-sage)]/10 text-[var(--accent-sage)]',
        tone === 'empty' &&
          'border-[var(--surface-3)] bg-[var(--surface-1)] text-[var(--text-soft)]',
        className
      )}
      aria-label="Open offline study packs"
      data-testid="offline-pill"
    >
      {!online ? (
        <SignalSlashIcon className="h-4 w-4" aria-hidden="true" />
      ) : tone === 'ready' ? (
        <CheckBadgeIcon className="h-4 w-4" aria-hidden="true" />
      ) : (
        <CloudArrowDownIcon className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">
        {!online
          ? 'Offline'
          : tone === 'ready'
          ? `${packCount} pack${packCount === 1 ? '' : 's'} ready`
          : 'Get offline packs'}
      </span>
    </button>
  );
}
