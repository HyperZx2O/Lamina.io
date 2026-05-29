import React from 'react';
import { motion } from 'framer-motion';

export default function Header({ bn, lang, handleSetLang, tab, handleSetTab, TABS, activeTab, setSettingsOpen, globalLoading }) {
  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.36 }}
      style={{
      background: "rgba(28,25,23,.92)",
      borderBottom: "1px solid #2e2b2a",
      padding: "0 20px",
      position: "sticky", top: 0, zIndex: 50,
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
      overflow: "hidden",
    }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div className="logo-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "linear-gradient(135deg, #9cc4b2 0%, #c98ca7 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 19, flexShrink: 0,
              boxShadow: "0 2px 14px rgba(156,196,178,.2)",
            }}>📚</div>
            <div>
              <div style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: 700, fontSize: 23, letterSpacing: "-.5px", lineHeight: 1, color: "#e8ddd6" }}>
                Lamina
                <span style={{ background: "linear-gradient(90deg,#9cc4b2,#c98ca7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>.io</span>
              </div>
              <div style={{ fontSize: 9.5, color: "#6b5e58", marginTop: 3, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>
                {bn ? "বাংলাদেশের জন্য AI শিক্ষা" : "Adaptive AI Learning · Bangladesh"}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="lang-toggle" style={{ display: "flex", gap: 2, background: "#2e2b2a", borderRadius: 8, padding: "3px", border: "1px solid #3a3634" }}>
              {[["en","🇬🇧 EN"],["bn","🇧🇩 বাং"]].map(([l, label]) => (
                <button key={l} onClick={() => handleSetLang(l)} style={{
                  padding: "5px 14px", borderRadius: 6, border: "none",
                  background: lang === l ? `linear-gradient(135deg, ${activeTab?.color || '#9cc4b2'}, ${activeTab?.color || '#9cc4b2'}bb)` : "transparent",
                  color: lang === l ? "#1c1917" : "#6b5e58",
                  fontWeight: 700, fontSize: 11, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: lang === l ? `0 2px 8px ${activeTab?.color || '#9cc4b2'}28` : "none",
                }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ marginLeft: 2 }}>
              <button aria-label={bn ? 'সেটিংস' : 'Settings'} title={bn ? 'সেটিংস' : 'Settings'} onClick={() => setSettingsOpen(true)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #3a3634', background: 'transparent', color: '#a89890', cursor: 'pointer', fontWeight: 700 }}>
                ⚙️
              </button>
            </div>
          </div>
        </div>

        <nav style={{ display: "flex", gap: 0, overflowX: "auto", marginTop: 6 }}>
            {TABS.map(t => {
            const active = tab === t.id;
            return (
              <motion.button key={t.id} onClick={() => handleSetTab(t.id)}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
                title={bn ? t.bn : t.en}
                aria-label={`${t.en} / ${t.bn}`}
                style={{
                  padding: "10px 16px", border: "none", background: "transparent",
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12.5,
                  fontWeight: active ? 600 : 400,
                  color: active ? t.color : "#4a4240",
                  borderBottom: `2px solid ${active ? t.color : "transparent"}`,
                  whiteSpace: "nowrap", position: "relative", top: "1px",
                  letterSpacing: ".01em", transition: "color .18s, border-color .18s",
                }}>
                <span className="tab-icon">{t.icon}</span>
                <span className="tab-label"> {bn ? t.bn : t.en}</span>
              </motion.button>
            );
          })}
        </nav>
      </div>

      <style>{`@media (max-width: 520px) { .tab-label { display: none; } button[title] { padding: 10px 13px; } }`}</style>
    </motion.header>
  );
}
