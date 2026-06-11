// Inline the built bundle into JSDOM and observe render + errors
const path = require('path');
const fs = require('fs');
const { JSDOM } = require('jsdom');

async function main() {
  const distDir = path.join(__dirname, 'dist');
  const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  // Pull out the script and link hrefs
  const scriptMatch = indexHtml.match(/src="(\/assets\/index-[^"]+\.js)"/);
  const cssMatch    = indexHtml.match(/href="(\/assets\/index-[^"]+\.css)"/);
  if (!scriptMatch) { console.log('No main script tag found in dist/index.html'); return; }
  const jsPath  = path.join(distDir, scriptMatch[1].replace(/^\//, ''));
  const cssPath = cssMatch ? path.join(distDir, cssMatch[1].replace(/^\//, '')) : null;

  console.log('JS bundle:', scriptMatch[1], fs.statSync(jsPath).size, 'bytes');
  if (cssPath) console.log('CSS bundle:', cssMatch[1], fs.statSync(cssPath).size, 'bytes');

  // Build a minimal HTML doc that uses absolute file:// references
  const jsText  = fs.readFileSync(jsPath, 'utf8');
  const cssText = cssPath ? fs.readFileSync(cssPath, 'utf8') : '';
  const docHtml = `<!doctype html><html><head><meta charset="utf-8"><title>smoke</title><style>${cssText}</style></head><body><div id="root"></div></body></html>`;

  const dom = new JSDOM(docHtml, {
    url: 'http://127.0.0.1:5173/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const win = dom.window;

  // Shim fetch for /api
  win.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.startsWith('/api/')) {
      try {
        const r = await fetch('http://127.0.0.1:5173' + url, opts);
        return r;
      } catch (e) {
        return { ok: false, status: 0, statusText: 'shim-fail', json: async () => ({ ok: false, error: String(e) }) };
      }
    }
    return globalThis.fetch(url, opts);
  };
  // JSDOM doesn't implement scrollTo etc, but App should not need them at mount
  win.scrollTo = () => {};
  win.matchMedia = win.matchMedia || (() => ({ matches: false, addListener: () => {}, removeListener: () => {} }));

  win.addEventListener('error', (e) => console.log('WINDOW ERROR:', e.error?.stack || e.message));
  win.addEventListener('unhandledrejection', (e) => console.log('UNHANDLED REJECTION:', e.reason?.stack || e.reason));
  const origErr = win.console.error;
  win.console.error = (...args) => { console.log('CONSOLE.ERROR:', ...args.map((a) => (a instanceof Error ? a.stack : a))); origErr?.apply(win.console, args); };
  const origWarn = win.console.warn;
  win.console.warn  = (...args) => { console.log('CONSOLE.WARN:', ...args); origWarn?.apply(win.console, args); };
  const origLog  = win.console.log;
  win.console.log  = (...args) => { console.log('CONSOLE.LOG:', ...args); origLog?.apply(win.console, args); };

  // Inject the script as a classic script (JSDOM does not support type=module)
  const script = win.document.createElement('script');
  script.type = 'text/javascript';
  script.textContent = jsText;
  win.document.body.appendChild(script);

  await new Promise((r) => setTimeout(r, 5000));

  const root = win.document.getElementById('root');
  const innerHtml = root?.innerHTML || '';
  console.log('--- #root length:', innerHtml.length);
  console.log('--- #root first 1500 chars:');
  console.log(innerHtml.slice(0, 1500));
  console.log('--- body bg:', win.getComputedStyle(win.document.body).backgroundColor);
  console.log('--- header text:', win.document.querySelector('header')?.textContent?.slice(0, 200));
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
