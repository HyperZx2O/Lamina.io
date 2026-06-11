import React, { useState, useEffect, useCallback, useMemo } from "react";
import SettingsModal from './components/SettingsModal.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import TutorPanel from './components/TutorPanel.jsx';
import TeacherPanel from './components/TeacherPanel.jsx';
import MultiPanel from './components/MultiPanel.jsx';
import AnswerPanel from './components/AnswerPanel.jsx';
import QuestionsPanel from './components/QuestionsPanel.jsx';
import Header from './components/Header.jsx';
import ErrorBoundary from './components/docs/ErrorBoundary.jsx';
import PanelCard from './components/PanelCard.jsx';
import RecentActivity from './components/RecentActivity.jsx';
import { renderResponseToHtml } from './lib/katexLoader';
import { TABS } from './lib/featureCatalog.js';
import { XMarkIcon } from '@heroicons/react/24/outline';

function loadPref(key, fallback) { try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; } }
function savePref(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* localStorage not available */ } }

async function callAPI(system, user, signal) {
    const bn = loadPref('lamina_lang', 'en') === 'bn';
    const apiKey = loadPref('lamina_api_key', '') || '';
    const modelOverride = loadPref('lamina_model_override', '') || '';
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-claude-key'] = apiKey;
    if (modelOverride) headers['x-model-override'] = modelOverride;
    try {
      const res = await fetch('/api/claude', { method: 'POST', headers, body: JSON.stringify({ system, user }), signal });
      if (res.status === 429) throw new Error(bn ? 'অনেকগুলি অনুরোধ করা হচ্ছে। দয়া করে একটু অপেক্ষা করুন।' : 'Too many requests. Please wait a moment and try again.');
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j && (j.error || j.message)) || JSON.stringify(j));
      }
      const j = await res.json();
      if (typeof j === 'string') return j;
      if (j.content && j.content[0] && j.content[0].text) return j.content[0].text;
      if (j.output_text) return j.output_text;
      if (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) return j.choices[0].message.content;
      if (j.response) return j.response;
      return JSON.stringify(j);
    } catch (e) {
      if (e.name === 'TypeError' && e.message.includes('fetch')) {
        throw new Error(bn ? 'নেটওয়ার্ক ত্রুটি। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।' : 'Network error. Please check your internet connection.');
      }
      throw e;
    }
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
  const [localApiKey, setLocalApiKey] = useState(() => loadPref('lamina_api_key', ''));
  const [historyModal, setHistoryModal] = useState(null);
  const bn = lang === "bn";

  useEffect(() => {
    const handler = () => setLocalApiKey(loadPref('lamina_api_key', ''));
    window.addEventListener('storage', handler);
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
    <div className="font-sans bg-base-900 min-h-screen text-base-50" style={{ '--focus-color': activeTab?.color || '#9cc4b2' }}>
      <style>{`*{box-sizing:border-box}input:focus,textarea:focus,select:focus{border-color:var(--focus-color)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--focus-color) 9.4%,transparent)!important;outline:none}select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b5e58' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 13px center;padding-right:36px!important}select option{background:#2e2b2a;color:#e8ddd6}.badge{display:inline-block;padding:2px 9px;border-radius:99px;font-size:10px;font-weight:700;font-family:'DM Sans',sans-serif;letter-spacing:.05em;text-transform:uppercase;vertical-align:middle}.badge-easy{background:rgba(156,196,178,.14);color:#9cc4b2;border:1px solid rgba(156,196,178,.2)}.badge-medium{background:rgba(213,187,177,.12);color:#d5bbb1;border:1px solid rgba(213,187,177,.2)}.badge-hard{background:rgba(231,109,131,.12);color:#e76d83;border:1px solid rgba(231,109,131,.2)}`}</style>

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

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal bn={bn} onClose={() => setSettingsOpen(false)}>
          <SettingsPanel bn={bn} />
        </SettingsModal>
      )}

      {/* History Entry Modal */}
      {historyModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="history-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setHistoryModal(null)}>
          <div onClick={e => e.stopPropagation()} className="glass-card max-w-xl w-[90%] max-h-[80vh] overflow-auto p-7">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div id="history-modal-title" className="text-[10px] text-base-300 uppercase tracking-widest mb-1">
                  {PANEL_NAMES[historyModal.panel]?.[bn ? 'bn' : 'en'] || ''}
                </div>
                <div className="text-base font-bold text-accent-beige">{historyModal.topic}</div>
                <div className="text-xs text-base-300 mt-1">
                  {new Date(historyModal.timestamp).toLocaleString()}
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

      {/* Layout wrapper for main page and sidebar */}
      <div className="flex min-h-[calc(100vh-90px)] relative">
        {/* ── MAIN ── */}
        <div className="flex-1 transition-all duration-300">
          {/* Onboarding banner */}
          {!localApiKey && showOnboarding && (
            <div className="glass-card max-w-[860px] mx-auto mt-3 px-5 py-2.5 text-center relative">
              <button onClick={() => setShowOnboarding(false)}
                className="absolute top-1 right-1.5 bg-transparent border-none text-base-50 cursor-pointer">
                <XMarkIcon className="w-4 h-4" />
              </button>
              {bn ? 'প্রথমবার এখানে এসেছেন? সেটিংসে গিয়ে আপনার Anthropic API কী দিন (ঐচ্ছিক), বা প্রোজেক্ট-level .env ব্যবহার করুন।' : 'First time here? Add your Anthropic API key in Settings (optional) or set CLAUDE_KEY in .env for server-wide use.'}
            </div>
          )}
          <main className="max-w-[860px] mx-auto px-5 pb-[60px] pt-5">
            <PanelCard color={activeTab?.color}>
              {panelMap[tab]}
            </PanelCard>

            {/* Footer */}
            <footer className="text-center mt-9 pt-5 border-t border-base-700">
              <div className="font-display font-bold text-[15px] tracking-tight">
                <span className="bg-gradient-to-r from-accent-sage via-accent-rose to-accent-coral bg-clip-text text-transparent">Lamina.io</span>
              </div>
              <div className="text-[10.5px] text-base-400 uppercase tracking-widest mt-1">
                {bn ? "বাংলাদেশের শিক্ষার্থীদের জন্য AI — Infinity AI BuildFest 2026" : "AI for Bangladeshi Students — Infinity AI BuildFest 2026"}
              </div>
            </footer>
          </main>
        </div>

        {/* ── SIDEBAR ── */}
        {sidebarOpen && (
          <aside className="fixed right-0 top-[73px] bottom-0 z-50 shadow-2xl w-80">
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
