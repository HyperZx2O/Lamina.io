import React, { useState, useEffect, useRef, useCallback } from "react";
import SettingsModal from './components/SettingsModal.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import TutorPanel from './components/TutorPanel.jsx';
import TeacherPanel from './components/TeacherPanel.jsx';
import MultiPanel from './components/MultiPanel.jsx';
import AnswerPanel from './components/AnswerPanel.jsx';
import QuestionsPanel from './components/QuestionsPanel.jsx';
import Header from './components/Header.jsx';
import PanelCard from './components/PanelCard.jsx';
// KaTeX will be lazy-loaded when math is encountered to reduce initial bundle size
let __katex = null;
let __katexPromise = null;
function ensureKaTeX() {
  if (__katex) return Promise.resolve(__katex);
  if (__katexPromise) return __katexPromise;
  __katexPromise = import('katex').then((m) => { __katex = m; import('katex/dist/katex.min.css'); window.dispatchEvent(new Event('katex-ready')); return __katex; });
  return __katexPromise;
}

function escapeHtml(v) { return (v || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

const TABS = [
  { id: "tutor",     icon: "🎓", en: "Adaptive Tutor",   bn: "অ্যাডাপটিভ টিউটর", color: "#9cc4b2", glow: "rgba(156,196,178,.28)" },
  { id: "teacher",   icon: "👩‍🏫", en: "Teacher Copilot",  bn: "শিক্ষক সহকারী",     color: "#b5d4c8", glow: "rgba(181,212,200,.22)" },
  { id: "multi",     icon: "🌐", en: "Multilingual",      bn: "বহুভাষিক",           color: "#c98ca7", glow: "rgba(201,140,167,.28)" },
  { id: "answer",    icon: "💡", en: "Generate Answer",   bn: "উত্তর তৈরি",          color: "#d5bbb1", glow: "rgba(213,187,177,.28)" },
  { id: "questions", icon: "❓", en: "Suggest Questions", bn: "প্রশ্ন সাজেস্ট",      color: "#e76d83", glow: "rgba(231,109,131,.28)" },
  { id: "settings",  icon: "⚙️", en: "Settings",         bn: "সেটিংস",            color: "#7da2f0", glow: "rgba(125,162,240,.18)" },
];

const SUBJECTS = [];

// Panel components have been extracted to separate files in ./components/
// The individual panels (TutorPanel, TeacherPanel, MultiPanel, AnswerPanel, QuestionsPanel)
// are imported at the top of this file and used in the `panelMap` below.

// ═══════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════

function loadPref(key, fallback) { try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; } }
function savePref(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

async function callAPI(system, user) {
  try {
    const apiKey = loadPref('lamina_api_key', '') || '';
    const modelOverride = loadPref('lamina_model_override', '') || '';
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-claude-key'] = apiKey;
    if (modelOverride) headers['x-model-override'] = modelOverride;
    const res = await fetch('/api/claude', { method: 'POST', headers, body: JSON.stringify({ system, user }) });
    const j = await res.json();
    if (!res.ok) throw new Error((j && (j.error || j.message)) || JSON.stringify(j));
    // try a few common shapes
    if (typeof j === 'string') return j;
    if (j.content && j.content[0] && j.content[0].text) return j.content[0].text;
    if (j.output_text) return j.output_text;
    if (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) return j.choices[0].message.content;
    if (j.response) return j.response;
    return JSON.stringify(j);
  } catch (e) { throw e; }
}

function buildTutorPrompt(bn, subject, level) {
  return bn ? `আপনি একজন সহৃদয়, নির্ভরযোগ্য বাংলাদেশ-কেন্দ্রিক শিক্ষাসাহায়ক। বিষয়: ${subject}। স্তর: ${level}।` : `You are a helpful, curriculum-aware tutor for Bangladesh. Subject: ${subject}. Level: ${level}.`;
}
function buildTeacherPrompt(bn, type) {
  return bn ? `আপনি একজন শিক্ষক সহকারী, অনুরোধ: ${type}` : `You are a teacher assistant. Request type: ${type}`;
}
function buildMultiPrompt(mode) { return `Multilingual conversion mode: ${mode}`; }
function buildAnswerPrompt(bn, level) { return bn ? `উত্তর লেখার নির্দেশিকা — স্তর: ${level}` : `Answer formatting instructions — level: ${level}`; }
function buildQuestionsPrompt(bn, qType, count) { return bn ? `প্রশ্ন তৈরির নির্দেশ — ধরন: ${qType}, সংখ্যা: ${count}` : `Question generation instructions — type: ${qType}, count: ${count}`; }

function ProgressBar({ loading, color = '#9cc4b2' }) {
  return (
    <div aria-hidden style={{ height: 3, background: 'transparent', position: 'relative', overflow: 'hidden' }}>
      {loading && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%', background: color, opacity: 0.14, transformOrigin: 'left', animation: 'progressSweep 1.6s linear infinite' }} />
      )}
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState(() => loadPref("lamina_lang", "en"));
  const [tab,  setTab]  = useState(() => loadPref("lamina_tab", "tutor"));
  const [globalLoading, setGlobalLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const bn = lang === "bn";
  const localApiKey = loadPref('lamina_api_key', '');

  const activeTab = TABS.find(t => t.id === tab);

  const handleSetLang = (l) => { setLang(l); savePref("lamina_lang", l); };
  const handleSetTab  = (t) => { setTab(t);  savePref("lamina_tab", t); };

  // Observe loading from panels via a context-free trick: panels set a CSS class on body
  // Instead we use a simple global loading state driven by a custom event
  useEffect(() => {
    const onLoad = (e) => setGlobalLoading(e.detail);
    window.addEventListener("lamina-loading", onLoad);
    return () => window.removeEventListener("lamina-loading", onLoad);
  }, []);

  // Close settings on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && settingsOpen) setSettingsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen]);

  const panelMap = {
    tutor:     <TutorPanel     bn={bn} callAPI={callAPI} buildTutorPrompt={buildTutorPrompt} />,
    teacher:   <TeacherPanel   bn={bn} callAPI={callAPI} buildTeacherPrompt={buildTeacherPrompt} />,
    multi:     <MultiPanel     bn={bn} callAPI={callAPI} buildMultiPrompt={buildMultiPrompt} />,
    answer:    <AnswerPanel    bn={bn} callAPI={callAPI} buildAnswerPrompt={buildAnswerPrompt} />,
    questions: <QuestionsPanel bn={bn} callAPI={callAPI} buildQuestionsPrompt={buildQuestionsPrompt} />,
    settings:  <SettingsPanel  bn={bn} />,
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", background: "#1c1917", minHeight: "100vh", color: "#e8ddd6" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        @keyframes spin          { to { transform: rotate(360deg); } }
        @keyframes fadeUp        { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes progressSweep { 0% { transform: translateX(-100%); width: 60%; } 100% { transform: translateX(260%); width: 60%; } }
        @keyframes progressIn    { from { opacity: 0; transform: scaleX(0); } to { opacity: 1; transform: scaleX(1); } }

        * { box-sizing: border-box; }

        input:focus, textarea:focus, select:focus {
          border-color: ${activeTab?.color || "#9cc4b2"} !important;
          box-shadow: 0 0 0 3px ${activeTab?.color || "#9cc4b2"}18 !important;
          outline: none;
        }
        input::placeholder, textarea::placeholder { color: #4a4240; }

        button:not(:disabled):hover { filter: brightness(1.1); transform: translateY(-1px); }
        button:not(:disabled):active { transform: translateY(0); filter: brightness(.94); }
        button { transition: all .18s; }
        button:disabled { opacity: .3; cursor: not-allowed; }

        .action-btn:hover { background: ${activeTab?.color || "#9cc4b2"}12 !important; }

        select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b5e58' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 13px center;
          padding-right: 36px !important;
        }
        select option { background: #2e2b2a; color: #e8ddd6; }

        .badge {
          display: inline-block;
          padding: 2px 9px; border-radius: 99px; font-size: 10px; font-weight: 700;
          font-family: 'DM Sans', sans-serif; letter-spacing: .05em;
          text-transform: uppercase; vertical-align: middle;
        }
        .badge-easy   { background: rgba(156,196,178,.14); color: #9cc4b2; border: 1px solid rgba(156,196,178,.2); }
        .badge-medium { background: rgba(213,187,177,.12); color: #d5bbb1; border: 1px solid rgba(213,187,177,.2); }
        .badge-hard   { background: rgba(231,109,131,.12); color: #e76d83; border: 1px solid rgba(231,109,131,.2); }

        nav::-webkit-scrollbar { display: none; }
        ::-webkit-scrollbar       { width: 4px; }
        ::-webkit-scrollbar-track { background: #1c1917; }
        ::-webkit-scrollbar-thumb { background: #3a3634; border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: #4a4240; }

        *:focus-visible { outline: 2px solid ${activeTab?.color || "#9cc4b2"} !important; outline-offset: 2px; }

        .chip-inactive:hover { background: rgba(255,255,255,0.03) !important; border-color: #4a4240 !important; }

        @media (max-width: 420px) {
          .logo-row { flex-wrap: wrap; }
          .lang-toggle { margin-top: 8px; }
        }

        @media print {
          header, nav, footer, .no-print, button, select, textarea, input, label { display: none !important; }
          .response-print { display: block !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>

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
          globalLoading={globalLoading}
        />
      </>

      {/* Settings Modal (centered) */}
      {settingsOpen && (
        <SettingsModal bn={bn} onClose={() => setSettingsOpen(false)}>
          <SettingsPanel bn={bn} />
        </SettingsModal>
      )}

      {/* ── MAIN ── */}
      {/* Onboarding prompt: encourage first-time users to add their API key in Settings */}
      {!localApiKey && (
        <div style={{ maxWidth: 860, margin: '12px auto', padding: '10px 20px', background: '#2b2928', border: '1px solid #3a3634', borderRadius: 8, color: '#e8ddd6', textAlign: 'center' }}>
          {bn ? 'প্রথমবার এখানে এসেছেন? সেটিংসে গিয়ে আপনার Anthropic API কী দিন (ঐচ্ছিক), বা প্রোজেক্ট-level .env ব্যবহার করুন।' : 'First time here? Add your Anthropic API key in Settings (optional) or set CLAUDE_KEY in .env for server-wide use.'}
        </div>
      )}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "0 20px 60px" }}>
        <PanelCard color={activeTab?.color}>
          {panelMap[tab]}
        </PanelCard>

        {/* Footer */}
        <footer style={{ textAlign: "center", marginTop: 36, paddingTop: 20, borderTop: "1px solid #242120" }}>
          <div style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: 700, fontSize: 15, letterSpacing: "-.2px" }}>
            <span style={{ background: "linear-gradient(90deg,#9cc4b2,#c98ca7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Lamina</span>
            <span style={{ background: "linear-gradient(90deg,#c98ca7,#e76d83)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>.io</span>
          </div>
          <div style={{ fontSize: 10.5, color: "#4a4240", marginTop: 5, fontFamily: "'DM Sans', sans-serif", letterSpacing: ".06em", textTransform: "uppercase" }}>
            {bn ? "বাংলাদেশের শিক্ষার্থীদের জন্য AI — Infinity AI BuildFest 2026" : "AI for Bangladeshi Students — Infinity AI BuildFest 2026"}
          </div>
        </footer>
      </main>
    </div>
  );
}
