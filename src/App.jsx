import React, { useState, useEffect, useRef, useCallback } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

const TABS = [
  { id: "tutor",     icon: "🎓", en: "Adaptive Tutor",   bn: "অ্যাডাপটিভ টিউটর", color: "#9cc4b2", glow: "rgba(156,196,178,.28)" },
  { id: "teacher",   icon: "👩‍🏫", en: "Teacher Copilot",  bn: "শিক্ষক সহকারী",     color: "#b5d4c8", glow: "rgba(181,212,200,.22)" },
  { id: "multi",     icon: "🌐", en: "Multilingual",      bn: "বহুভাষিক",           color: "#c98ca7", glow: "rgba(201,140,167,.28)" },
  { id: "answer",    icon: "💡", en: "Generate Answer",   bn: "উত্তর তৈরি",          color: "#d5bbb1", glow: "rgba(213,187,177,.28)" },
  { id: "questions", icon: "❓", en: "Suggest Questions", bn: "প্রশ্ন সাজেস্ট",      color: "#e76d83", glow: "rgba(231,109,131,.28)" },
];

const SUBJECTS = [
  ["Physics","পদার্থবিজ্ঞান"],["Chemistry","রসায়ন"],["Biology","জীববিজ্ঞান"],
  ["Mathematics","গণিত"],["English","ইংরেজি"],["Bangla","বাংলা"],
  ["History","ইতিহাস"],["ICT","তথ্য প্রযুক্তি"],
];

const TEACHER_TYPES = [
  ["lesson","📋","Lesson Plan","পাঠ পরিকল্পনা"],
  ["quiz","📝","Quiz","কুইজ"],
  ["rubric","⭐","Rubric","রুব্রিক"],
  ["email","📧","Parent Email","অভিভাবক পত্র"],
  ["activity","🎮","Class Activity","ক্লাস কার্যক্রম"],
  ["feedback","💬","Feedback","মতামত টেমপ্লেট"],
];

const MULTI_MODES = [
  ["en-bn","🇬🇧→🇧🇩","English → Bangla","ইংরেজি → বাংলা"],
  ["bn-en","🇧🇩→🇬🇧","Bangla → English","বাংলা → ইংরেজি"],
  ["simplify-en","✂️","Simplify English","ইংরেজিতে সরলীকরণ"],
  ["simplify-bn","✂️","Simplify Bangla","বাংলায় সরলীকরণ"],
];

const ANSWER_LEVELS = [
  ["beginner","🟢","Simple & Clear","সহজ ও স্পষ্ট"],
  ["intermediate","🟡","Detailed (Class 10)","বিস্তারিত (শ্রেণী ১০)"],
  ["advanced","🔴","Exam-Ready (SSC)","পরীক্ষার জন্য (SSC)"],
];

const QUESTION_TYPES = [
  ["mixed","Mixed Types","মিশ্র ধরন"],
  ["mcq","Multiple Choice (MCQ)","বহুনির্বাচনী (MCQ)"],
  ["short","Short Answer","সংক্ষিপ্ত উত্তর"],
  ["problem","Problem Solving","সমস্যা সমাধান"],
  ["creative","Creative / Essay","সৃজনশীল"],
];

// ═══════════════════════════════════════════════════════════════
// PERSISTENCE (localStorage)
// ═══════════════════════════════════════════════════════════════

function loadPref(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function savePref(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ═══════════════════════════════════════════════════════════════
// API LAYER
// ═══════════════════════════════════════════════════════════════

function friendlyError(msg) {
  const m = (msg || "").toLowerCase();
  if (m.includes("rate limit")) return "The AI is busy right now — please wait a moment and try again.";
  if (m.includes("timeout") || m.includes("network")) return "Connection issue — check your internet and try again.";
  return msg;
}

async function callAPI(system, user) {
  // Use a server-side proxy to keep the API key secret and avoid CORS issues.
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, user }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error || data?.message || JSON.stringify(data);
      throw new Error(msg);
    }

    // Try several common response shapes returned by proxies/Anthropic
    if (typeof data === 'string') return data;
    if (data?.content?.[0]?.text) return data.content[0].text;
    if (data?.output_text) return data.output_text;
    if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content;
    if (data?.response) return data.response;
    // Fallback to raw JSON string
    return JSON.stringify(data);
  } catch (e) {
    throw e;
  }
}
// ═══════════════════════════════════════════════════════════════
// PROMPT BUILDERS
// ═══════════════════════════════════════════════════════════════

function buildTutorPrompt(bn, tSub, tLvl) {
  if (bn) {
    const lvlMap = { beginner: "শিক্ষানবিস (শ্রেণী ৮-৯)", intermediate: "মধ্যবর্তী (শ্রেণী ১০)", advanced: "উন্নত (SSC/HSC)" };
    return `তুমি Lamina.io-র AI টিউটর। বাংলাদেশের NCTB পাঠ্যক্রম অনুসরণ করে ${lvlMap[tLvl]} স্তরের শিক্ষার্থীর জন্য ${tSub} বিষয়টি শেখাও। পরিষ্কার, সহজ, ও বন্ধুত্বপূর্ণ বাংলায় লেখো। উত্তরটি এই কাঠামোতে দাও: ## সংক্ষিপ্ত ধারণা, ## ধাপে ধাপে ব্যাখ্যা, ## মূল সূত্র/নিয়ম, ## দৈনন্দিন উদাহরণ, ## এক লাইনের সারাংশ, ## 2টি অনুশীলন প্রশ্ন। যদি বিষয়টি গণিত বা পদার্থবিজ্ঞানের হয়, একটি ছোট worked example যোগ করো.`;
  }
  return `You are Lamina.io's adaptive AI tutor for Bangladeshi secondary school students. Subject: ${tSub}. Level: ${tLvl}. Teach the topic in a clear, student-friendly way aligned with the NCTB curriculum. Use this structure: ## Quick Overview, ## Step-by-Step Explanation, ## Key Formula / Rule, ## Bangladesh or everyday example, ## Common mistake to avoid, ## Practice Question. Keep the difficulty matched to the selected level and avoid unnecessary preamble.`;
}

function buildTeacherPrompt(bn, tcType) {
  const specs = {
    lesson: {
      bn: "একটি ৪৫ মিনিটের পাঠ পরিকল্পনা দাও। কাঠামো: ## শেখার লক্ষ্য, ## পূর্বজ্ঞান, ## উপকরণ, ## ৫ মিনিটভিত্তিক ধাপ, ## মূল্যায়ন, ## বাড়ির কাজ, ## ভিন্ন স্তরের জন্য সহায়তা.",
      en: "Create one complete 45-minute lesson plan. Use this structure: ## Learning Objectives, ## Prior Knowledge, ## Materials, ## 5-Minute Stages, ## Assessment, ## Homework, ## Differentiation."
    },
    quiz: {
      bn: "একটি কুইজ বা টেস্ট তৈরি করো। কাঠামো: ## নির্দেশনা, ## MCQ, ## সংক্ষিপ্ত উত্তর, ## উত্তরপত্র.",
      en: "Create a quiz or test. Use this structure: ## Instructions, ## MCQ, ## Short Answer, ## Answer Key."
    },
    rubric: {
      bn: "একটি রুব্রিক তৈরি করো। 4-স্তরের স্কেল ব্যবহার করো এবং একটি পরিষ্কার টেবিল দাও: মানদণ্ড, ভালো, সন্তোষজনক, উন্নতির প্রয়োজন, সর্বোচ্চ নম্বর.",
      en: "Create an assessment rubric. Use a 4-level scale and present it as a clear table: Criteria, Excellent, Satisfactory, Needs Improvement, Max Marks."
    },
    email: {
      bn: "অভিভাবকদের জন্য একটি ভদ্র, পেশাদার, সংক্ষিপ্ত ইমেইল/বার্তা লিখো। কাঠামো: উদ্দেশ্য, মূল বার্তা, করণীয়, সমাপ্তি.",
      en: "Write a polite, professional, concise parent email or message. Structure it as: Purpose, Main Message, Action Needed, Closing."
    },
    activity: {
      bn: "একটি ক্লাস কার্যক্রম দাও। কাঠামো: উদ্দেশ্য, সময়, উপকরণ, ধাপ, শিক্ষক ভূমিকা, শিক্ষার্থীর ভূমিকা, মূল্যায়ন.",
      en: "Create a classroom activity. Use this structure: Objective, Time, Materials, Steps, Teacher Role, Student Role, Assessment."
    },
    feedback: {
      bn: "একটি শিক্ষার্থী ফিডব্যাক টেমপ্লেট দাও। কাঠামো: শক্তি, উন্নতির ক্ষেত্র, পরের ধাপ, উৎসাহমূলক সমাপ্তি.",
      en: "Create a student feedback template. Use this structure: Strengths, Areas to Improve, Next Steps, Encouraging Closing."
    },
  };
  const spec = specs[tcType] || {
    bn: "পরিষ্কার ## শিরোনাম ব্যবহার করো, যুক্তিসংগত অনুমান নাও, এবং আউটপুট ব্যবহারযোগ্য রাখো.",
    en: "Use clear ## headings, make reasonable assumptions, and keep the output directly usable."
  };
  if (bn) return `তুমি Lamina.io-র শিক্ষক সহকারী। বাংলাদেশের মাধ্যমিক বিদ্যালয়ের শিক্ষকদের জন্য NCTB-সামঞ্জস্যপূর্ণ, বাস্তবে ব্যবহারযোগ্য উপকরণ তৈরি করো। কোনো clarification প্রশ্ন করবে না। ${spec.bn}`;
  return `You are Lamina.io's Teacher Copilot for Bangladeshi secondary schools. Create practical, NCTB-aligned classroom material. Do not ask clarification questions. ${spec.en} Keep the writing concise, concrete, and classroom-ready.`;
}

function buildMultiPrompt(mDir) {
  const dmap = {
    "en-bn": "Translate this educational content from English to Bangla (Bengali script). Preserve all technical terms with accurate Bangla equivalents. Keep formatting and structure.",
    "bn-en": "Translate this educational content from Bangla to English. Preserve technical accuracy. Keep formatting and structure.",
    "simplify-en": "Simplify this educational content in English for a Class 8-10 student. Break down complex terms, use short sentences, add brief examples where helpful.",
    "simplify-bn": "এই শিক্ষামূলক বিষয়বস্তু বাংলায় ক্লাস ৮-১০-এর শিক্ষার্থীর জন্য সরলীকরণ করো। জটিল শব্দ ভাঙো, ছোট বাক্য ব্যবহার করো।",
  };
  const styleGuide = "Preserve headings, bullets, formulas, and examples where present. Do not add commentary or summaries unless needed for clarity. Return only the transformed text.";
  return `You are Lamina.io's multilingual education specialist for Bangladeshi secondary school students. ${dmap[mDir]} ${styleGuide}`;
}

function buildAnswerPrompt(bn, aLvl) {
  if (bn) {
    const lvlMap = { beginner: "সহজ ভাষায়", intermediate: "বিস্তারিত", advanced: "পরীক্ষার উপযোগী" };
    return `তুমি Lamina.io-র AI সহকারী। বাংলাদেশের মাধ্যমিক শিক্ষার্থীদের জন্য ${lvlMap[aLvl]} উত্তর দাও। কাঠামো: ## দ্রুত উত্তর, ## বিস্তারিত ব্যাখ্যা, ## মূল পয়েন্ট, ## উদাহরণ, ## মনে রাখুন। উত্তরটি সরাসরি, পরীক্ষামুখী, এবং অপ্রয়োজনীয় ভূমিকা ছাড়া হবে।`;
  }
  return `You are Lamina.io's answer generation AI for Bangladeshi secondary school students. Level: ${aLvl}. Structure the response as: ## Quick Answer, ## Detailed Explanation, ## Key Points, ## Example, ## Remember. Keep it clear, accurate, and suited to the selected level. Avoid filler and keep the response focused on the question.`;
}

function buildQuestionsPrompt(bn, qType, qCount) {
  const tmap = { mixed: "mixed-type (MCQ + short answer + problem-solving)", mcq: "multiple choice (MCQ)", short: "short answer", problem: "problem-solving/application", creative: "creative/essay" };
  if (bn) return `তুমি Lamina.io-র প্রশ্ন তৈরিকারী। NCTB পাঠ্যক্রম অনুযায়ী বাংলায় ${qCount}টি ${tmap[qType]} অনুশীলন প্রশ্ন তৈরি করো। প্রশ্নগুলো সহজ থেকে কঠিন ক্রমে সাজাও। প্রতিটি প্রশ্নে [সহজ], [মধ্যম], বা [কঠিন] ট্যাগ দাও। MCQ হলে A, B, C, D অপশন এবং শেষে উত্তরপত্র দাও।`;
  return `You are Lamina.io's Question Generator. Create ${qCount} ${tmap[qType]} practice questions for Bangladeshi secondary students aligned with NCTB. Order the questions from easier to harder. Tag each question with [Easy], [Medium], or [Hard]. For MCQ, include A-D options and add an answer key at the end.`;
}

// ═══════════════════════════════════════════════════════════════
// MARKDOWN FORMATTER
// ═══════════════════════════════════════════════════════════════

function formatInline(text) {
  if (!text) return "";

  const codeSegments = [];
  const blockMathSegments = [];
  const inlineMathSegments = [];

  const escapeHtml = (value) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const renderMath = (expr, displayMode = false) => {
    try {
      return katex.renderToString(expr, { throwOnError: false, displayMode });
    } catch {
      return escapeHtml(expr);
    }
  };

  let output = text.replace(/`([^`]+)`/g, (_, code) => {
    const token = `__CODE_${codeSegments.length}__`;
    codeSegments.push(
      `<code style="background:rgba(156,196,178,.1);padding:2px 7px;border-radius:4px;font-family:'JetBrains Mono','Fira Code',monospace;font-size:12px;color:#9cc4b2;border:1px solid rgba(156,196,178,.15)">${escapeHtml(code)}</code>`
    );
    return token;
  });

  output = output.replace(/\$\$(.+?)\$\$/g, (_, expr) => {
    const token = `__MATH_BLOCK_${blockMathSegments.length}__`;
    blockMathSegments.push(`<span class="katex-block">${renderMath(expr.trim(), true)}</span>`);
    return token;
  });

  output = output.replace(/\$(?!\$)(.+?)\$(?!\$)/g, (_, expr) => {
    const token = `__MATH_INLINE_${inlineMathSegments.length}__`;
    inlineMathSegments.push(renderMath(expr.trim(), false));
    return token;
  });

  output = output
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8ddd6;font-weight:600">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[Easy\]/g,   '<span class="badge badge-easy">Easy</span>')
    .replace(/\[Medium\]/g, '<span class="badge badge-medium">Medium</span>')
    .replace(/\[Hard\]/g,   '<span class="badge badge-hard">Hard</span>')
    .replace(/\[সহজ\]/g,   '<span class="badge badge-easy">সহজ</span>')
    .replace(/\[মধ্যম\]/g, '<span class="badge badge-medium">মধ্যম</span>')
    .replace(/\[কঠিন\]/g,  '<span class="badge badge-hard">কঠিন</span>');

  blockMathSegments.forEach((mathHtml, index) => {
    output = output.replace(`__MATH_BLOCK_${index}__`, mathHtml);
  });

  inlineMathSegments.forEach((mathHtml, index) => {
    output = output.replace(`__MATH_INLINE_${index}__`, mathHtml);
  });

  codeSegments.forEach((codeHtml, index) => {
    output = output.replace(`__CODE_${index}__`, codeHtml);
  });

  return output;
}

function renderMarkdown(text) {
  if (!text) return [];
  const lines = text.split("\n");
  const els = [];
  let listItems = [];
  let mathLines = [];
  let inMathBlock = false;
  let key = 0;

  const flushMath = () => {
    if (!mathLines.length) return;
    const expr = mathLines.join("\n").trim();
    if (!expr) {
      mathLines = [];
      return;
    }
    els.push(
      <div key={key++} style={{ margin: "12px 0", overflowX: "auto" }} dangerouslySetInnerHTML={{ __html: katex.renderToString(expr, { throwOnError: false, displayMode: true }) }} />
    );
    mathLines = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    els.push(
      <ul key={key++} style={{ margin: "6px 0 10px 0", padding: 0, listStyle: "none" }}>
        {listItems.map((li, i) => (
          <li key={i} style={{ display: "flex", gap: 10, marginBottom: 6, animation: `fadeUp .3s ease both`, animationDelay: `${i * 30}ms` }}>
            <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 4, fontSize: 7, opacity: 0.7 }}>◆</span>
            <span style={{ color: "#a89890", lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: formatInline(li) }} />
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((raw) => {
    const l = raw.trim();
    if (inMathBlock) {
      if (l.endsWith("$$")) {
        mathLines.push(l.slice(0, -2).trim());
        inMathBlock = false;
        flushMath();
      } else {
        mathLines.push(raw);
      }
      return;
    }

    if (!l) { flushList(); flushMath(); els.push(<div key={key++} style={{ height: 8 }} />); return; }
    if (l.startsWith("$$") && l.endsWith("$$") && l.length > 4) {
      flushList();
      els.push(
        <div key={key++} style={{ margin: "12px 0", overflowX: "auto" }} dangerouslySetInnerHTML={{ __html: katex.renderToString(l.slice(2, -2).trim(), { throwOnError: false, displayMode: true }) }} />
      );
      return;
    }
    if (l.startsWith("$$")) {
      flushList();
      inMathBlock = true;
      mathLines = [l.slice(2).trim()];
      return;
    }
    if (l.startsWith("### ")) {
      flushList(); flushMath();
      els.push(<h4 key={key++} style={{ fontSize: 12, fontWeight: 600, color: "#c98ca7", margin: "14px 0 5px", fontFamily: "'Crimson Pro', Georgia, serif", fontStyle: "italic", letterSpacing: ".03em" }}>{l.slice(4)}</h4>);
      return;
    }
    if (l.startsWith("## ")) {
      flushList(); flushMath();
      els.push(
        <h3 key={key++} style={{ fontSize: 11.5, fontWeight: 700, color: "var(--accent)", margin: "22px 0 9px", letterSpacing: ".1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ display: "inline-block", width: 20, height: 2, background: "var(--accent)", opacity: 0.45, flexShrink: 0, borderRadius: 2 }} />
          {l.slice(3)}
        </h3>
      );
      return;
    }
    if (l.startsWith("# ")) {
      flushList(); flushMath();
      els.push(<h2 key={key++} style={{ fontSize: 18, fontWeight: 700, color: "#e8ddd6", margin: "18px 0 8px", fontFamily: "'Crimson Pro', Georgia, serif", letterSpacing: "-.2px", lineHeight: 1.3 }}>{l.slice(2)}</h2>);
      return;
    }
    if (l.startsWith("- ") || l.startsWith("* ") || l.startsWith("• ")) { listItems.push(l.slice(2)); return; }
    if (/^\d+\.\s/.test(l)) {
      flushList();
      flushMath();
      const num = l.match(/^\d+/)[0];
      const rest = l.replace(/^\d+\.\s/, "");
      els.push(
        <p key={key++} style={{ margin: "5px 0", color: "#a89890", display: "flex", gap: 9, lineHeight: 1.65 }}>
          <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0, minWidth: 18, fontSize: 13 }}>{num}.</span>
          <span dangerouslySetInnerHTML={{ __html: formatInline(rest) }} />
        </p>
      );
      return;
    }
    flushList(); flushMath();
    els.push(<p key={key++} style={{ margin: "4px 0", color: "#a89890", lineHeight: 1.65, fontSize: 13.5 }} dangerouslySetInnerHTML={{ __html: formatInline(l) }} />);
  });
  flushMath();
  flushList();
  return els;
}

// ═══════════════════════════════════════════════════════════════
// COPY TO CLIPBOARD HOOK
// ═══════════════════════════════════════════════════════════════

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);
  return [copied, copy];
}

// ═══════════════════════════════════════════════════════════════
// AUTO-GROW TEXTAREA
// ═══════════════════════════════════════════════════════════════

function AutoTextarea({ value, onChange, onKeyDown, placeholder, minRows = 2, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, minRows * 24 + 22) + "px";
  }, [value, minRows]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={minRows}
      style={{ ...style, resize: "none", overflow: "hidden" }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// WORD COUNT
// ═══════════════════════════════════════════════════════════════

function WordCount({ text, accent }) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  if (!chars) return null;
  return (
    <div style={{ textAlign: "right", fontSize: 10.5, color: "#6b5e58", marginTop: 5, fontFamily: "'DM Sans', sans-serif", letterSpacing: ".03em" }}>
      <span style={{ color: words > 0 ? accent : "#6b5e58" }}>{words}w</span>
      <span style={{ margin: "0 4px", opacity: 0.4 }}>·</span>
      {chars}c
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════

function ResponseBox({ text, accent, onRegenerate, loading, bn }) {
  const [copied, copy] = useCopy();
  if (!text) return (
    <div style={{
      marginTop: 24,
      border: `1px dashed ${accent}22`,
      borderRadius: 12,
      padding: "28px 24px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      opacity: loading ? 0.85 : 0.5,
    }}>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 20, height: 20, border: `2px solid ${accent}18`, borderTopColor: accent, borderRadius: "50%", animation: "spin .75s linear infinite" }} />
          <span style={{ color: "#6b5e58", fontSize: 11.5, fontFamily: "'DM Sans', sans-serif", letterSpacing: ".08em", textTransform: "uppercase" }}>Thinking…</span>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 22, opacity: 0.4 }}>✦</div>
          <div style={{ fontSize: 12.5, color: "#6b5e58", fontFamily: "'DM Sans', sans-serif", letterSpacing: ".02em" }}>
            {bn ? "আপনার উত্তর এখানে দেখাবে" : "Your response will appear here"}
          </div>
        </>
      )}
    </div>
  );

  const cssVars = { "--accent": accent, "--accent-dim": `${accent}25` };
  return (
    <div style={{ ...cssVars, marginTop: 24, animation: "fadeUp .4s ease" }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(46,43,42,.65) 0%, rgba(36,33,32,.75) 100%)",
        border: `1px solid ${accent}20`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: "0 12px 0 0",
        padding: "22px 24px 18px",
        fontSize: 13.5,
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        overflowX: "auto",
        boxShadow: `0 4px 32px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.03)`,
      }}>
        {renderMarkdown(text)}
      </div>
      {/* Action bar */}
      <div style={{
        display: "flex", gap: 8, alignItems: "center",
        background: `${accent}08`,
        border: `1px solid ${accent}18`,
        borderTop: "none",
        borderRadius: "0 0 12px 12px",
        padding: "9px 14px",
      }}>
        <span style={{ fontSize: 10.5, color: "#6b5e58", fontFamily: "'DM Sans', sans-serif", letterSpacing: ".03em", marginRight: "auto" }}>
          {text.length}c
        </span>
        <button onClick={() => copy(text)} style={actionBtn(accent)}>
          {copied ? "✓ Copied" : "⍘ Copy"}
        </button>
        {onRegenerate && (
          <button onClick={onRegenerate} disabled={loading} style={actionBtn(accent)}>
            ↺ Regenerate
          </button>
        )}
        <button onClick={() => window.print()} style={actionBtn(accent)}>🖨 Print</button>
      </div>
    </div>
  );
}

function actionBtn(accent) {
  return {
    padding: "5px 13px", border: `1px solid ${accent}28`, borderRadius: 7,
    background: "transparent", color: accent,
    fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, fontWeight: 600,
    cursor: "pointer", letterSpacing: ".04em",
    transition: "all .18s",
  };
}

function ProgressBar({ loading, color }) {
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
      background: "transparent", overflow: "hidden",
    }}>
      {loading && (
        <div style={{
          height: "100%",
          background: `linear-gradient(90deg, transparent, ${color}, ${color}aa, transparent)`,
          animation: "progressSweep 1.4s ease-in-out infinite",
        }} />
      )}
    </div>
  );
}

function Spinner({ color }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "24px 0", gap: 12 }}>
      <div style={{ width: 20, height: 20, border: `2px solid ${color}18`, borderTopColor: color, borderRadius: "50%", animation: "spin .75s linear infinite" }} />
      <span style={{ color: "#6b5e58", fontSize: 11.5, fontFamily: "'DM Sans', sans-serif", letterSpacing: ".08em", textTransform: "uppercase" }}>Thinking…</span>
    </div>
  );
}

function ErrorMsg({ message }) {
  if (!message) return null;
  return (
    <div style={{ marginTop: 14, padding: "11px 16px", background: "rgba(231,109,131,.06)", border: "1px solid rgba(231,109,131,.18)", borderRadius: 10, color: "#e76d83", fontSize: 13, display: "flex", gap: 10, alignItems: "flex-start", fontFamily: "'DM Sans', sans-serif" }}>
      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>⚠</span>
      <span style={{ lineHeight: 1.5 }}>{message}</span>
    </div>
  );
}

function Label({ children }) {
  return (
    <label style={{ display: "block", marginBottom: 8, fontSize: 10, fontWeight: 700, color: "#6b5e58", textTransform: "uppercase", letterSpacing: ".12em", fontFamily: "'DM Sans', sans-serif" }}>
      {children}
    </label>
  );
}

function Field({ children, style }) {
  return <div style={{ marginBottom: 20, ...style }}>{children}</div>;
}

function CardHeader({ icon, color, title, subtitle }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 28, paddingBottom: 22, borderBottom: "1px solid #3a3634" }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `linear-gradient(135deg, ${color}18, ${color}08)`,
        border: `1px solid ${color}28`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0,
        boxShadow: `0 2px 12px ${color}18`,
      }}>
        {icon}
      </div>
      <div style={{ paddingTop: 3 }}>
        <div style={{ fontWeight: 700, fontSize: 19, color: "#e8ddd6", marginBottom: 5, fontFamily: "'Crimson Pro', Georgia, serif", letterSpacing: "-.25px", lineHeight: 1.2 }}>
          {title}
        </div>
        <div style={{ fontSize: 12.5, color: "#a89890", lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif", maxWidth: 520 }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLE FACTORIES
// ═══════════════════════════════════════════════════════════════

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 9,
  border: "1px solid #3a3634", background: "#2e2b2a", color: "#e8ddd6",
  fontFamily: "'DM Sans', 'Segoe UI', sans-serif", fontSize: 14,
  outline: "none", boxSizing: "border-box",
  transition: "border-color .2s, box-shadow .2s", lineHeight: 1.5,
};

function chipStyle(active, color) {
  return {
    padding: "8px 15px",
    border: `1px solid ${active ? color : "#3a3634"}`,
    borderRadius: 8,
    background: active ? `${color}14` : "transparent",
    color: active ? color : "#6b5e58",
    cursor: "pointer",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    fontSize: 12.5, fontWeight: active ? 600 : 400,
    transition: "all .18s", letterSpacing: ".01em",
    boxShadow: active ? `0 0 0 1px ${color}22, 0 2px 8px ${color}14` : "none",
  };
}

function primaryBtn(color, glow) {
  return {
    padding: "12px 28px", border: "none", borderRadius: 9,
    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
    color: "#1c1917", fontWeight: 700, fontSize: 13,
    cursor: "pointer", fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    marginTop: 6,
    boxShadow: `0 4px 20px ${glow}, 0 1px 0 rgba(255,255,255,.1) inset`,
    transition: "all .2s", display: "inline-flex", alignItems: "center", gap: 8,
    letterSpacing: ".03em",
  };
}

// ═══════════════════════════════════════════════════════════════
// TAB PANELS
// ═══════════════════════════════════════════════════════════════

function TutorPanel({ bn }) {
  const [subject, setSubject] = useState("Physics");
  const [level, setLevel]     = useState("beginner");
  const [topic, setTopic]     = useState("");
  const [output, setOutput]   = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const lastArgs = useRef(null);

  const run = useCallback(async (args) => {
    const { sub, lvl, top } = args || lastArgs.current || { sub: subject, lvl: level, top: topic };
    if (!top.trim()) return;
    lastArgs.current = { sub, lvl, top };
    setLoading(true); setOutput(""); setError("");
    try {
      const sys = buildTutorPrompt(bn, sub, lvl);
      const msg = bn ? `বিষয়: ${sub}\nটপিক: ${top}` : `Subject: ${sub}\nTopic: ${top}`;
      setOutput(await callAPI(sys, msg));
    } catch (e) { setError(friendlyError(e.message)); }
    setLoading(false);
  }, [bn, subject, level, topic]);

  const handleRun = () => run({ sub: subject, lvl: level, top: topic });

  const levels = [
    ["beginner","🟢", bn ? "শিক্ষানবিস (শ্রেণী ৮-৯)" : "Beginner (Class 8-9)"],
    ["intermediate","🟡", bn ? "মধ্যবর্তী (শ্রেণী ১০)" : "Intermediate (Class 10)"],
    ["advanced","🔴", bn ? "উন্নত (SSC/HSC)" : "Advanced (SSC/HSC)"],
  ];

  return (
    <>
      <CardHeader icon="🎓" color="#9cc4b2"
        title={bn ? "অ্যাডাপটিভ টিউটর" : "Adaptive Tutor"}
        subtitle={bn ? "আপনার স্তর ও বিষয় অনুযায়ী ব্যক্তিগতকৃত পাঠ পান — NCTB পাঠ্যক্রম অনুযায়ী।" : "Get a personalised lesson adapted to your level and subject — aligned with the NCTB curriculum."} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <Field>
          <Label>{bn ? "বিষয়" : "Subject"}</Label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={subject} onChange={e => setSubject(e.target.value)}>
            {SUBJECTS.map(([en, b]) => <option key={en} value={en}>{bn ? b : en}</option>)}
          </select>
        </Field>
        <Field>
          <Label>{bn ? "শেখার স্তর" : "Learning Level"}</Label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={level} onChange={e => setLevel(e.target.value)}>
            {levels.map(([v,, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </Field>
      </div>
      <Field>
        <Label>{bn ? "টপিক বা প্রশ্ন লিখুন" : "Enter topic or question"}</Label>
        <AutoTextarea minRows={3} style={inputStyle} value={topic} onChange={e => setTopic(e.target.value)}
          onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleRun(); }}
          placeholder={bn ? "যেমন: নিউটনের দ্বিতীয় সূত্র, সালোকসংশ্লেষণ, দ্বিঘাত সমীকরণ..." : "e.g. Newton's Second Law, photosynthesis, quadratic equations..."} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setTopic(bn ? "নিউটনের দ্বিতীয় সূত্র ব্যাখ্যা করুন" : "Explain Newton's Second Law of Motion")} style={{ background: "none", border: "none", color: "#9cc4b2", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: "4px 0", opacity: 0.75 }}>{bn ? "উদাহরণ দেখুন" : "Try an example"}</button>
          <WordCount text={topic} accent="#9cc4b2" />
        </div>
      </Field>
      <button style={primaryBtn("#9cc4b2","rgba(156,196,178,.32)")} onClick={handleRun} disabled={loading || !topic.trim()}>
        🎓 {loading ? (bn ? "তৈরি হচ্ছে..." : "Generating…") : (bn ? "পাঠ তৈরি করুন" : "Generate Lesson")}
      </button>
      <ErrorMsg message={error} />
      <ResponseBox text={output} accent="#9cc4b2" onRegenerate={output ? () => run(lastArgs.current) : null} loading={loading} bn={bn} />
    </>
  );
}

function TeacherPanel({ bn }) {
  const [type, setType]       = useState("lesson");
  const [input, setInput]     = useState("");
  const [output, setOutput]   = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const lastInput = useRef("");

  const run = useCallback(async (txt) => {
    const t = txt !== undefined ? txt : lastInput.current;
    if (!t.trim()) return;
    lastInput.current = t;
    setLoading(true); setOutput(""); setError("");
    try { setOutput(await callAPI(buildTeacherPrompt(bn, type), t)); }
    catch (e) { setError(friendlyError(e.message)); }
    setLoading(false);
  }, [bn, type]);

  return (
    <>
      <CardHeader icon="👩‍🏫" color="#b5d4c8"
        title={bn ? "শিক্ষক সহকারী" : "Teacher Copilot"}
        subtitle={bn ? "পাঠ পরিকল্পনা, কুইজ, রুব্রিক, অভিভাবক পত্র — যা দরকার তৈরি করুন।" : "Generate lesson plans, quizzes, rubrics, parent emails and more — instantly."} />
      <Field>
        <Label>{bn ? "সহায়তার ধরন" : "Type of Support"}</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {TEACHER_TYPES.map(([v, ic, en, bnLabel]) => (
            <button key={v} onClick={() => setType(v)} className={type !== v ? "chip-inactive" : ""} style={chipStyle(type === v, "#b5d4c8")}>{ic} {bn ? bnLabel : en}</button>
          ))}
        </div>
      </Field>
      <Field>
        <Label>{bn ? "আপনার অনুরোধ" : "Describe what you need"}</Label>
        <AutoTextarea minRows={4} style={inputStyle} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(input); }}
          placeholder={bn ? "যেমন: ক্লাস ৯-এর জন্য নিউটনের সূত্রের উপর ৪৫ মিনিটের পাঠ পরিকল্পনা..." : "e.g. Create a 45-min lesson plan for Class 9 on Newton's Laws of Motion..."} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setInput(bn ? "ক্লাস ৯-এর জন্য নিউটনের সূত্রের উপর ৪৫ মিনিটের পাঠ পরিকল্পনা তৈরি করুন" : "Create a 45-min lesson plan for Class 9 on Newton's Laws of Motion")} style={{ background: "none", border: "none", color: "#b5d4c8", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: "4px 0", opacity: 0.75 }}>{bn ? "উদাহরণ দেখুন" : "Try an example"}</button>
          <WordCount text={input} accent="#b5d4c8" />
        </div>
      </Field>
      <button style={primaryBtn("#b5d4c8","rgba(181,212,200,.28)")} onClick={() => run(input)} disabled={loading || !input.trim()}>
        👩‍🏫 {loading ? (bn ? "তৈরি হচ্ছে..." : "Generating…") : (bn ? "তৈরি করুন" : "Generate")}
      </button>
      <ErrorMsg message={error} />
      <ResponseBox text={output} accent="#b5d4c8" onRegenerate={output ? () => run() : null} loading={loading} bn={bn} />
    </>
  );
}

function MultiPanel({ bn }) {
  const [mode, setMode]       = useState("en-bn");
  const [input, setInput]     = useState("");
  const [output, setOutput]   = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const lastInput = useRef("");

  const run = useCallback(async (txt) => {
    const t = txt !== undefined ? txt : lastInput.current;
    if (!t.trim()) return;
    lastInput.current = t;
    setLoading(true); setOutput(""); setError("");
    try { setOutput(await callAPI(buildMultiPrompt(mode), t)); }
    catch (e) { setError(friendlyError(e.message)); }
    setLoading(false);
  }, [mode]);

  return (
    <>
      <CardHeader icon="🌐" color="#c98ca7"
        title={bn ? "বহুভাষিক বিষয়বস্তু" : "Multilingual Content"}
        subtitle={bn ? "ইংরেজি ও বাংলার মধ্যে শিক্ষামূলক সামগ্রী অনুবাদ ও সরলীকরণ করুন।" : "Translate and simplify educational content between English and Bangla."} />
      <Field>
        <Label>{bn ? "রূপান্তরের ধরন" : "Conversion Mode"}</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {MULTI_MODES.map(([v, ic, en, bnLabel]) => (
            <button key={v} onClick={() => setMode(v)} className={mode !== v ? "chip-inactive" : ""} style={chipStyle(mode === v, "#c98ca7")}>{ic} {bn ? bnLabel : en}</button>
          ))}
        </div>
      </Field>
      <Field>
        <Label>{bn ? "টেক্সট লিখুন বা পেস্ট করুন" : "Paste or type educational content"}</Label>
        <AutoTextarea minRows={5} style={inputStyle} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(input); }}
          placeholder={bn ? "অনুবাদ বা সরলীকরণ করার জন্য শিক্ষামূলক সামগ্রী লিখুন..." : "Paste any textbook paragraph, concept, or educational text to translate or simplify..."} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setInput(bn ? "সালোকসংশ্লেষণ হলো এমন একটি প্রক্রিয়া যেখানে উদ্ভিদ সূর্যালোক ব্যবহার করে খাদ্য তৈরি করে।" : "Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce glucose and oxygen.")} style={{ background: "none", border: "none", color: "#c98ca7", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: "4px 0", opacity: 0.75 }}>{bn ? "উদাহরণ দেখুন" : "Try an example"}</button>
          <WordCount text={input} accent="#c98ca7" />
        </div>
      </Field>
      <button style={primaryBtn("#c98ca7","rgba(201,140,167,.28)")} onClick={() => run(input)} disabled={loading || !input.trim()}>
        🌐 {loading ? (bn ? "রূপান্তর হচ্ছে..." : "Converting…") : (bn ? "রূপান্তর করুন" : "Convert")}
      </button>
      <ErrorMsg message={error} />
      <ResponseBox text={output} accent="#c98ca7" onRegenerate={output ? () => run() : null} loading={loading} bn={bn} />
    </>
  );
}

function AnswerPanel({ bn }) {
  const [level, setLevel]       = useState("beginner");
  const [question, setQuestion] = useState("");
  const [output, setOutput]     = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const lastQ = useRef("");

  const run = useCallback(async (q) => {
    const t = q !== undefined ? q : lastQ.current;
    if (!t.trim()) return;
    lastQ.current = t;
    setLoading(true); setOutput(""); setError("");
    try { setOutput(await callAPI(buildAnswerPrompt(bn, level), t)); }
    catch (e) { setError(friendlyError(e.message)); }
    setLoading(false);
  }, [bn, level]);

  return (
    <>
      <CardHeader icon="💡" color="#d5bbb1"
        title={bn ? "উত্তর তৈরি করুন" : "Generate Answer"}
        subtitle={bn ? "যেকোনো প্রশ্নের কাঠামোগত উত্তর পান — পরীক্ষার উপযোগী ফরম্যাটে।" : "Get a structured, exam-ready answer with explanation, examples and key takeaways."} />
      <Field>
        <Label>{bn ? "উত্তরের গভীরতা" : "Answer Depth"}</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {ANSWER_LEVELS.map(([v, ic, en, bnLabel]) => (
            <button key={v} onClick={() => setLevel(v)} className={level !== v ? "chip-inactive" : ""} style={chipStyle(level === v, "#d5bbb1")}>{ic} {bn ? bnLabel : en}</button>
          ))}
        </div>
      </Field>
      <Field>
        <Label>{bn ? "আপনার প্রশ্ন" : "Your Question"}</Label>
        <AutoTextarea minRows={4} style={inputStyle} value={question} onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(question); }}
          placeholder={bn ? "যেকোনো বিষয়ের প্রশ্ন লিখুন..." : "e.g. What is the difference between evaporation and condensation? Explain Newton's Third Law."} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setQuestion(bn ? "বাষ্পীভবন ও ঘনীভবনের মধ্যে পার্থক্য কী?" : "What is the difference between evaporation and condensation?")} style={{ background: "none", border: "none", color: "#d5bbb1", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: "4px 0", opacity: 0.75 }}>{bn ? "উদাহরণ দেখুন" : "Try an example"}</button>
          <WordCount text={question} accent="#d5bbb1" />
        </div>
      </Field>
      <button style={primaryBtn("#d5bbb1","rgba(213,187,177,.28)")} onClick={() => run(question)} disabled={loading || !question.trim()}>
        💡 {loading ? (bn ? "তৈরি হচ্ছে..." : "Generating…") : (bn ? "উত্তর তৈরি করুন" : "Generate Answer")}
      </button>
      <ErrorMsg message={error} />
      <ResponseBox text={output} accent="#d5bbb1" onRegenerate={output ? () => run() : null} loading={loading} bn={bn} />
    </>
  );
}

function QuestionsPanel({ bn }) {
  const [qType, setQType]     = useState("mixed");
  const [count, setCount]     = useState("5");
  const [topic, setTopic]     = useState("");
  const [output, setOutput]   = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const lastArgs = useRef(null);

  const run = useCallback(async (args) => {
    const { qt, cnt, top } = args || lastArgs.current || { qt: qType, cnt: count, top: topic };
    if (!top.trim()) return;
    lastArgs.current = { qt, cnt, top };
    setLoading(true); setOutput(""); setError("");
    try {
      const sys = buildQuestionsPrompt(bn, qt, cnt);
      const msg = bn ? `টপিক: ${top}, প্রশ্নের সংখ্যা: ${cnt}` : `Topic: ${top}, Count: ${cnt}`;
      setOutput(await callAPI(sys, msg));
    } catch (e) { setError(friendlyError(e.message)); }
    setLoading(false);
  }, [bn, qType, count, topic]);

  return (
    <>
      <CardHeader icon="❓" color="#e76d83"
        title={bn ? "প্রশ্ন সাজেস্ট করুন" : "Suggest Questions"}
        subtitle={bn ? "যেকোনো টপিকের জন্য NCTB-সামঞ্জস্যপূর্ণ অনুশীলন প্রশ্ন তৈরি করুন।" : "Generate NCTB-aligned practice questions at mixed difficulty levels for any topic or chapter."} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <Field>
          <Label>{bn ? "প্রশ্নের ধরন" : "Question Type"}</Label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={qType} onChange={e => setQType(e.target.value)}>
            {QUESTION_TYPES.map(([v, en, bnLabel]) => <option key={v} value={v}>{bn ? bnLabel : en}</option>)}
          </select>
        </Field>
        <Field>
          <Label>{bn ? "প্রশ্নের সংখ্যা" : "Number of Questions"}</Label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={count} onChange={e => setCount(e.target.value)}>
            {["3","5","8","10"].map(n => <option key={n} value={n}>{n} {bn ? "টি প্রশ্ন" : "Questions"}</option>)}
          </select>
        </Field>
      </div>
      <Field>
        <Label>{bn ? "টপিক বা অধ্যায়" : "Topic or Chapter"}</Label>
        <AutoTextarea minRows={2} style={inputStyle} value={topic} onChange={e => setTopic(e.target.value)}
          onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run({ qt: qType, cnt: count, top: topic }); }}
          placeholder={bn ? "যেমন: আলোর প্রতিফলন, রাসায়নিক বন্ধন, বাংলাদেশের মুক্তিযুদ্ধ..." : "e.g. Laws of Thermodynamics, Chemical Bonding, Liberation War of Bangladesh..."} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setTopic(bn ? "রাসায়নিক বন্ধন" : "Chemical Bonding")} style={{ background: "none", border: "none", color: "#e76d83", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: "4px 0", opacity: 0.75 }}>{bn ? "উদাহরণ দেখুন" : "Try an example"}</button>
          <WordCount text={topic} accent="#e76d83" />
        </div>
      </Field>
      <button style={primaryBtn("#e76d83","rgba(231,109,131,.28)")} onClick={() => run({ qt: qType, cnt: count, top: topic })} disabled={loading || !topic.trim()}>
        ❓ {loading ? (bn ? "তৈরি হচ্ছে..." : "Generating…") : (bn ? "প্রশ্ন তৈরি করুন" : "Generate Questions")}
      </button>
      <ErrorMsg message={error} />
      <ResponseBox text={output} accent="#e76d83" onRegenerate={output ? () => run(lastArgs.current) : null} loading={loading} bn={bn} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════

export default function App() {
  const [lang, setLang] = useState(() => loadPref("lamina_lang", "en"));
  const [tab,  setTab]  = useState(() => loadPref("lamina_tab", "tutor"));
  const [globalLoading, setGlobalLoading] = useState(false);
  const bn = lang === "bn";

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

  const panelMap = {
    tutor:     <TutorPanel     bn={bn} />,
    teacher:   <TeacherPanel   bn={bn} />,
    multi:     <MultiPanel     bn={bn} />,
    answer:    <AnswerPanel    bn={bn} />,
    questions: <QuestionsPanel bn={bn} />,
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
      <header style={{
        background: "rgba(28,25,23,.92)",
        borderBottom: "1px solid #2e2b2a",
        padding: "0 20px",
        position: "sticky", top: 0, zIndex: 50,
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        overflow: "hidden",
      }}>
        {/* Page-level progress bar */}
        <ProgressBar loading={globalLoading} color={activeTab?.color || "#9cc4b2"} />

        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          {/* Logo row */}
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

            {/* Language toggle */}
            <div className="lang-toggle" style={{ display: "flex", gap: 2, background: "#2e2b2a", borderRadius: 8, padding: "3px", border: "1px solid #3a3634" }}>
              {[["en","🇬🇧 EN"],["bn","🇧🇩 বাং"]].map(([l, label]) => (
                <button key={l} onClick={() => handleSetLang(l)} style={{
                  padding: "5px 14px", borderRadius: 6, border: "none",
                  background: lang === l ? `linear-gradient(135deg, ${activeTab?.color || "#9cc4b2"}, ${activeTab?.color || "#9cc4b2"}bb)` : "transparent",
                  color: lang === l ? "#1c1917" : "#6b5e58",
                  fontWeight: 700, fontSize: 11, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: lang === l ? `0 2px 8px ${activeTab?.color || "#9cc4b2"}28` : "none",
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab bar — icon-only on narrow, full label when wide */}
          <nav style={{ display: "flex", gap: 0, overflowX: "auto", marginTop: 6 }}>
            {TABS.map(t => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => handleSetTab(t.id)}
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
                </button>
              );
            })}
          </nav>
        </div>

        {/* Responsive tab labels */}
        <style>{`
          @media (max-width: 520px) {
            .tab-label { display: none; }
            button[title] { padding: 10px 13px; }
          }
        `}</style>
      </header>

      {/* ── MAIN ── */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "0 20px 60px" }}>
        <div style={{ marginTop: 28 }}>
          <div style={{ height: 3, background: `linear-gradient(90deg, ${activeTab?.color}, ${activeTab?.color}20, transparent)`, borderRadius: "3px 3px 0 0", transition: "background 0.3s ease" }} />
          <div style={{
            background: "#242120", border: "1px solid #3a3634", borderTop: "none",
            borderRadius: "0 0 16px 16px", padding: "28px 28px 32px",
            boxShadow: "0 8px 40px rgba(0,0,0,.35)",
          }}>
            {panelMap[tab]}
          </div>
        </div>

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
