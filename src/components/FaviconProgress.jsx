import { useEffect, useRef } from 'react';

/**
 * FaviconProgress — renders nothing to the DOM, but when `loading` is true
 * replaces the page favicon with an inline SVG that has a sage-tinted
 * arc rotating inside a dark ring. When loading flips back to false, the
 * original /favicon.svg is restored.
 *
 * The component is intentionally invisible: it only touches the DOM head
 * and uses an animation start time stamp so the ring always begins at
 * the same phase on every load.
 */
const DEFAULT_HREF = '/favicon.svg';
const STATIC_HREF = '/favicon.svg';

function buildFaviconHref(accent = '#9cc4b2', angleDeg = 0) {
  // 32x32 viewBox to match the existing /favicon.svg.
  // Two arcs: a faint full ring + a brighter arc whose `stroke-dashoffset`
  // is rotated by the angle parameter, giving the impression of a sweep.
  const radius = 10.5;
  const cx = 16;
  const cy = 16;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.28; // ~100° sweep
  const offset = -(angleDeg / 360) * circumference;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#c98ca7"/>
    </linearGradient>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none"
          stroke="${accent}" stroke-opacity="0.18" stroke-width="3"/>
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none"
          stroke="url(#g)" stroke-width="3" stroke-linecap="round"
          stroke-dasharray="${arcLength} ${circumference}"
          stroke-dashoffset="${offset}"
          transform="rotate(-90 ${cx} ${cy})"/>
</svg>`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function FaviconProgress({ loading, accent = '#9cc4b2' }) {
  const originalHref = useRef(null);
  const rafId = useRef(null);
  const startTime = useRef(0);
  const linkElRef = useRef(null);

  // Capture the original favicon href on mount, find the <link rel="icon">.
  useEffect(() => {
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      document.head.appendChild(link);
    }
    linkElRef.current = link;
    if (!originalHref.current) {
      originalHref.current = link.getAttribute('href') || DEFAULT_HREF;
    }
  }, []);

  useEffect(() => {
    const link = linkElRef.current;
    if (!link) return;

    if (!loading) {
      // Restore the static favicon and stop the rAF loop.
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      link.setAttribute('href', originalHref.current || STATIC_HREF);
      return;
    }

    startTime.current = performance.now();
    const tick = (now) => {
      const elapsed = now - startTime.current;
      const angle = (elapsed / 18) % 360; // ~18ms per degree = 6.5s per turn, snappy
      try {
        link.setAttribute('href', buildFaviconHref(accent, angle));
      } catch {
        /* dataURL construction failed — ignore */
      }
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = null;
    };
  }, [loading, accent]);

  return null;
}
