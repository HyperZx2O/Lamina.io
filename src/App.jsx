import React, { useState, useEffect, useCallback, useMemo } from "react";
import SettingsModal from './components/SettingsModal.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import TutorPanel from './components/TutorPanel.jsx';
import TeacherPanel from './components/TeacherPanel.jsx';
import MultiPanel from './components/MultiPanel.jsx';
import AnswerPanel from './components/AnswerPanel.jsx';
import QuestionsPanel from './components/QuestionsPanel.jsx';
import Header from './components/Header.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import ErrorBoundary from './components/docs/ErrorBoundary.jsx';
import PanelCard from './components/PanelCard.jsx';
import RecentActivity from './components/RecentActivity.jsx';
import MeshHero from './components/MeshHero.jsx';
import FaviconProgress from './components/FaviconProgress.jsx';
import { renderResponseToHtml } from './lib/katexLoader';
import { TABS } from './lib/featureCatalog.data.js';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';

const storageCache = new Map();
function loadPref(key, fallback) {
  try {
    if (!storageCache.has(key)) storageCache.set(key, localStorage.getItem(key));
    const v = storageCache.get(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function savePref(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    storageCache.set(key, JSON.stringify(value));
  } catch { /* localStorage not available */ }
}

async function callAPI(system, user, opts = {}) {
    const { signal, onChunk } = opts || {};
    const bn = loadPref('lamina_lang', 'en') === 'bn';
    const apiKey = loadPref('lamina_api_key', '') || '';
    const modelOverride = loadPref('lamina_model_override', '') || '';
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-claude-key'] = apiKey;
    if (modelOverride) headers['x-model-override'] = modelOverride;
    if (onChunk) headers['Accept'] = 'text/event-stream';
    try {
      const res = await fetch('/api/claude', { method: 'POST', headers, body: JSON.stringify({ system, user }), signal });
      if (res.status === 429) throw new Error(bn ? 'অনেকগুলি অনুরোধ করা হচ্ছে। দয়া করে একটু অপেক্ষা করুন।' : 'Too many requests. Please wait a moment and try again.');
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j && (j.error || j.message)) || JSON.stringify(j));
      }
      // Streaming path: parse SSE frames and forward text deltas to onChunk.
      if (onChunk) {
        if (!res.body || !res.body.getReader) {
          // Fallback for browsers without streams API — buffer and call onChunk once.
          const j = await res.json();
          const text = extractTextFromResponse(j);
          onChunk(text, text);
          return text;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let accumulated = '';
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          // SSE frames are separated by blank lines (\n\n).
          let sep;
          while ((sep = buf.indexOf('\n\n')) !== -1) {
            const frame = buf.slice(0, sep);
            buf = buf.slice(sep + 2);
            for (const line of frame.split('\n')) {
              if (!line.startsWith('data:')) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === '[DONE]') continue;
              try {
                const ev = JSON.parse(payload);
                // Server forwards content_block_delta.text_delta, message_stop, and error.
                if (ev?.type === 'error') {
                  throw new Error(ev?.error?.message || 'stream_error');
                }
                if (ev?.delta?.text) {
                  accumulated += ev.delta.text;
                  onChunk(ev.delta.text, accumulated);
                }
              } catch (parseErr) {
                // JSON.parse failures on stray SSE comments are harmless; re-throw real stream errors.
                if (parseErr && parseErr.message === 'stream_error') throw parseErr;
              }
            }
          }
        }
        return accumulated;
      }
      // Buffered (non-streaming) path.
      const j = await res.json();
      return extractTextFromResponse(j);
    } catch (e) {
      if (e.name === 'TypeError' && e.message.includes('fetch')) {
        throw new Error(bn ? 'নেটওয়ার্ক ত্রুটি। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।' : 'Network error. Please check your internet connection.');
      }
      throw e;
    }
  }

  function extractTextFromResponse(j) {
    if (typeof j === 'string') return j;
    if (j.content && j.content[0] && j.content[0].text) return j.content[0].text;
    if (j.output_text) return j.output_text;
    if (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) return j.choices[0].message.content;
    if (j.response) return j.response;
    return JSON.stringify(j);
}

import {
  buildTutorPrompt,
  buildTeacherPrompt,
  buildMultiPrompt,
  buildAnswerPrompt,
  buildQuestionsPrompt,
} from './lib/prompts.js';

function ProgressBar({ loading, color = '#9cc4b2' }) {
  return (
    <>
      <div aria-hidden className="h-[3px] relative overflow-hidden">
        {loading && (
          <div className="absolute left-0 top-0 bottom-0 w-2/5 animate-progress" style={{ background: color, opacity: 0.14 }} />
        )}
      </div>
      <div aria-live="polite" role="status" className="sr-only">
        {loading ? 'Loading, please wait' : 'Ready'}
      </div>
    </>
  );
}

export default function App() {
  const [lang, setLang] = useState(() => loadPref("lamina_lang", "en"));
  const [tab,  setTab]  = useState(() => loadPref("lamina_tab", "tutor"));
  const [globalLoading, setGlobalLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyModal, setHistoryModal] = useState(null);
  const bn = lang === "bn";

  const [history, setHistory] = useState(() => loadPref("lamina_history", []));
  const [streak, setStreak] = useState(() => loadPref("lamina_streak", { streak: 0, lastStudied: "" }));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [intro, setIntro] = useState(() => {
    try { return !localStorage.getItem('lamina_intro_seen'); } catch { return true; }
  });
  // Theme — read once on mount, then sync <html data-theme> on
  // change. Persisted to localStorage as 'lamina_theme' ('dark' |
  // 'light'). The no-FOUC script in index.html sets the initial
  // attribute before paint, so this is purely a React mirror.
  const [theme, setTheme] = useState(() => {
    try {
      const t = localStorage.getItem('lamina_theme');
      if (t === 'light' || t === 'dark') return t;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    } catch { /* ignore */ }
    return 'dark';
  });
  useEffect(() => {
    try { document.documentElement.setAttribute('data-theme', theme); } catch { /* ignore */ }
    try { localStorage.setItem('lamina_theme', theme); } catch { /* ignore */ }
    // Keep the address-bar color in sync with the active theme.
    try {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', theme === 'light' ? '#FAF7F5' : '#141110');
    } catch { /* ignore */ }
  }, [theme]);
  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);
  const [kbdHint, setKbdHint] = useState(null); // {keys, label} or null

  const updateStreak = (currentStreak) => {
    const now = new Date();
    const todayISO = now.toISOString().slice(0, 10);
    if (!currentStreak || !currentStreak.lastStudied) {
      return { lastStudied: now.toISOString(), streak: 1 };
    }
    const lastISO = new Date(currentStreak.lastStudied).toISOString().slice(0, 10);
    if (todayISO === lastISO) {
      return { ...currentStreak, lastStudied: now.toISOString() };
    }
    const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const lastDate = new Date(currentStreak.lastStudied);
    const lastMs = Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth(), lastDate.getUTCDate());
    const diffDays = Math.round((todayMs - lastMs) / (1000 * 60 * 60 * 24));
    let nextStreak = currentStreak.streak;
    if (diffDays === 1) {
      nextStreak += 1;
    } else if (diffDays > 1) {
      nextStreak = 1;
    }
    return { lastStudied: now.toISOString(), streak: nextStreak };
  };

  const trackActivity = useCallback((topic, panel, response) => {
    if (!topic || !topic.trim()) return;
    setHistory((prev) => {
      const next = [{ topic: topic.trim(), panel, timestamp: new Date().toISOString(), response: response || '' }, ...prev];
      const trimmed = next.slice(0, 10);
      savePref("lamina_history", trimmed);
      return trimmed;
    });
    setStreak((prev) => {
      const next = updateStreak(prev);
      savePref("lamina_streak", next);
      return next;
    });
  }, []);

  const PANEL_NAMES = {
    tutor: { en: 'Adaptive Tutor', bn: 'অ্যাডাপটিভ টিউটর' },
    teacher: { en: 'Teacher Copilot', bn: 'শিক্ষক সহকারী' },
    multi: { en: 'Multilingual', bn: 'বহুভাষিক' },
    answer: { en: 'Generate Answer', bn: 'উত্তর তৈরি' },
    questions: { en: 'Suggest Questions', bn: 'প্রশ্ন সাজেস্ট' },
  };

  const activeTab = TABS.find(t => t.id === tab);

  const handleSetLang = (l) => { setLang(l); savePref("lamina_lang", l); };
  const handleSetTab  = (t) => { setTab(t);  savePref("lamina_tab", t); };

  useEffect(() => {
    const onLoad = (e) => setGlobalLoading(e.detail);
    window.addEventListener("lamina-loading", onLoad);
    return () => window.removeEventListener("lamina-loading", onLoad);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && settingsOpen) setSettingsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen]);

  // Prefill from URL params: ?tab=tutor&topic=Newton%27s%20Laws&subject=physics
  // Fires once on mount, so the active tab switches and the relevant panel can read the topic.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab');
      if (urlTab && TABS.some(t => t.id === urlTab)) {
        handleSetTab(urlTab);
      }
      const urlTopic = params.get('topic') || params.get('input') || params.get('q');
      const urlSubject = params.get('subject');
      if (urlTopic || urlSubject) {
        // Dispatch a CustomEvent so the active panel can consume prefill values.
        window.dispatchEvent(new CustomEvent('lamina-prefill', {
          detail: { topic: urlTopic || '', subject: urlSubject || '' },
        }));
      }
    } catch { /* ignore */ }
  }, []);

  // Mark intro as seen shortly after mount, so the staggered reveal plays once.
  // Timeout is 1800ms so the full page choreography (blobs → header → tabs → main card) finishes.
  useEffect(() => {
    if (!intro) return;
    const t = setTimeout(() => {
      try { localStorage.setItem('lamina_intro_seen', '1'); } catch { /* ignore */ }
      setIntro(false);
    }, 1800);
    return () => clearTimeout(t);
  }, [intro]);

  // Replay the intro animation on demand (wired to a button in Settings).
  const replayIntro = useCallback(() => {
    try { localStorage.removeItem('lamina_intro_seen'); } catch { /* ignore */ }
    setSettingsOpen(false);
    // Defer reload one tick so the modal close transition isn't visually clipped.
    setTimeout(() => { window.location.reload(); }, 80);
  }, []);

  // Global keyboard shortcuts: / to focus, Esc to blur, 1-5 to switch tab, Ctrl+Enter to submit.
  useEffect(() => {
    const isTextInput = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    };
    const showHint = (text) => {
      try {
        if (localStorage.getItem('lamina_kbd_hinted')) return;
        localStorage.setItem('lamina_kbd_hinted', '1');
      } catch { return; }
      setKbdHint(text);
      setTimeout(() => setKbdHint(null), 1600);
    };
    const onKey = (e) => {
      // Escape: blur any focused text input
      if (e.key === 'Escape' && !settingsOpen) {
        const a = document.activeElement;
        if (a && isTextInput(a)) {
          a.blur();
          e.preventDefault();
          return;
        }
      }
      // Ctrl+Enter: submit nearest form / trigger primary button
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const btn = document.querySelector('button[style*="primaryBtn"]')
          || document.querySelector('main button:not([disabled])');
        if (btn) { btn.click(); e.preventDefault(); return; }
      }
      // Number keys 1-5: switch tabs (only when not typing)
      if (!isTextInput(e.target) && !e.ctrlKey && !e.metaKey && !e.altKey && /^[1-5]$/.test(e.key)) {
        const target = TABS[Number(e.key) - 1];
        if (target) { handleSetTab(target.id); e.preventDefault(); return; }
      }
      // "/" focuses the first text input on the active panel
      if (e.key === '/' && !isTextInput(e.target) && !e.ctrlKey && !e.metaKey) {
        const input = document.querySelector('main textarea, main input[type="text"]');
        if (input) {
          input.focus();
          if (input.select) input.select();
          showHint('/ to focus');
          e.preventDefault();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSetTab, settingsOpen]);

  const panelMap = useMemo(() => ({
    tutor:     <TutorPanel     bn={bn} callAPI={callAPI} buildTutorPrompt={buildTutorPrompt} trackActivity={trackActivity} />,
    teacher:   <TeacherPanel   bn={bn} callAPI={callAPI} buildTeacherPrompt={buildTeacherPrompt} trackActivity={trackActivity} />,
    multi:     <MultiPanel     bn={bn} callAPI={callAPI} buildMultiPrompt={buildMultiPrompt} trackActivity={trackActivity} />,
    answer:    <AnswerPanel    bn={bn} callAPI={callAPI} buildAnswerPrompt={buildAnswerPrompt} trackActivity={trackActivity} />,
    questions: <QuestionsPanel bn={bn} callAPI={callAPI} buildQuestionsPrompt={buildQuestionsPrompt} trackActivity={trackActivity} />,
    settings:  <SettingsPanel  bn={bn} />,
  }), [bn, callAPI, buildTutorPrompt, buildTeacherPrompt, buildMultiPrompt, buildAnswerPrompt, buildQuestionsPrompt, trackActivity]);

  return (
    <ErrorBoundary>
    <div
      className={
        'font-sans min-h-screen ' +
        (theme === 'light'
          ? 'bg-[#FAF7F5] text-[#2A1F26]'
          : 'bg-base-900 text-base-50')
      }
      style={{ '--focus-color': activeTab?.color || '#9cc4b2' }}
    >
      <style>{`*{box-sizing:border-box}input:focus,textarea:focus,select:focus{border-color:var(--focus-color)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--focus-color) 9.4%,transparent)!important;outline:none}select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b5e58' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 13px center;padding-right:36px!important}select option{background:#2e2b2a;color:#e8ddd6}[data-theme="light"] select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B5A63' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")}[data-theme="light"] select option{background:#FFFFFF;color:#2A1F26}.badge{display:inline-block;padding:2px 9px;border-radius:99px;font-size:10px;font-weight:700;font-family:'DM Sans',sans-serif;letter-spacing:.05em;text-transform:uppercase;vertical-align:middle}.badge-easy{background:rgba(156,196,178,.14);color:#9cc4b2;border:1px solid rgba(156,196,178,.2)}.badge-medium{background:rgba(213,187,177,.12);color:#d5bbb1;border:1px solid rgba(213,187,177,.2)}.badge-hard{background:rgba(231,109,131,.12);color:#e76d83;border:1px solid rgba(231,109,131,.2)}`}</style>

      {/* Animated mesh-gradient background (decorative, aria-hidden). */}
      <MeshHero active={true} bn={bn} intro={intro} />

      {/* Favicon progress ring — swaps favicon while a request is in flight. */}
      <FaviconProgress loading={globalLoading} accent={activeTab?.color || '#9cc4b2'} />

      {/* Keyboard shortcut hint toast (auto-fades). */}
      {kbdHint && (
        <div className="kbd-hint" role="status" aria-live="polite">
          <kbd>{kbdHint}</kbd>
        </div>
      )}

      {/* Skip-to-content link */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-base-800 focus:text-base-50 focus:border focus:border-accent-gold focus:rounded-lg focus:text-sm focus:font-bold">
        {bn ? 'মূল কন্টেন্টে যান' : 'Skip to main content'}
      </a>

      {/* ── HEADER ── */}
      <>
        <ProgressBar loading={globalLoading} color={activeTab?.color || "#9cc4b2"} />
        <Header
          bn={bn}
          lang={lang}
          handleSetLang={handleSetLang}
          tab={tab}
          handleSetTab={handleSetTab}
          TABS={TABS}
          activeTab={activeTab}
          setSettingsOpen={setSettingsOpen}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          intro={intro}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </>

      <OfflineBanner />

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal bn={bn} onClose={() => setSettingsOpen(false)}>
          <SettingsPanel bn={bn} onReplayIntro={replayIntro} />
        </SettingsModal>
      )}

      {/* History Entry Modal */}
      {historyModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="history-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setHistoryModal(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-base-700 border border-base-500 max-w-xl w-[90%] max-h-[80vh] overflow-auto p-6 rounded-2xl">
            <div className="flex justify-between items-start mb-5">
              <div>
                <div id="history-modal-title" className="text-caption text-base-300 uppercase tracking-widest mb-1">
                  {PANEL_NAMES[historyModal.panel]?.[bn ? 'bn' : 'en'] || ''}
                </div>
                <div className="text-base font-bold text-accent-beige">{historyModal.topic}</div>
                <div className="text-xs text-base-300 mt-1">
                  {new Date(historyModal.timestamp).toLocaleString(bn ? 'bn-BD' : 'en-US')}
                </div>
              </div>
              <button onClick={() => setHistoryModal(null)} className="bg-transparent border-none text-base-300 cursor-pointer p-1 leading-none">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-base-600 border border-base-500 rounded p-4 text-sm leading-relaxed break-words max-h-[400px] overflow-auto"
              dangerouslySetInnerHTML={{ __html: historyModal.response
                ? renderResponseToHtml(historyModal.response)
                : `<p style="color:#a89b94;font-style:italic">${bn ? 'এই এন্ট্রির জন্য কোনো উত্তর সংরক্ষিত নেই।' : 'No response was saved for this entry.'}</p>` }} />
          </div>
        </div>
      )}

      {/* Layout wrapper for main page and sidebar — relative + z-10 so it sits above the fixed MeshHero. */}
      <div className="flex min-h-[calc(100vh-90px)] relative z-10">
        {/* ── MAIN ── */}
        <div className="flex-1 transition-[opacity,margin] duration-300">

          <main id="main-content" className="max-w-[860px] mx-auto px-6 pb-16 pt-6" aria-busy={globalLoading} data-intro={intro ? 'true' : 'false'}>
            <PanelCard color={activeTab?.color}>
              {panelMap[tab]}
            </PanelCard>

            {/* Footer */}
            <footer className="text-center mt-12 pt-6 border-t border-base-700">
              <div className="font-display font-bold text-body tracking-tight">
                <span className="bg-gradient-to-r from-accent-sage via-accent-rose to-accent-coral bg-clip-text text-transparent">Lamina.io</span>
              </div>
              <div className="text-caption text-base-400 uppercase tracking-widest mt-1">
                {bn ? "বাংলাদেশের শিক্ষার্থীদের জন্য AI — Infinity AI BuildFest 2026" : "AI for Bangladeshi Students — Infinity AI BuildFest 2026"}
              </div>
            </footer>
          </main>
        </div>

        {/* ── SIDEBAR BACKDROP ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-base-900/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── SIDEBAR ── */}
        {sidebarOpen && (
          <aside className="fixed right-0 top-[73px] bottom-0 z-50 shadow-2xl w-80 max-w-[calc(100vw-16px)] safe-area-bottom">
            <RecentActivity
              history={history}
              streak={(streak && typeof streak === 'object') ? (streak.streak ?? 0) : (streak ?? 0)}
              bn={bn}
              onClear={() => {
                setHistory([]);
                savePref("lamina_history", []);
              }}
              onClose={() => setSidebarOpen(false)}
              onViewEntry={setHistoryModal}
            />
          </aside>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
