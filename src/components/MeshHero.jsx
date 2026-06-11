import React, { useEffect, useRef } from 'react';

/**
 * MeshHero — animated mesh-gradient background, pure CSS.
 * Four radial-gradient blobs drift slowly across the viewport,
 * blended with the brand palette. An SVG feTurbulence noise
 * overlay adds grain. All colours reference CSS custom properties
 * so they stay in sync with the theme.
 *
 * Props:
 *   active   {boolean}  — fade in/out (default true)
 *   bn       {boolean}  — Bangla mode (swaps tagline text)
 *   intro    {boolean}  — when true, runs the staggered intro reveal once
 *   tagline  {{en,bn}}  — overrides the centred tagline copy
 */
export default function MeshHero({ active = true, bn = false, intro = false, tagline }) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!intro || !rootRef.current) return;
    const el = rootRef.current;
    el.setAttribute('data-intro', 'true');
    return () => { el.removeAttribute('data-intro'); };
  }, [intro]);

  const t = tagline || { en: 'Knowledge is Light', bn: 'শিখা হলো আলো' };
  const taglineText = bn ? t.bn : t.en;
  // Split tagline into per-character spans for the staggered wipe.
  // Spaces become zero-width joiners so the flex/inline flow doesn't break.
  const taglineChars = Array.from(taglineText).map((ch, i) =>
    ch === ' ' ? (
      <span key={i} className="mesh-tagline-char mesh-tagline-char--space" aria-hidden="true">{' '}</span>
    ) : (
      <span key={i} className="mesh-tagline-char" style={{ '--char-i': i }}>{ch}</span>
    )
  );

  return (
    <div
      ref={rootRef}
      className="mesh-hero-root"
      style={{ opacity: active ? 1 : 0 }}
      aria-hidden="true"
    >
      {/* ── Drifting gradient blobs ── */}
      <div className="mesh-blob mesh-blob--sage mesh-blob-1" />
      <div className="mesh-blob mesh-blob--rose mesh-blob-2" />
      <div className="mesh-blob mesh-blob--coral mesh-blob-3" />
      <div className="mesh-blob mesh-blob--blue mesh-blob-4" />

      {/* ── SVG noise grain overlay ── */}
      <svg className="mesh-noise" xmlns="http://www.w3.org/2000/svg">
        <filter id="mesh-noise-filter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#mesh-noise-filter)" />
      </svg>

      {/* ── Vignette to fade edges into the base bg ── */}
      <div className="mesh-vignette" />

      {/* ── Wordmark — wipes in first, becomes ambient after intro ── */}
      <div className="mesh-mark">
        <span className="mesh-mark-text">Lamina</span>
        <span className="mesh-mark-dot" />
      </div>

      {/* ── Centred tagline — per-character staggered wipe ── */}
      <div className="mesh-tagline mesh-tagline-row">
        <span className="mesh-tagline-text" aria-label={taglineText}>
          {taglineChars}
        </span>
      </div>
    </div>
  );
}
