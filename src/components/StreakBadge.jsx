import { useEffect, useState, useCallback } from 'react';
import { FireIcon } from '@heroicons/react/24/solid';
import { cn } from '../lib/utils';

/**
 * A small streak badge. Reads the user's current streak from the
 * server-side summary (which is the source of truth once any attempts
 * have been synced). While the network is down, falls back to the
 * locally-cached value in localStorage so the badge never flashes to 0.
 *
 * Props:
 *   userId: string identifier for the user (default 'anon')
 *   bn:     boolean for Bengali copy
 */
export default function StreakBadge({ userId = 'anon', bn = false, className }) {
  const [streak, setStreak] = useState(() => {
    try {
      const cached = localStorage.getItem('lamina_streak');
      return cached ? Number(cached) || 0 : 0;
    } catch (_) {
      return 0;
    }
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/progress/summary?userId=${encodeURIComponent(userId)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const days = Number(json.streakDays) || 0;
      setStreak(days);
      try {
        localStorage.setItem('lamina_streak', String(days));
      } catch (_) {
        /* quota or private mode */
      }
    } catch (err) {
      // Stay on cached value.
      console.debug('[StreakBadge] refresh failed', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener('lamina:pending-changed', onChange);
    window.addEventListener('lamina:syncing', onChange);
    return () => {
      window.removeEventListener('lamina:pending-changed', onChange);
      window.removeEventListener('lamina:syncing', onChange);
    };
  }, [refresh]);

  const label =
    streak === 0
      ? bn
        ? 'স্ট্রিক শুরু করুন'
        : 'Start a streak'
      : streak === 1
      ? bn
        ? '১ দিনের স্ট্রিক'
        : '1 day streak'
      : bn
      ? `${streak} দিনের স্ট্রিক`
      : `${streak} day streak`;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        streak > 0
          ? 'border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]'
          : 'border-[var(--surface-3)] bg-[var(--surface-1)] text-[var(--text-soft)]',
        loading && 'opacity-70',
        className
      )}
      title={bn ? 'প্রতিদিন কুইজ দিন' : 'Take a quiz every day'}
    >
      <FireIcon
        className={cn(
          'h-3.5 w-3.5',
          streak > 0 ? 'text-[var(--accent-gold)]' : 'text-[var(--text-soft)]'
        )}
      />
      <span>{label}</span>
    </div>
  );
}
