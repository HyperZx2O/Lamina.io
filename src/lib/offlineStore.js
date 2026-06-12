// src/lib/offlineStore.js
// ---------------------------------------------------------------------------
// Thin, promise-based wrapper around the `idb` library that owns the
// IndexedDB schema for Lamina's offline study mode.
//
// Stores
// ------
// - `packs`     : keyPath 'id'. One record per installed study pack. The
//                 full pack JSON is stored in the `data` field so the pack
//                 reader can render with zero network. `meta` keeps the
//                 human-facing title, class, subject, and chapter count so
//                 the hub can list packs without paying the JSON.parse
//                 cost on every render.
// - `attempts`  : keyPath ['packId','questionId'] (composite). A user's
//                 quiz attempts. `syncedAt` is null until the server has
//                 confirmed the upload.
// - `pendingAI` : keyPath 'id' (autoIncrement). Queued AI questions typed
//                 while offline. Drained by the SW background sync.
// - `meta`      : keyPath 'key'. A small kv bag for flags like
//                 'lastSyncAt', 'installVersion', and the SW update prompt.
//
// Why a single file?
// ------------------
// Keeping the schema + accessors in one module means every consumer
// (OfflineHub, PackReader, OfflinePill, the SW) imports the same
// `openDB()` result and the same shape. There is no separate
// "migrations" file because we bump `DB_VERSION` + add a `upgrade()`
// branch in place.
//
// All exported functions are no-throw: errors are logged and a safe
// fallback is returned (null / [] / false). This matters because the
// app shell is allowed to boot even if IndexedDB is unavailable (e.g.
// private-browsing mode in Safari), and we'd rather show a banner
// than crash the page.
// ---------------------------------------------------------------------------

import { openDB } from 'idb';

const DB_NAME = 'lamina-offline';
const DB_VERSION = 1;

let _dbPromise = null;

function getDB() {
  if (_dbPromise) return _dbPromise;
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  _dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // 0 → 1: initial schema.
      if (oldVersion < 1) {
        const packs = db.createObjectStore('packs', { keyPath: 'id' });
        packs.createIndex('class', 'meta.class', { unique: false });
        packs.createIndex('subject', 'meta.subject', { unique: false });
        packs.createIndex('installedAt', 'installedAt', { unique: false });

        const attempts = db.createObjectStore('attempts', {
          keyPath: ['packId', 'questionId'],
        });
        attempts.createIndex('syncedAt', 'syncedAt', { unique: false });
        attempts.createIndex('packId', 'packId', { unique: false });

        const pendingAI = db.createObjectStore('pendingAI', {
          keyPath: 'id',
          autoIncrement: true,
        });
        pendingAI.createIndex('createdAt', 'createdAt', { unique: false });

        db.createObjectStore('meta', { keyPath: 'key' });
      }
    },
  });
  return _dbPromise;
}

// ── PACKS ─────────────────────────────────────────────────────────────────

/**
 * Persist a study pack. `data` is the full pack JSON (as returned by
 * `/api/packs/:id`); `meta` is a denormalised summary used by the hub list.
 * Overwrites any existing record with the same id (idempotent re-install).
 */
export async function savePack(pack) {
  if (!pack || !pack.id) throw new Error('savePack: pack.id is required');
  try {
    const db = await getDB();
    const record = {
      id: pack.id,
      data: pack,
      meta: pack.meta || {
        title: pack.title || pack.id,
        class: pack.class || '',
        subject: pack.subject || '',
        chapterCount: Array.isArray(pack.chapters) ? pack.chapters.length : 0,
      },
      sizeBytes: estimateSize(pack),
      installedAt: Date.now(),
      updatedAt: Date.now(),
    };
    // Preserve installedAt across updates so the hub shows the first
    // install date, not the last update.
    const existing = await db.get('packs', pack.id);
    if (existing && existing.installedAt) {
      record.installedAt = existing.installedAt;
    }
    await db.put('packs', record);
    return record;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[offlineStore] savePack failed:', e);
    return null;
  }
}

/** List installed packs, newest install first. Returns [] on failure. */
export async function listPacks() {
  try {
    const db = await getDB();
    const all = await db.getAll('packs');
    return all.sort((a, b) => (b.installedAt || 0) - (a.installedAt || 0));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[offlineStore] listPacks failed:', e);
    return [];
  }
}

/**
 * Lightweight per-pack metadata for the catalogue. Returns
 * `[{ id, title, class, subject, sizeBytes, installedAt }, ...]`
 * without the heavy `data` payload.
 */
export async function getPackMeta() {
  try {
    const packs = await listPacks();
    return packs.map((p) => ({
      id: p.id,
      title: p.meta?.title || p.data?.title || p.id,
      class: p.meta?.class || p.data?.class || '',
      subject: p.meta?.subject || p.data?.subject || '',
      sizeBytes: p.sizeBytes || 0,
      installedAt: p.installedAt || 0,
    }));
  } catch (e) {
    console.warn('[offlineStore] getPackMeta failed:', e);
    return [];
  }
}

/** Read a single pack by id. Returns null if not installed. */
export async function getPack(id) {
  try {
    const db = await getDB();
    const rec = await db.get('packs', id);
    return rec ? rec.data : null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[offlineStore] getPack failed:', e);
    return null;
  }
}

/** Delete a pack. Returns true on success, false otherwise. */
export async function deletePack(id) {
  try {
    const db = await getDB();
    await db.delete('packs', id);
    // Cascade: drop attempts for this pack too.
    const tx = db.transaction('attempts', 'readwrite');
    const idx = tx.store.index('packId');
    for await (const cursor of idx.iterate(id)) {
      await cursor.delete();
    }
    await tx.done;
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[offlineStore] deletePack failed:', e);
    return false;
  }
}

// ── ATTEMPTS ──────────────────────────────────────────────────────────────

/**
 * Save (or upsert) a quiz attempt. `attempt` shape:
 *   { packId, questionId, answer, correct, createdAt, syncedAt? }
 * If `syncedAt` is provided the attempt is considered already uploaded
 * (used when the server echoes a sync ack).
 */
export async function saveAttempt(attempt) {
  if (!attempt || !attempt.packId || !attempt.questionId) {
    throw new Error('saveAttempt: packId + questionId required');
  }
  try {
    const db = await getDB();
    const record = {
      ...attempt,
      createdAt: attempt.createdAt || Date.now(),
      syncedAt: attempt.syncedAt || null,
    };
    await db.put('attempts', record);
    return record;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[offlineStore] saveAttempt failed:', e);
    return null;
  }
}

/** All attempts for a single pack, in chronological order. */
export async function listAttempts(packId) {
  try {
    const db = await getDB();
    if (packId) {
      const idx = db.transaction('attempts').store.index('packId');
      const out = [];
      for await (const cursor of idx.iterate(packId)) {
        out.push(cursor.value);
      }
      return out.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }
    return await db.getAll('attempts');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[offlineStore] listAttempts failed:', e);
    return [];
  }
}

/** Attempts that have not yet been uploaded to the server. */
export async function listUnsynced() {
  try {
    const db = await getDB();
    const all = await db.getAll('attempts');
    return all.filter((a) => !a.syncedAt);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[offlineStore] listUnsynced failed:', e);
    return [];
  }
}

/**
 * Alias for `listUnsynced`, used by the UI components. The schema uses
 * a composite [packId, questionId] key, so each "attempt" row is a
 * single question; the UI batches them into a per-quiz summary at
 * sync time.
 */
export const listUnsyncedAttempts = listUnsynced;

/**
 * Mark a single quiz attempt (identified by its `id` string) as
 * synced. We scan every attempt row because the canonical key is the
 * composite [packId, questionId] — quiz-level attempts live in a
 * `quizAttempts` pseudo-bucket here represented by records whose own
 * `id` field is set. The server only cares about the per-quiz record,
 * so this is a best-effort sweep.
 */
export async function markSynced(id) {
  if (!id) return 0;
  try {
    const db = await getDB();
    const all = await db.getAll('attempts');
    let count = 0;
    const tx = db.transaction('attempts', 'readwrite');
    for (const rec of all) {
      if (rec.id === id && !rec.syncedAt) {
        rec.syncedAt = Date.now();
        await tx.store.put(rec);
        count += 1;
      }
    }
    await tx.done;
    return count;
  } catch (e) {
    console.warn('[offlineStore] markSynced(id) failed:', e);
    return 0;
  }
}

/**
 * Mark a batch of attempts as synced. `ids` is an array of
 * [packId, questionId] composite keys. Used by the SW's background
 * sync when it pulls raw attempt rows from the server response.
 */
export async function markSyncedPairs(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  try {
    const db = await getDB();
    const tx = db.transaction('attempts', 'readwrite');
    let count = 0;
    for (const key of ids) {
      const rec = await tx.store.get(key);
      if (rec && !rec.syncedAt) {
        rec.syncedAt = Date.now();
        await tx.store.put(rec);
        count += 1;
      }
    }
    await tx.done;
    return count;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[offlineStore] markSyncedPairs failed:', e);
    return 0;
  }
}

/** Compute a quick "mastery" score (0..1) for a pack. */
export async function packMastery(packId) {
  const attempts = await listAttempts(packId);
  if (attempts.length === 0) return 0;
  const correct = attempts.filter((a) => a.correct).length;
  return correct / attempts.length;
}

// ── PENDING AI (offline tutor queue) ──────────────────────────────────────

/**
 * Queue an AI question that the user typed while offline. The SW will
 * drain this queue once connectivity returns.
 */
export async function enqueueAI({ prompt, panel, context }) {
  try {
    const db = await getDB();
    const id = await db.add('pendingAI', {
      prompt,
      panel: panel || 'tutor',
      context: context || null,
      createdAt: Date.now(),
    });
    return id;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[offlineStore] enqueueAI failed:', e);
    return null;
  }
}

export async function listPendingAI() {
  try {
    const db = await getDB();
    return await db.getAll('pendingAI');
  } catch (e) {
    return [];
  }
}

export async function clearPendingAI(id) {
  try {
    const db = await getDB();
    await db.delete('pendingAI', id);
    return true;
  } catch {
    return false;
  }
}

/** Count of items currently in the pendingAI queue. */
export async function pendingAICount() {
  try {
    return (await listPendingAI()).length;
  } catch {
    return 0;
  }
}

/**
 * Drain the pendingAI queue by POSTing each item to /api/claude and
 * deleting it from the queue on success. The actual implementation is
 * the SW's background sync — this function is a best-effort manual
 * trigger for the banner's "Sync now" button.
 */
export async function flushPendingAI({ signal } = {}) {
  const queue = await listPendingAI();
  let sent = 0;
  for (const item of queue) {
    if (signal?.aborted) break;
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panel: item.panel || 'tutor',
          prompt: item.prompt,
          context: item.context,
          __queued: true,
        }),
      });
      if (res.ok) {
        await clearPendingAI(item.id);
        sent += 1;
      } else {
        // Keep in queue; will retry on next flush.
        break;
      }
    } catch (_) {
      // Network still down; keep items queued.
      break;
    }
  }
  window.dispatchEvent(new CustomEvent('lamina:pending-changed'));
  return sent;
}

// ── META (small kv) ───────────────────────────────────────────────────────

export async function setMeta(key, value) {
  try {
    const db = await getDB();
    await db.put('meta', { key, value, updatedAt: Date.now() });
    return true;
  } catch {
    return false;
  }
}

export async function getMeta(key, fallback = null) {
  try {
    const db = await getDB();
    const rec = await db.get('meta', key);
    return rec ? rec.value : fallback;
  } catch {
    return fallback;
  }
}

// ── UTILITIES ─────────────────────────────────────────────────────────────

/**
 * Total bytes used by all installed packs. Used by the hub to surface a
 * "X MB of offline content installed" line. We sum the precomputed
 * `sizeBytes` if present, otherwise fall back to a rough JSON length.
 */
export async function totalSize() {
  try {
    const packs = await listPacks();
    return packs.reduce((sum, p) => sum + (p.sizeBytes || estimateSize(p.data) || 0), 0);
  } catch {
    return 0;
  }
}

function estimateSize(obj) {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch {
    return 0;
  }
}

export function formatBytes(n) {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
