export function loadPref(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value !== null ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function savePref(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* localStorage not available */ }
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

export function splitLines(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function joinLines(values) {
  return Array.isArray(values) ? values.join('\n') : '';
}

export function statusTone(status) {
  if (status === 'current' || status === 'live') return 'current';
  if (status === 'upcoming') return 'upcoming';
  return 'planned';
}

export function formatDateTime(value) {
  if (!value) return 'Unset';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export function initials(name) {
  return String(name || 'Lam').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'L';
}

export function makeMarkdown(doc) {
  const lines = [];
  lines.push(`# ${doc?.meta?.title || 'Lamina Docs'}`);
  if (doc?.meta?.subtitle) lines.push(doc.meta.subtitle);
  lines.push('');
  lines.push(`Team: ${doc?.meta?.teamName || 'Team'}`);
  lines.push(`Updated: ${doc?.meta?.updatedAt || 'Unknown'}`);
  lines.push('');

  for (const section of doc?.sections || []) {
    lines.push(`## ${section.title}`);
    if (section.summary) lines.push(section.summary);
    if (Array.isArray(section.body)) {
      section.body.forEach((paragraph) => lines.push(paragraph));
    }
    if (Array.isArray(section.bullets) && section.bullets.length) {
      lines.push('');
      section.bullets.forEach((bullet) => lines.push(`- ${bullet}`));
    }
    if (Array.isArray(section.items) && section.items.length) {
      lines.push('');
      section.items.forEach((item) => lines.push(`- ${item.name || item.label}: ${item.note || item.value || item.status || ''}`));
    }
    if (Array.isArray(section.endpoints) && section.endpoints.length) {
      lines.push('');
      section.endpoints.forEach((endpoint) => lines.push(`- ${endpoint.method} ${endpoint.path} (${endpoint.auth})`));
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function downloadText(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function buildBlankSection(kind = 'text') {
  return {
    slug: slugify(kind),
    kind,
    eyebrow: 'New section',
    title: 'Untitled section',
    summary: '',
    body: [],
    bullets: [],
    items: [],
    metrics: [],
    endpoints: [],
    phases: [],
    members: [],
    diagram: { nodes: [] },
  };
}
