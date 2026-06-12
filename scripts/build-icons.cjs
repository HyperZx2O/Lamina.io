// scripts/build-icons.cjs
// Renders public/lamina-logo.svg into the three PWA icons the manifest
// references. Run once after touching the logo: `node scripts/build-icons.cjs`.
// The maskable variant adds 20% padding on every side so the central mark
// stays inside the safe area when the OS crops it into a circle/rounded
// squircle.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'public', 'lamina-logo.svg');
const outDir = path.join(root, 'public', 'icons');

const svg = fs.readFileSync(svgPath);

const targets = [
  // Regular icons — the logo sits inside a solid theme-coloured square so
  // it never disappears on light home screens. Logo viewBox is 32×32; we
  // rasterize it at the full target size and let sharp pad to the canvas.
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  // Maskable: render the logo at 80% of the canvas (centre 80% is the
  // visible safe area for adaptive icons).
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
];

(async () => {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  for (const t of targets) {
    const inner = t.maskable ? Math.round(t.size * 0.8) : t.size;
    const offset = Math.round((t.size - inner) / 2);
    const buf = await sharp(svg, { density: 384 })
      .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
    await sharp({
      create: {
        width: t.size,
        height: t.size,
        channels: 4,
        background: t.maskable
          ? { r: 20, g: 17, b: 16, alpha: 1 } // matches theme_color #141110
          : { r: 20, g: 17, b: 16, alpha: 1 },
      },
    })
      .composite([{ input: buf, left: offset, top: offset }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(outDir, t.name));
    // eslint-disable-next-line no-console
    console.log('wrote', t.name, `(${t.size}×${t.size})`);
  }
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
