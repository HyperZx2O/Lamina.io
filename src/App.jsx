import React, { useState, useEffect, useCallback, useMemo } from "react";
import SettingsModal from './components/SettingsModal.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import TutorPanel from './components/TutorPanel.jsx';
import TeacherPanel from './components/TeacherPanel.jsx';
import MultiPanel from './components/MultiPanel.jsx';
import AnswerPanel from './components/AnswerPanel.jsx';
import QuestionsPanel from './components/QuestionsPanel.jsx';
import Header from './components/Header.jsx';
import PanelCard from './components/PanelCard.jsx';
import RecentActivity from './components/RecentActivity.jsx';
import { renderResponseToHtml } from './lib/katexLoader';
const TABS = [
  { id: "tutor",     icon: "🎓", en: "Adaptive Tutor",   bn: "অ্যাডাপটিভ টিউটর", color: "#9cc4b2", glow: "rgba(156,196,178,.28)" },
  { id: "teacher",   icon: "👩‍🏫", en: "Teacher Copilot",  bn: "শিক্ষক সহকারী",     color: "#b5d4c8", glow: "rgba(181,212,200,.22)" },
  { id: "multi",     icon: "🌐", en: "Multilingual",      bn: "বহুভাষিক",           color: "#c98ca7", glow: "rgba(201,140,167,.28)" },
  { id: "answer",    icon: "💡", en: "Generate Answer",   bn: "উত্তর তৈরি",          color: "#d5bbb1", glow: "rgba(213,187,177,.28)" },
  { id: "questions", icon: "❓", en: "Suggest Questions", bn: "প্রশ্ন সাজেস্ট",      color: "#e76d83", glow: "rgba(231,109,131,.28)" },
];

// Panel components have been extracted to separate files in ./components/
// The individual panels (TutorPanel, TeacherPanel, MultiPanel, AnswerPanel, QuestionsPanel)
// are imported at the top of this file and used in the `panelMap` below.

// ═══════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════

function loadPref(key, fallback) { try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; } }
function savePref(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* localStorage not available */ } }

async function callAPI(system, user) {
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
}

const HARDENED_INSTRUCTIONS = 
  "\nThink step by step before answering. " +
  "If you are unsure about any fact, clearly state your uncertainty rather than guessing. " +
  "Only answer questions relevant to secondary school education in Bangladesh. " +
  "Use examples from daily life in Bangladesh where possible. " +
  "Never provide direct answers to what appear to be official exam questions.";

function buildTutorPrompt(bn, subject, level) {
  return (bn ? `আপনি একজন সহৃদয়, নির্ভরযোগ্য বাংলাদেশ-কেন্দ্রিক শিক্ষাসাহায়ক। বিষয়: ${subject}। স্তর: ${level}।` : `You are a helpful, curriculum-aware tutor for Bangladesh. Subject: ${subject}. Level: ${level}.`) + HARDENED_INSTRUCTIONS;
}
function buildTeacherPrompt(bn, type) {
  return (bn ? `আপনি একজন শিক্ষক সহকারী, অনুরোধ: ${type}` : `You are a teacher assistant. Request type: ${type}`) + HARDENED_INSTRUCTIONS;
}
function buildMultiPrompt(mode) {
  // mode values: en-bn, bn-en, simplify-en, simplify-bn, trans
  let instruction = '';
  switch (mode) {
    case 'en-bn':
      instruction = `You are an AI translator. Translate the following English text to Bangla. Output ONLY the translation, without any explanation or additional text.`;
      break;
    case 'bn-en':
      instruction = `You are an AI translator. Translate the following Bangla text to English. Output ONLY the translation, without any explanation or additional text.`;
      break;
    case 'simplify-en':
      instruction = `You are an AI simplifier. Simplify the following English text for a secondary‑school student in Bangladesh. Output ONLY the simplified version, no extra commentary.`;
      break;
    case 'simplify-bn':
      instruction = `You are an AI simplifier. Simplify the following Bangla text for a secondary‑school student in Bangladesh. Output ONLY the simplified version, no extra commentary.`;
      break;
    case 'trans':
      instruction = `The user will type Bengali words written in English (Banglish/phonetic Bengali). Convert this into two outputs:\n1. The correct Bengali script (Bangla)\n2. The English meaning\nAlways respond in exactly this format:\nবাংলা: [bengali script here]\nEnglish: [english meaning here]\nDo not add any explanation or extra text.`;
      break;
    default:
      instruction = `Perform the requested operation.`;
  }
  return instruction;
}
function buildAnswerPrompt(bn, level) { 
  return (bn ? `উত্তর লেখার নির্দেশিকা — স্তর: ${level}` : `Answer formatting instructions — level: ${level}`) + HARDENED_INSTRUCTIONS; 
}
function buildQuestionsPrompt(bn, qType, count) { 
  return (bn ? `প্রশ্ন তৈরির নির্দেশ — ধরন: ${qType}, সংখ্যা: ${count}` : `Question generation instructions — type: ${qType}, count: ${count}`) + HARDENED_INSTRUCTIONS; 
}

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
  const [localApiKey, setLocalApiKey] = useState(() => loadPref('lamina_api_key', ''));
  const [historyModal, setHistoryModal] = useState(null);
  const bn = lang === "bn";

  // Keep localApiKey in sync when settings change
  useEffect(() => {
    const handler = () => setLocalApiKey(loadPref('lamina_api_key', ''));
    window.addEventListener('storage', handler);
    // Also poll on focus since storage events don't fire on the same tab
    const onFocus = () => handler();
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('storage', handler); window.removeEventListener('focus', onFocus); };
  }, []);

  const [history, setHistory] = useState(() => loadPref("lamina_history", []));
  const [streak, setStreak] = useState(() => loadPref("lamina_streak", { streak: 0, lastStudied: "" }));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  const updateStreak = (currentStreak) => {
    const now = new Date();
    const todayISO = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

    // If no streak data, start fresh
    if (!currentStreak || !currentStreak.lastStudied) {
      return { lastStudied: now.toISOString(), streak: 1 };
    }

    const lastISO = new Date(currentStreak.lastStudied).toISOString().slice(0, 10);

    // Same day: keep streak, just update timestamp
    if (todayISO === lastISO) {
      return { ...currentStreak, lastStudied: now.toISOString() };
    }

    // Compute difference in days
    const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const lastDate = new Date(currentStreak.lastStudied);
    const lastMs = Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth(), lastDate.getUTCDate());
    const diffDays = Math.round((todayMs - lastMs) / (1000 * 60 * 60 * 24));

    let nextStreak = currentStreak.streak;
    if (diffDays === 1) {
      nextStreak += 1; // consecutive day
    } else if (diffDays > 1) {
      nextStreak = 1; // break in streak
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
    tutor:     <TutorPanel     bn={bn} callAPI={callAPI} buildTutorPrompt={buildTutorPrompt} trackActivity={trackActivity} />,
    teacher:   <TeacherPanel   bn={bn} callAPI={callAPI} buildTeacherPrompt={buildTeacherPrompt} trackActivity={trackActivity} />,
    multi:     <MultiPanel     bn={bn} callAPI={callAPI} buildMultiPrompt={buildMultiPrompt} trackActivity={trackActivity} />,
    answer:    <AnswerPanel    bn={bn} callAPI={callAPI} buildAnswerPrompt={buildAnswerPrompt} trackActivity={trackActivity} />,
    questions: <QuestionsPanel bn={bn} callAPI={callAPI} buildQuestionsPrompt={buildQuestionsPrompt} trackActivity={trackActivity} />,
    settings:  <SettingsPanel  bn={bn} />,
  };

  const styleTag = useMemo(() => (
    <style key="app-styles">{`
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
      @keyframes slideIn       { from { transform: translateX(100%); } to { transform: translateX(0); } }
    `}</style>
  ), [activeTab?.color]);

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", background: "#1c1917", minHeight: "100vh", color: "#e8ddd6" }}>
      {styleTag}

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
        />
      </>

      {/* Settings Modal (centered) */}
      {settingsOpen && (
        <SettingsModal bn={bn} onClose={() => setSettingsOpen(false)}>
          <SettingsPanel bn={bn} />
        </SettingsModal>
      )}

      {/* History Entry Modal */}
      {historyModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          fontFamily: "'DM Sans', sans-serif"
        }} onClick={() => setHistoryModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#2e3234', border: '1px solid #424849', borderRadius: 16,
            maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto',
            padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: '#7a6d69', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                  {historyModal.panel === 'tutor' ? (bn ? 'অ্যাডাপটিভ টিউটর' : 'Adaptive Tutor') :
                   historyModal.panel === 'teacher' ? (bn ? 'শিক্ষক সহকারী' : 'Teacher Copilot') :
                   historyModal.panel === 'multi' ? (bn ? 'বহুভাষিক' : 'Multilingual') :
                   historyModal.panel === 'answer' ? (bn ? 'উত্তর তৈরি' : 'Generate Answer') :
                   historyModal.panel === 'questions' ? (bn ? 'প্রশ্ন সাজেস্ট' : 'Suggest Questions') : ''}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#d5bbb1' }}>{historyModal.topic}</div>
                <div style={{ fontSize: 11, color: '#7a6d69', marginTop: 4 }}>
                  {new Date(historyModal.timestamp).toLocaleString()}
                </div>
              </div>
              <button onClick={() => setHistoryModal(null)} style={{
                background: 'transparent', border: 'none', color: '#7a6d69',
                cursor: 'pointer', fontSize: 20, padding: 4, lineHeight: 1
              }}>✕</button>
            </div>
            <div style={{
              background: '#252829', border: '1px solid #424849', borderRadius: 10,
              padding: 16, fontSize: 14, lineHeight: 1.7,
              wordBreak: 'break-word', maxHeight: 400, overflow: 'auto'
            }} dangerouslySetInnerHTML={{ __html: renderResponseToHtml(historyModal.response) }} />
          </div>
        </div>
      )}

      {/* Layout wrapper for main page and sidebar */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 90px)', position: 'relative' }}>
        {/* ── MAIN ── */}
        <div style={{ flex: 1, transition: 'all 0.3s' }}>
          {/* Onboarding prompt: encourage first-time users to add their API key in Settings */}
          {!localApiKey && showOnboarding && (
            <div style={{ maxWidth: 860, margin: '12px auto', padding: '10px 20px', background: '#2b2928', border: '1px solid #3a3634', borderRadius: 8, color: '#e8ddd6', textAlign: 'center', position: 'relative' }}>
              <button onClick={() => setShowOnboarding(false)}
                style={{ position: 'absolute', top: 4, right: 6, background: 'transparent', border: 'none', color: '#e8ddd6', fontSize: 14, cursor: 'pointer' }}>
                ✕
              </button>
              {bn ? 'প্রথমবার এখানে এসেছেন? সেটিংসে গিয়ে আপনার Anthropic API কী দিন (ঐচ্ছিক), বা প্রোজেক্ট-level .env ব্যবহার করুন।' : 'First time here? Add your Anthropic API key in Settings (optional) or set CLAUDE_KEY in .env for server-wide use.'}
            </div>
          )}
          <main style={{ maxWidth: 860, margin: "0 auto", padding: "20px 20px 60px" }}>
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

        {/* ── SIDEBAR ── */}
        {sidebarOpen && (
          <aside style={{
            width: 320,
            position: 'fixed',
            right: 0,
            top: 73, // Header height offset
            bottom: 0,
            zIndex: 100,
            boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <RecentActivity
              history={history}
              streak={streak}
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
  );
}
