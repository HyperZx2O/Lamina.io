import React, { useEffect, useMemo, useState } from 'react';
import { Label, primaryBtn } from './UIHelpers.jsx';
import { Pill, SectionBody } from './docs/sections.jsx';
import { DocsEditor } from './docs/editor.jsx';
import { loadPref, savePref, deepClone, formatDateTime, statusTone, makeMarkdown, downloadText } from './docs/helpers.js';

const ADMIN_STORAGE_KEY = 'lamina_docs_admin_key';
const PUBLIC_ENDPOINT = '/api/docs';
const ADMIN_ENDPOINT = '/api/docs/admin';

export default function DocsPage() {
  const [payload, setPayload] = useState(null);
  const [docs, setDocs] = useState(null);
  const [adminKey, setAdminKey] = useState(() => loadPref(ADMIN_STORAGE_KEY, ''));
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Loading docs...');
  const [, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [history, setHistory] = useState([]);
  const [positiveCount, setPositiveCount] = useState(0);
  useEffect(() => {
    try {
      const arr = JSON.parse(localStorage.getItem('lamina_feedback') || '[]');
      const count = arr.filter((f) => f.rating === 'positive').length;
      setPositiveCount(count);
    } catch { /* localStorage not available */ }
  }, []);


  const effectiveDocs = docs || payload?.docs || null;
  const access = payload?.access || { allowed: true, reason: 'Public', mode: 'window' };
  const live = payload?.live || null;

  const loadDocs = async (key = '') => {
    setLoading(true);
    try {
      const endpoint = key ? ADMIN_ENDPOINT : PUBLIC_ENDPOINT;
      const headers = key ? { 'x-docs-admin-key': key } : {};
      const response = await fetch(endpoint, { headers });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'Failed to load docs');
      setPayload(json);
      setDocs(json.docs || null);
      setHistory(json.history || []);
      setShowAdmin(Boolean(key));
      setStatus(json.access?.allowed ? 'Docs loaded' : json.access?.reason || 'Restricted');
      if (key) savePref(ADMIN_STORAGE_KEY, key);
    } catch (error) {
      if (!key) {
        setPayload({ access: { allowed: false, reason: error.message }, docs: null, live: null, history: [] });
        setDocs(null);
        setHistory([]);
      }
      setShowAdmin(false);
      setStatus(error.message || 'Failed to load docs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDocs('');
  }, []);

  useEffect(() => {
    const title = effectiveDocs?.meta?.title || 'Lamina Docs';
    const description = effectiveDocs?.meta?.subtitle || 'Pitch deck, technical reference, and live system view';
    document.title = `${title} | Lamina`;
    document.documentElement.lang = 'en';

    let descriptionTag = document.querySelector('meta[name="description"]');
    if (!descriptionTag) {
      descriptionTag = document.createElement('meta');
      descriptionTag.setAttribute('name', 'description');
      document.head.appendChild(descriptionTag);
    }
    descriptionTag.setAttribute('content', description);
  }, [effectiveDocs]);

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return effectiveDocs?.sections || [];
    return (effectiveDocs?.sections || []).filter((section) => {
      const haystack = [
        section.title,
        section.summary,
        section.eyebrow,
        ...(section.body || []),
        ...(section.bullets || []),
        ...(section.items || []).map((item) => `${item.name || item.label || ''} ${item.value || item.note || ''}`),
        ...(section.endpoints || []).map((item) => `${item.method || ''} ${item.path || ''} ${item.description || ''}`),
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [effectiveDocs, search]);

  const publicSection = (section) => {
    if (section.kind === 'team') {
      return section;
    }

    return section;
  };

  const updateDocs = (updater) => {
    setDocs((current) => {
      const base = current || payload?.docs || { meta: {}, publish: {}, sections: [] };
      const next = typeof updater === 'function' ? updater(deepClone(base)) : updater;
      return next;
    });
  };

  const saveDocs = async () => {
    if (!docs) return;
    setSaving(true);
    setStatus('Saving draft...');
    try {
      const response = await fetch(ADMIN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-docs-admin-key': adminKey,
        },
        body: JSON.stringify({ docs }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'Failed to save docs');
      setPayload(json);
      setDocs(json.docs || docs);
      setHistory(json.history || []);
      setStatus('Draft saved');
      savePref(ADMIN_STORAGE_KEY, adminKey);
    } catch (error) {
      setStatus(error.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const unlockAdmin = async () => {
    savePref(ADMIN_STORAGE_KEY, adminKey);
    await loadDocs(adminKey);
  };

  const exportMarkdown = () => {
    if (!effectiveDocs) return;
    downloadText('lamina-docs.md', makeMarkdown(effectiveDocs), 'text/markdown');
  };

  const exportPdf = () => {
    window.print();
  };

  const copyShareLink = async () => {
    const shareUrl = window.location.href;
    await navigator.clipboard.writeText(shareUrl);
    setStatus('Share link copied');
  };

  const isRestricted = access && !access.allowed;
  const sectionsForDisplay = filteredSections.length ? filteredSections : effectiveDocs?.sections || [];

  return (
    <div className="docs-shell">
      <div className="docs-background" aria-hidden="true" />
      <main className="docs-page">
        <header className="docs-hero">
          <div className="docs-hero-topbar">
            <button type="button" className="docs-back-btn" onClick={() => window.location.assign('/')}>← Back to app</button>
            <div className="docs-top-actions">
              <button type="button" className="docs-ghost-btn" onClick={copyShareLink}>Share link</button>
              <button type="button" className="docs-ghost-btn" onClick={exportMarkdown}>Export MD</button>
              <button type="button" className="docs-ghost-btn" onClick={exportPdf}>Export PDF</button>
            </div>
          </div>

          <div className="docs-hero-grid">
            <div>
              <p className="docs-kicker">{effectiveDocs?.meta?.teamName || 'Team Miu Miu'}</p>
              <h1>{effectiveDocs?.meta?.title || 'Lamina Docs'}</h1>
              <p className="docs-subtitle">{effectiveDocs?.meta?.subtitle || 'Pitch deck, technical reference, and live system view'}</p>
              <div className="docs-meta-row">
                <Pill tone={access.allowed ? 'current' : 'planned'}>{access.allowed ? 'Public' : 'Restricted'}</Pill>
                <span>Updated {formatDateTime(effectiveDocs?.meta?.updatedAt || payload?.live?.generatedAt)}</span>
                <span>{live?.featureCount || 0} live features</span>
                <span>{live?.apiCount || 0} APIs</span>
                <span>{positiveCount} positive responses collected during testing</span>
              </div>
            </div>

            <aside className="docs-summary-panel">
              <div className="docs-summary-heading">Live system view</div>
              <div className="docs-summary-grid">
                <div>
                  <div className="docs-summary-label">Access</div>
                  <div className="docs-summary-value">{access.reason || 'Unknown'}</div>
                </div>
                <div>
                  <div className="docs-summary-label">Sync source</div>
                  <div className="docs-summary-value">Features, settings, APIs, events</div>
                </div>
                <div>
                  <div className="docs-summary-label">Mode</div>
                  <div className="docs-summary-value">{access.mode || 'window'}</div>
                </div>
                <div>
                  <div className="docs-summary-label">Window</div>
                  <div className="docs-summary-value">{formatDateTime(access.startAt)} to {formatDateTime(access.endAt)}</div>
                </div>
              </div>
            </aside>
          </div>

          <div className="docs-nav-shell">
            <Label>Search</Label>
            <input className="docs-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search docs sections" />
            <div className="docs-nav-links">
              {sectionsForDisplay.map((section) => (
                <a key={section.slug} href={`#${section.slug}`} className="docs-nav-link">
                  {section.title}
                </a>
              ))}
            </div>
          </div>
        </header>

        {isRestricted ? (
          <section className="docs-restricted">
            <div>
              <p className="docs-kicker">Not available</p>
              <h2>This docs window is closed.</h2>
              <p>{access.reason || 'The docs are currently unavailable.'}</p>
            </div>
            <div className="docs-restricted-actions">
              <button type="button" style={primaryBtn('#9cc4b2', 'rgba(156,196,178,.2)')} onClick={() => window.location.assign('/')}>Return to app</button>
              <button type="button" className="docs-ghost-btn" onClick={() => setShowAdmin(true)}>Admin unlock</button>
            </div>
          </section>
        ) : (
          <div className="docs-layout">
            <div className="docs-content">
              {(sectionsForDisplay || []).map((section, index) => (
                <section
                  key={section.slug}
                  id={section.slug}
                  className="docs-section animate-fade-in"
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <div className="docs-section-head">
                    <div>
                      <p className="docs-kicker">{section.eyebrow || 'Docs'}</p>
                      <h2>{section.title}</h2>
                      {section.summary && <p className="docs-section-summary">{section.summary}</p>}
                    </div>
                    {section.kind && <Pill tone={statusTone(section.kind === 'matrix' ? 'current' : 'planned')}>{section.kind}</Pill>}
                  </div>
                  <SectionBody section={publicSection(section)} />
                </section>
              ))}
            </div>

            <aside className="docs-aside">
              <div className="docs-aside-card">
                <div className="docs-aside-title">Quick facts</div>
                <ul className="docs-fact-list">
                  <li>One page for the pitch deck, technical whitepaper, and live system view.</li>
                  <li>Section-based editing and schedule controls live on the server.</li>
                  <li>The team section renders uniform profile cards with fallback avatars.</li>
                </ul>
              </div>

              <div className="docs-aside-card">
                <div className="docs-aside-title">Live sync</div>
                <ul className="docs-fact-list">
                  <li>{live?.featureCount || 0} live features in the current snapshot.</li>
                  <li>{live?.apiCount || 0} exposed or tracked APIs.</li>
                  <li>Synced from {Array.isArray(live?.syncedFrom) ? live.syncedFrom.join(', ') : 'server state'}.</li>
                </ul>
              </div>
            </aside>
          </div>
        )}

        <section className="docs-admin-toggle">
          <div className="docs-admin-toggle-head">
            <div>
              <p className="docs-kicker">Admin</p>
              <h2>Editing and publish controls</h2>
            </div>
            <button type="button" className="docs-ghost-btn" onClick={() => setShowAdmin((value) => !value)}>
              {showAdmin ? 'Hide editor' : 'Show editor'}
            </button>
          </div>

          {showAdmin && (
            <DocsEditor
              docs={docs || effectiveDocs || payload?.docs || null}
              history={history}
              adminKey={adminKey}
              onAdminKeyChange={setAdminKey}
              onUnlock={unlockAdmin}
              onRefresh={() => loadDocs(showAdmin ? adminKey : '')}
              onSave={saveDocs}
              saving={saving}
              status={status}
              onUpdateDocs={updateDocs}
            />
          )}
        </section>
      </main>
    </div>
  );
}
