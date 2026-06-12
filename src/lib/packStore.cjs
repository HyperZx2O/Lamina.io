// src/lib/packStore.cjs
//
// Server-side study-pack storage. Packs are JSON files on disk under
// data/study-packs/<class>/<subject>/<packId>.json, written by the
// `scripts/build-study-packs.cjs` build script. Student attempts sync
// into data/progress/<userId>.json (one file per user, keyed by anonymous
// fingerprint or future auth id).
//
// This module is deliberately side-effect-light: it only reads/writes
// files and returns plain JSON-friendly data. The HTTP layer in
// server.js handles validation, error responses, and rate limiting.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const PACKS_DIR = path.join(DATA_DIR, 'study-packs');
const PROGRESS_DIR = path.join(DATA_DIR, 'progress');

// ── helpers ──────────────────────────────────────────────────────────

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[packStore] failed to read ${filePath}:`, err.message);
    return null;
  }
}

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (_) {
    /* mkdir -p is best-effort */
  }
}

function safeUserId(input) {
  // Normalise the userId so it can safely become a filename.
  if (typeof input !== 'string') return 'anon';
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 64);
  return cleaned || 'anon';
}

// Walk the packs tree and return every pack file path, recursively.
function walkPackFiles(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const out = [];
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        out.push(full);
      }
    }
  }
  return out;
}

// ── pack reads ───────────────────────────────────────────────────────

/**
 * List all pack manifests. Each manifest is trimmed to the metadata
 * needed by the catalogue UI (no full questions/lessons). If a pack
 * file is corrupt it's skipped with a warning.
 *
 * @returns {Array<{
 *   id: string,
 *   class: string,
 *   classLabel?: string,
 *   subject: string,
 *   subjectLabel?: string,
 *   chapter?: string|number,
 *   title: string,
 *   titleBn?: string,
 *   questionCount: number,
 *   lessonSections: number,
 *   version: number,
 *   sizeBytes: number
 * }>}
 */
function listPacksMeta() {
  const files = walkPackFiles(PACKS_DIR);
  const out = [];
  for (const file of files) {
    const stat = (() => {
      try {
        return fs.statSync(file);
      } catch (_) {
        return { size: 0 };
      }
    })();
    const pack = safeReadJson(file);
    if (!pack || !pack.id) continue;
    out.push({
      id: String(pack.id),
      class: pack.class || path.basename(path.dirname(path.dirname(file))),
      classLabel: pack.classLabel,
      subject: pack.subject || path.basename(path.dirname(file)),
      subjectLabel: pack.subjectLabel,
      chapter: pack.chapter,
      title: pack.title || pack.titleBn || pack.id,
      titleBn: pack.titleBn,
      questionCount: Array.isArray(pack.questions) ? pack.questions.length : 0,
      lessonSections: Array.isArray(pack.lesson)
        ? pack.lesson.length
        : Array.isArray(pack.sections)
        ? pack.sections.length
        : 0,
      version: Number(pack.version) || 1,
      sizeBytes: stat.size,
    });
  }
  // Newest first, falling back to alphabetical
  out.sort((a, b) => String(b.id).localeCompare(String(a.id)));
  return out;
}

/**
 * Return the full pack JSON for a given id, or null if not found.
 * Looks up by exact id match across all pack files.
 */
function getPackById(id) {
  if (!id || typeof id !== 'string') return null;
  const files = walkPackFiles(PACKS_DIR);
  for (const file of files) {
    const pack = safeReadJson(file);
    if (pack && String(pack.id) === id) return pack;
  }
  return null;
}

// ── progress (synced attempts) ───────────────────────────────────────

function progressFilePath(userId) {
  return path.join(PROGRESS_DIR, `${safeUserId(userId)}.json`);
}

function readAttempts(userId) {
  const data = safeReadJson(progressFilePath(userId));
  if (!data) return [];
  return Array.isArray(data.attempts) ? data.attempts : [];
}

/**
 * Persist a batch of attempts for a user. Each attempt is normalised:
 *   { id, packId, questionId, correct, timeMs?, createdAt }
 *
 * We deduplicate by `id` so re-syncing an already-stored attempt is a
 * no-op. Returns the ids that were actually newly accepted.
 */
function saveAttempt(userId, attempt) {
  if (!attempt || typeof attempt !== 'object') {
    return { ok: false, error: 'attempt must be an object' };
  }
  const id = String(attempt.id || '');
  if (!id) return { ok: false, error: 'attempt.id is required' };
  if (!attempt.packId) return { ok: false, error: 'attempt.packId is required' };

  const normalised = {
    id,
    packId: String(attempt.packId),
    questionId: String(attempt.questionId || ''),
    correct: !!attempt.correct,
    timeMs: Number.isFinite(attempt.timeMs) ? attempt.timeMs : null,
    createdAt: attempt.createdAt || new Date().toISOString(),
  };

  ensureDir(PROGRESS_DIR);
  const file = progressFilePath(userId);
  const existing = safeReadJson(file) || { userId, attempts: [] };
  const list = Array.isArray(existing.attempts) ? existing.attempts : [];
  if (list.some((a) => a && a.id === normalised.id)) {
    return { ok: true, id, alreadySynced: true };
  }
  list.push(normalised);
  // Keep a soft cap so a single user's file doesn't grow unbounded
  // for the demo; the offline store keeps the canonical history.
  const MAX_ATTEMPTS = 5000;
  const trimmed = list.length > MAX_ATTEMPTS ? list.slice(-MAX_ATTEMPTS) : list;
  existing.userId = userId;
  existing.attempts = trimmed;
  existing.updatedAt = new Date().toISOString();

  try {
    // Write to a temp file first, then rename, to avoid partial writes
    // if the process dies mid-flush.
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(existing, null, 2), 'utf-8');
    fs.renameSync(tmp, file);
    return { ok: true, id, alreadySynced: false };
  } catch (err) {
    console.error('[packStore] saveAttempt failed:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Aggregate per-user stats: total attempts, accuracy, unique packs,
 * a per-day streak, and the most-recent activity timestamp.
 */
function summaryStats(userId) {
  const attempts = readAttempts(userId);
  if (!attempts.length) {
    return {
      totalAttempts: 0,
      correctAttempts: 0,
      accuracy: 0,
      uniquePacks: 0,
      streakDays: 0,
      lastActiveAt: null,
    };
  }
  const correct = attempts.filter((a) => a && a.correct).length;
  const packIds = new Set(attempts.map((a) => a && a.packId).filter(Boolean));

  // Streak = consecutive days (going back from today) with at least
  // one attempt. Uses Asia/Dhaka (+06:00) as the reference timezone so
  // Bangladeshi students get a sensible "day" boundary.
  const dayKey = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    // Shift by +6h so any attempt between midnight and 6am BST
    // counts as the previous day, which feels more natural for kids.
    const shifted = new Date(d.getTime() + 6 * 60 * 60 * 1000);
    return shifted.toISOString().slice(0, 10);
  };

  const daySet = new Set();
  for (const a of attempts) {
    const k = dayKey(a.createdAt);
    if (k) daySet.add(k);
  }

  let streak = 0;
  const cursor = new Date(Date.now() + 6 * 60 * 60 * 1000);
  for (;;) {
    const k = cursor.toISOString().slice(0, 10);
    if (daySet.has(k)) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else {
      // Allow the first day of the streak to be "yesterday" so a user
      // who hasn't studied yet today still sees an active streak.
      if (streak === 0) {
        cursor.setUTCDate(cursor.getUTCDate() - 1);
        const k2 = cursor.toISOString().slice(0, 10);
        if (daySet.has(k2)) {
          streak += 1;
          cursor.setUTCDate(cursor.getUTCDate() - 1);
          continue;
        }
      }
      break;
    }
  }

  const last = attempts
    .map((a) => a.createdAt)
    .filter(Boolean)
    .sort()
    .pop();

  return {
    totalAttempts: attempts.length,
    correctAttempts: correct,
    accuracy: attempts.length ? correct / attempts.length : 0,
    uniquePacks: packIds.size,
    streakDays: streak,
    lastActiveAt: last || null,
  };
}

module.exports = {
  PACKS_DIR,
  PROGRESS_DIR,
  listPacksMeta,
  getPackById,
  readAttempts,
  saveAttempt,
  summaryStats,
};
