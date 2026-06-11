import React from 'react';

/**
 * MeshHero — animated mesh-gradient background, pure CSS.
 * Four radial-gradient blobs drift slowly across the viewport,
 * blended with the brand palette. An SVG feTurbulence noise
 * overlay adds grain. All colours reference CSS custom properties
 * so they stay in sync with the theme.
 *
 * Props:
 *   active  {boolean}  — fade in/out (default true)
 *   bn      {boolean}  — Bangla mode (swaps tagline text)
 */
export default function MeshHero({ active = true, bn = false }) {
  return (
    <div
      className="mesh-hero-root"
      style={{ opacity: active ? 1 : 0 }}
      aria-hidden="true"
    >
      {/* ── Drifting gradient blobs ── */}
      <div className="mesh-blob mesh-blob--sage" />
      <div className="mesh-blob mesh-blob--rose" />
      <div className="mesh-blob mesh-blob--coral" />
      <div className="mesh-blob mesh-blob--blue" />

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

      {/* ── Centred tagline (optional, very subtle) ── */}
      <div className="mesh-tagline">
        <span className="mesh-tagline-text">
          {bn ? 'শিখা হলো আলো' : 'Knowledge is Light'}
        </span>
      </div>
    </div>
  );
}
