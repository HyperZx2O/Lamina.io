#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Build Study Packs from the NCTB curriculum.
 *
 * Reads every chapter file under data/nctb-curriculum/ and writes a
 * matching "pack" under data/study-packs/. A pack adds:
 *   - a stable id (slug of class+subject+chapter)
 *   - a question bank (5-10 MCQ + 2-3 short-answer) per chapter
 *   - a derived lesson summary (broken into key-idea flashcards)
 *   - a version number + sha256 hash for cache-busting
 *
 * If CLAUDE_KEY is set in the environment, the script will call Claude
 * to generate richer question banks. Without it, the script falls back
 * to a deterministic, template-based generator that produces a valid
 * (if less nuanced) bank from the chapter text. This way the build
 * never silently fails — packs are always produced.
 *
 * Usage:
 *   node scripts/build-study-packs.cjs                # build everything
 *   node scripts/build-study-packs.cjs --offline      # force template mode
 *   node scripts/build-study-packs.cjs --class=6      # build class 6 only
 *   node scripts/build-study-packs.cjs --subject=science
 *   node scripts/build-study-packs.cjs --dry-run      # don't write files
 *
 * Exits 0 on success, 1 on any per-chapter failure (continues past
 * individual chapter errors so one bad chapter doesn't kill the build).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const CURRICULUM_DIR = path.join(ROOT, 'data', 'nctb-curriculum');
const PACKS_DIR = path.join(ROOT, 'data', 'study-packs');

// ── argv parsing ──────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const FLAGS = {
  offline: argv.includes('--offline'),
  dryRun: argv.includes('--dry-run'),
  classFilter: (() => {
    const m = argv.find((a) => a.startsWith('--class='));
    return m ? m.split('=')[1] : null;
  })(),
  subjectFilter: (() => {
    const m = argv.find((a) => a.startsWith('--subject='));
    return m ? m.split('=')[1] : null;
  })(),
};

const USE_CLAUDE =
  !FLAGS.offline && !!process.env.CLAUDE_KEY && process.env.CLAUDE_KEY.length > 10;

console.log('[build-study-packs] starting');
console.log(`  mode: ${USE_CLAUDE ? 'claude-enhanced' : 'template-only'}`);
if (FLAGS.classFilter) console.log(`  class filter: ${FLAGS.classFilter}`);
if (FLAGS.subjectFilter) console.log(`  subject filter: ${FLAGS.subjectFilter}`);
if (FLAGS.dryRun) console.log('  dry run — no files will be written');

// ── helpers ───────────────────────────────────────────────────────────
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function stablePackId(chapter) {
  // class-6-science-01
  return [
    slugify(chapter.classLabel || chapter.class || ''),
    slugify(chapter.subject || ''),
    String(chapter.chapter).padStart(2, '0'),
  ].join('-');
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

// ── walk curriculum tree ──────────────────────────────────────────────
function findChapterFiles() {
  if (!fs.existsSync(CURRICULUM_DIR)) {
    console.error(`[build-study-packs] missing: ${CURRICULUM_DIR}`);
    return [];
  }
  const out = [];
  const stack = [CURRICULUM_DIR];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      console.warn(`  readdir failed: ${dir}: ${err.message}`);
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.json') &&
        entry.name !== 'index.json' // skip the curriculum root manifest
      ) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

function readChapter(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    console.warn(`  bad chapter json: ${file}: ${err.message}`);
    return null;
  }
}

// ── template-based question generator (offline fallback) ─────────────
/**
 * Heuristic, no-LLM generator. Pulls a few sentences from each section
 * and turns them into a 5-MCQ bank with one correct answer (a
 * highlighted noun phrase) and three plausible distractors taken from
 * the rest of the chapter. Good enough for a demo; the Claude path
 * produces richer banks.
 */
function templateBank(chapter) {
  const questions = [];
  const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
  const allTerms = (chapter.keyTerms || []).filter(Boolean);

  sections.forEach((sec, sIdx) => {
    if (sIdx >= 3) return; // top 3 sections → 1 question each
    if (!sec.content) return;
    // Split into sentences, keep the first declarative one.
    const sentences = sec.content
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.length > 30 && s.length < 200);
    if (!sentences.length) return;
    const stem = sentences[0];
    // Pick a non-trivial word (length ≥ 5) as the "answer" — easy to
    // recognise, easy to swap with a distractor.
    const words = stem.split(/\s+/);
    const candidate = words.find((w) => /^[A-Za-z][A-Za-z-]{4,}$/.test(w)) || words[0];
    const distractors = allTerms
      .filter((t) => t && t.toLowerCase() !== candidate.toLowerCase())
      .slice(0, 3);
    while (distractors.length < 3) {
      distractors.push(['measurement', 'organism', 'experiment', 'energy'][distractors.length]);
    }
    const options = [candidate, ...distractors].slice(0, 4);
    // Shuffle deterministically by index so the same chapter always
    // produces the same order across runs.
    const seed = (sIdx * 7 + 3) % 4;
    const ordered = [...options.slice(seed), ...options.slice(0, seed)];
    const correctIndex = ordered.indexOf(candidate);
    questions.push({
      id: `q-${sIdx + 1}`,
      kind: 'mcq',
      section: sec.id || String(sIdx + 1),
      prompt: `In "${sec.title || 'this section'}", which statement is correct?`,
      options: ordered,
      correctIndex,
      explanation: stem,
    });
  });

  // Always emit exactly 5 questions (pad with recap-style if needed).
  while (questions.length < 5) {
    questions.push({
      id: `q-${questions.length + 1}`,
      kind: 'mcq',
      section: 'recap',
      prompt: `Which is the most important idea from "${chapter.title}"?`,
      options: [
        chapter.summary || 'Recap of key concepts',
        'A historical anecdote',
        'A laboratory safety rule',
        'An unrelated fact',
      ],
      correctIndex: 0,
      explanation: chapter.summary || '',
    });
  }

  // Add 2 short-answer prompts based on key terms.
  const shortAnswer = (chapter.keyTerms || []).slice(0, 2).map((term, i) => ({
    id: `sa-${i + 1}`,
    kind: 'short',
    section: 'recap',
    prompt: `In one sentence, define "${term}" as used in "${chapter.title}".`,
    sampleAnswer: `A term central to the chapter: ${term}.`,
  }));

  return [...questions, ...shortAnswer];
}

// ── flashcards (lesson recap) ─────────────────────────────────────────
function buildFlashcards(chapter) {
  const out = [];
  const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
  sections.slice(0, 6).forEach((sec) => {
    if (!sec.content) return;
    const first = sec.content.split(/(?<=[.!?])\s+/)[0] || sec.content;
    out.push({
      id: `flash-${sec.id}`,
      title: sec.title || sec.id,
      body: first,
    });
  });
  return out;
}

// ── claude call (best-effort) ─────────────────────────────────────────
async function callClaudeForBank(chapter) {
  if (!USE_CLAUDE) return null;
  const apiKey = process.env.CLAUDE_KEY;
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

  const systemPrompt = `You generate quiz banks for a Bangladeshi middle-school learning app. Output strict JSON only — no prose, no markdown fences. The schema is:
{
  "questions": [
    { "id": "q-1", "kind": "mcq", "section": "1.1", "prompt": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "..." },
    { "id": "sa-1", "kind": "short", "section": "1.1", "prompt": "...", "sampleAnswer": "..." }
  ]
}
Emit exactly 6 mcq and 2 short. Make distractors plausible but clearly wrong. Match the bilingual context — prompts in English, but feel free to use Bangla where it would help.`;

  const userPrompt = `Chapter: ${chapter.title} (${chapter.titleBn || ''})
Class: ${chapter.classLabel || chapter.class}
Subject: ${chapter.subjectLabel || chapter.subject}
Summary: ${chapter.summary || ''}
Sections:
${(chapter.sections || [])
    .map((s) => `  ${s.id} ${s.title}: ${s.content}`)
    .join('\n')}
Key terms: ${(chapter.keyTerms || []).join(', ')}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!res.ok) {
      console.warn(`  claude ${res.status} for ${chapter.title}`);
      return null;
    }
    const json = await res.json();
    const text = json?.content?.[0]?.text || '';
    // Strip ```json fences if Claude wrapped it anyway.
    const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed.questions)) return null;
    return parsed.questions;
  } catch (err) {
    console.warn(`  claude call failed for ${chapter.title}: ${err.message}`);
    return null;
  }
}

// ── main per-chapter builder ──────────────────────────────────────────
async function buildPackForChapter(chapter) {
  const id = stablePackId(chapter);
  const questions = USE_CLAUDE
    ? (await callClaudeForBank(chapter)) || templateBank(chapter)
    : templateBank(chapter);
  const flashcards = buildFlashcards(chapter);

  const body = JSON.stringify({ id, questions, flashcards, chapter });
  const pack = {
    id,
    class: chapter.class,
    classLabel: chapter.classLabel,
    subject: chapter.subject,
    subjectLabel: chapter.subjectLabel,
    chapter: chapter.chapter,
    title: chapter.title,
    titleBn: chapter.titleBn,
    summary: chapter.summary,
    sections: chapter.sections || [],
    keyTerms: chapter.keyTerms || [],
    flashcards,
    questions,
    version: 1,
    sizeBytes: Buffer.byteLength(body, 'utf-8'),
    sourceHash: sha256(body),
    generatedAt: new Date().toISOString(),
    generator: USE_CLAUDE ? 'claude' : 'template',
  };
  return pack;
}

async function main() {
  if (!FLAGS.dryRun) ensureDir(PACKS_DIR);
  const files = findChapterFiles();
  if (!files.length) {
    console.error('[build-study-packs] no chapter files found');
    process.exit(1);
  }
  console.log(`  found ${files.length} chapter file(s)`);

  let built = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const chapter = readChapter(file);
    if (!chapter) {
      failed += 1;
      continue;
    }
    if (FLAGS.classFilter && String(chapter.classLabel) !== FLAGS.classFilter) {
      skipped += 1;
      continue;
    }
    if (
      FLAGS.subjectFilter &&
      slugify(chapter.subject) !== slugify(FLAGS.subjectFilter)
    ) {
      skipped += 1;
      continue;
    }

    try {
      const pack = await buildPackForChapter(chapter);
      const outDir = path.join(PACKS_DIR, `class-${pack.classLabel}`, pack.subject);
      const outPath = path.join(outDir, `${pack.id}.json`);
      if (!FLAGS.dryRun) {
        ensureDir(outDir);
        fs.writeFileSync(outPath, JSON.stringify(pack, null, 2), 'utf-8');
      }
      built += 1;
      if (built <= 3 || built % 10 === 0) {
        console.log(`  built ${pack.id}  (${pack.questions.length} questions)`);
      }
    } catch (err) {
      failed += 1;
      console.warn(`  failed ${file}: ${err.message}`);
    }
  }

  console.log(
    `[build-study-packs] done — built:${built} skipped:${skipped} failed:${failed}`
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('[build-study-packs] fatal:', err);
  process.exit(1);
});
