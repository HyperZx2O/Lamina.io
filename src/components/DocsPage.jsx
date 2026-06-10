import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, Field, Label, inputStyle, primaryBtn } from './UIHelpers.jsx';

const ADMIN_STORAGE_KEY = 'lamina_docs_admin_key';
const PUBLIC_ENDPOINT = '/api/docs';
const ADMIN_ENDPOINT = '/api/docs/admin';

function loadPref(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value !== null ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function savePref(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* localStorage not available */ }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

function splitLines(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(values) {
  return Array.isArray(values) ? values.join('\n') : '';
}

function statusTone(status) {
  if (status === 'current' || status === 'live') return 'current';
  if (status === 'upcoming') return 'upcoming';
  return 'planned';
}

function formatDateTime(value) {
  if (!value) return 'Unset';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function initials(name) {
  return String(name || 'Lam').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'L';
}

function makeMarkdown(doc) {
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

function downloadText(filename, content, type = 'text/plain') {
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

function buildBlankSection(kind = 'text') {
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

function Pill({ children, tone = 'planned' }) {
  return <span className={`docs-pill docs-pill-${tone}`}>{children}</span>;
}

function Diagram({ nodes, variant = 'architecture' }) {
  const safeNodes = Array.isArray(nodes) ? nodes.slice(0, 6) : [];
  const layout = safeNodes.map((label, index) => {
    const x = 40 + index * 155;
    const width = 128;
    return { label, x, width };
  });

  return (
    <div className="docs-diagram-wrap">
      <svg viewBox="0 0 980 180" role="img" aria-label={`${variant} diagram`} className="docs-diagram">
        <defs>
          <marker id={`arrow-${variant}`} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L8,3 z" fill="currentColor" />
          </marker>
        </defs>
        {layout.map((node, index) => (
          <g key={`${variant}-${index}`}>
            <rect x={node.x} y="56" rx="18" ry="18" width={node.width} height="60" className="docs-diagram-node" />
            <text x={node.x + node.width / 2} y="91" textAnchor="middle" className="docs-diagram-text">
              {node.label}
            </text>
            {index < layout.length - 1 && (
              <path
                d={`M${node.x + node.width} 86 L${node.x + node.width + 28} 86`}
                className="docs-diagram-arrow"
                markerEnd={`url(#arrow-${variant})`}
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function SectionBody({ section }) {
  if (section.kind === 'matrix') {
    return (
      <div className="docs-matrix-grid">
        {(section.items || []).map((item) => (
          <div className="docs-matrix-row" key={item.name}>
            <div>
              <div className="docs-matrix-title">{item.name}</div>
              <div className="docs-matrix-note">{item.note}</div>
            </div>
            <Pill tone={statusTone(item.status)}>{item.status}</Pill>
          </div>
        ))}
      </div>
    );
  }

  if (section.kind === 'diagram') {
    return (
      <div className="docs-section-figure">
        <Diagram nodes={section.diagram?.nodes || []} variant={section.slug} />
      </div>
    );
  }

  if (section.kind === 'stack') {
    return (
      <div className="docs-stack-grid">
        {(section.items || []).map((item) => (
          <div className="docs-stack-item" key={item.label}>
            <div className="docs-stack-label">{item.label}</div>
            <div className="docs-stack-value">{item.value}</div>
          </div>
        ))}
      </div>
    );
  }

  if (section.kind === 'api') {
    return (
      <div className="docs-api-list">
        {(section.endpoints || []).map((endpoint) => (
          <div className="docs-api-row" key={`${endpoint.method}-${endpoint.path}`}>
            <div className="docs-api-left">
              <div className="docs-api-method">{endpoint.method}</div>
              <div className="docs-api-path">{endpoint.path}</div>
            </div>
            <div className="docs-api-right">
              <div className="docs-api-auth">{endpoint.auth}</div>
              <div className="docs-api-description">{endpoint.description}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (section.kind === 'roadmap') {
    return (
      <div className="docs-roadmap-grid">
        {(section.phases || []).map((phase) => (
          <div className="docs-roadmap-phase" key={phase.label}>
            <div className="docs-roadmap-label">{phase.label}</div>
            <ul className="docs-roadmap-list">
              {(phase.items || []).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  if (section.kind === 'metrics') {
    return (
      <div className="docs-metrics-grid">
        {(section.metrics || []).map((metric) => (
          <div className="docs-metric-card" key={metric.label}>
            <div className="docs-metric-label">{metric.label}</div>
            <div className="docs-metric-value">{metric.value}</div>
          </div>
        ))}
      </div>
    );
  }

  if (section.kind === 'team') {
    return (
      <div className="docs-team-block">
        <div className="docs-team-name">{section.teamName || 'Team'}</div>
        <div className="docs-team-grid">
          {(section.members || []).map((member) => (
            <article className="docs-team-card" key={`${member.name}-${member.email}`}>
              <div className="docs-avatar-wrap">
                {member.avatar ? (
                  <img className="docs-avatar" src={member.avatar} alt={member.name} />
                ) : (
                  <div className="docs-avatar docs-avatar-fallback">{initials(member.name)}</div>
                )}
              </div>
              <div className="docs-team-meta">
                <div className="docs-team-name-line">{member.name}</div>
                <div className="docs-team-role">{member.role}</div>
                <a className="docs-team-email" href={`mailto:${member.email}`}>{member.email}</a>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (section.kind === 'changelog') {
    return (
      <div className="docs-changelog-list">
        {(section.items || []).map((item) => (
          <div className="docs-changelog-row" key={`${item.version}-${item.date}`}>
            <div>
              <div className="docs-changelog-version">v{item.version}</div>
              <div className="docs-changelog-date">{item.date}</div>
            </div>
            <div className="docs-changelog-note">{item.note}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="docs-prose">
      {(section.body || []).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      {(section.bullets || []).length > 0 && (
        <ul>
          {(section.bullets || []).map((bullet) => <li key={bullet}>{bullet}</li>)}
        </ul>
      )}
    </div>
  );
}

function SectionEditor({ section, index, onChange, onMoveUp, onMoveDown, onDelete }) {
  const patch = (field, value) => onChange(index, { ...section, [field]: value });

  const updateMember = (memberIndex, field, value) => {
    const members = [...(section.members || [])];
    members[memberIndex] = { ...members[memberIndex], [field]: value };
    patch('members', members);
  };

  const updateListItem = (collectionKey, itemIndex, field, value) => {
    const collection = [...(section[collectionKey] || [])];
    collection[itemIndex] = { ...collection[itemIndex], [field]: value };
    patch(collectionKey, collection);
  };

  const addMember = () => patch('members', [...(section.members || []), { name: '', role: '', email: '', avatar: '' }]);
  const addItem = (collectionKey, template) => patch(collectionKey, [...(section[collectionKey] || []), template]);

  const removeItem = (collectionKey, itemIndex) => {
    const collection = [...(section[collectionKey] || [])];
    collection.splice(itemIndex, 1);
    patch(collectionKey, collection);
  };

  return (
    <section className="docs-editor-card">
      <div className="docs-editor-card-head">
        <div>
          <div className="docs-editor-kind">{section.kind}</div>
          <h3 className="docs-editor-title">{section.title || 'Untitled section'}</h3>
        </div>
        <div className="docs-editor-actions">
          <button type="button" className="docs-ghost-btn" onClick={onMoveUp}>Up</button>
          <button type="button" className="docs-ghost-btn" onClick={onMoveDown}>Down</button>
          <button type="button" className="docs-ghost-btn docs-danger-btn" onClick={() => onDelete(index)}>Delete</button>
        </div>
      </div>

      <div className="docs-editor-grid">
        <Field>
          <Label>Slug</Label>
          <input style={inputStyle} value={section.slug || ''} onChange={(event) => patch('slug', slugify(event.target.value))} />
        </Field>
        <Field>
          <Label>Kind</Label>
          <select style={inputStyle} value={section.kind || 'text'} onChange={(event) => patch('kind', event.target.value)}>
            {['text', 'matrix', 'diagram', 'stack', 'api', 'roadmap', 'metrics', 'team', 'changelog'].map((kind) => <option key={kind} value={kind}>{kind}</option>)}
          </select>
        </Field>
        <Field>
          <Label>Eyebrow</Label>
          <input style={inputStyle} value={section.eyebrow || ''} onChange={(event) => patch('eyebrow', event.target.value)} />
        </Field>
        <Field>
          <Label>Title</Label>
          <input style={inputStyle} value={section.title || ''} onChange={(event) => patch('title', event.target.value)} />
        </Field>
        <Field style={{ gridColumn: '1 / -1' }}>
          <Label>Summary</Label>
          <textarea style={{ ...inputStyle, minHeight: 88, resize: 'vertical' }} value={section.summary || ''} onChange={(event) => patch('summary', event.target.value)} />
        </Field>
      </div>

      {(section.kind === 'text' || section.kind === 'metrics' || section.kind === 'stack' || section.kind === 'api' || section.kind === 'roadmap' || section.kind === 'changelog') && (
        <div className="docs-editor-grid docs-editor-grid-gap">
          <Field>
            <Label>Body paragraphs</Label>
            <textarea
              style={{ ...inputStyle, minHeight: 128, resize: 'vertical' }}
              value={joinLines(section.body || [])}
              onChange={(event) => patch('body', splitLines(event.target.value))}
            />
          </Field>
          <Field>
            <Label>Bullets</Label>
            <textarea
              style={{ ...inputStyle, minHeight: 128, resize: 'vertical' }}
              value={joinLines(section.bullets || [])}
              onChange={(event) => patch('bullets', splitLines(event.target.value))}
            />
          </Field>
        </div>
      )}

      {section.kind === 'matrix' && (
        <div className="docs-editor-list">
          {(section.items || []).map((item, itemIndex) => (
            <div className="docs-editor-row" key={`${item.name || 'item'}-${itemIndex}`}>
              <input style={inputStyle} value={item.name || ''} placeholder="Feature name" onChange={(event) => updateListItem('items', itemIndex, 'name', event.target.value)} />
              <select style={inputStyle} value={item.status || 'planned'} onChange={(event) => updateListItem('items', itemIndex, 'status', event.target.value)}>
                <option value="current">current</option>
                <option value="upcoming">upcoming</option>
                <option value="planned">planned</option>
              </select>
              <input style={inputStyle} value={item.note || ''} placeholder="Note" onChange={(event) => updateListItem('items', itemIndex, 'note', event.target.value)} />
              <button type="button" className="docs-ghost-btn" onClick={() => removeItem('items', itemIndex)}>Remove</button>
            </div>
          ))}
          <button type="button" className="docs-ghost-btn" onClick={() => addItem('items', { name: '', status: 'planned', note: '' })}>Add matrix row</button>
        </div>
      )}

      {section.kind === 'diagram' && (
        <div className="docs-editor-list">
          <Field>
            <Label>Diagram nodes</Label>
            <textarea
              style={{ ...inputStyle, minHeight: 118, resize: 'vertical' }}
              value={joinLines(section.diagram?.nodes || [])}
              onChange={(event) => patch('diagram', { ...(section.diagram || {}), nodes: splitLines(event.target.value) })}
            />
          </Field>
        </div>
      )}

      {section.kind === 'stack' && (
        <div className="docs-editor-list">
          {(section.items || []).map((item, itemIndex) => (
            <div className="docs-editor-row" key={`${item.label || 'stack'}-${itemIndex}`}>
              <input style={inputStyle} value={item.label || ''} placeholder="Label" onChange={(event) => updateListItem('items', itemIndex, 'label', event.target.value)} />
              <input style={inputStyle} value={item.value || ''} placeholder="Value" onChange={(event) => updateListItem('items', itemIndex, 'value', event.target.value)} />
              <button type="button" className="docs-ghost-btn" onClick={() => removeItem('items', itemIndex)}>Remove</button>
            </div>
          ))}
          <button type="button" className="docs-ghost-btn" onClick={() => addItem('items', { label: '', value: '' })}>Add stack row</button>
        </div>
      )}

      {section.kind === 'api' && (
        <div className="docs-editor-list">
          {(section.endpoints || []).map((endpoint, endpointIndex) => (
            <div className="docs-editor-row docs-editor-row-api" key={`${endpoint.method || 'endpoint'}-${endpointIndex}`}>
              <input style={inputStyle} value={endpoint.method || ''} placeholder="Method" onChange={(event) => updateListItem('endpoints', endpointIndex, 'method', event.target.value)} />
              <input style={inputStyle} value={endpoint.path || ''} placeholder="Path" onChange={(event) => updateListItem('endpoints', endpointIndex, 'path', event.target.value)} />
              <input style={inputStyle} value={endpoint.auth || ''} placeholder="Auth" onChange={(event) => updateListItem('endpoints', endpointIndex, 'auth', event.target.value)} />
              <input style={inputStyle} value={endpoint.description || ''} placeholder="Description" onChange={(event) => updateListItem('endpoints', endpointIndex, 'description', event.target.value)} />
              <button type="button" className="docs-ghost-btn" onClick={() => removeItem('endpoints', endpointIndex)}>Remove</button>
            </div>
          ))}
          <button type="button" className="docs-ghost-btn" onClick={() => addItem('endpoints', { method: 'GET', path: '', auth: 'public', description: '' })}>Add endpoint</button>
        </div>
      )}

      {section.kind === 'roadmap' && (
        <div className="docs-editor-list">
          {(section.phases || []).map((phase, phaseIndex) => (
            <div className="docs-editor-phase" key={`${phase.label || 'phase'}-${phaseIndex}`}>
              <div className="docs-editor-row">
                <input style={inputStyle} value={phase.label || ''} placeholder="Phase label" onChange={(event) => updateListItem('phases', phaseIndex, 'label', event.target.value)} />
                <button type="button" className="docs-ghost-btn" onClick={() => removeItem('phases', phaseIndex)}>Remove</button>
              </div>
              <textarea
                style={{ ...inputStyle, minHeight: 96, resize: 'vertical' }}
                value={joinLines(phase.items || [])}
                onChange={(event) => updateListItem('phases', phaseIndex, 'items', splitLines(event.target.value))}
              />
            </div>
          ))}
          <button type="button" className="docs-ghost-btn" onClick={() => addItem('phases', { label: '', items: [] })}>Add phase</button>
        </div>
      )}

      {section.kind === 'metrics' && (
        <div className="docs-editor-list">
          {(section.metrics || []).map((metric, metricIndex) => (
            <div className="docs-editor-row" key={`${metric.label || 'metric'}-${metricIndex}`}>
              <input style={inputStyle} value={metric.label || ''} placeholder="Label" onChange={(event) => updateListItem('metrics', metricIndex, 'label', event.target.value)} />
              <input style={inputStyle} value={metric.value || ''} placeholder="Value" onChange={(event) => updateListItem('metrics', metricIndex, 'value', event.target.value)} />
              <button type="button" className="docs-ghost-btn" onClick={() => removeItem('metrics', metricIndex)}>Remove</button>
            </div>
          ))}
          <button type="button" className="docs-ghost-btn" onClick={() => addItem('metrics', { label: '', value: '' })}>Add metric</button>
        </div>
      )}

      {section.kind === 'team' && (
        <div className="docs-editor-list">
          <Field>
            <Label>Team name</Label>
            <input style={inputStyle} value={section.teamName || ''} onChange={(event) => patch('teamName', event.target.value)} />
          </Field>
          {(section.members || []).map((member, memberIndex) => (
            <div className="docs-editor-member" key={`${member.name || 'member'}-${memberIndex}`}>
              <div className="docs-editor-row docs-editor-row-member">
                <input style={inputStyle} value={member.name || ''} placeholder="Full name" onChange={(event) => updateMember(memberIndex, 'name', event.target.value)} />
                <input style={inputStyle} value={member.role || ''} placeholder="Role" onChange={(event) => updateMember(memberIndex, 'role', event.target.value)} />
                <input style={inputStyle} value={member.email || ''} placeholder="Email" onChange={(event) => updateMember(memberIndex, 'email', event.target.value)} />
                <input style={inputStyle} value={member.avatar || ''} placeholder="Avatar URL" onChange={(event) => updateMember(memberIndex, 'avatar', event.target.value)} />
                <button type="button" className="docs-ghost-btn" onClick={() => removeItem('members', memberIndex)}>Remove</button>
              </div>
            </div>
          ))}
          <button type="button" className="docs-ghost-btn" onClick={addMember}>Add team member</button>
        </div>
      )}

      {section.kind === 'changelog' && (
        <div className="docs-editor-list">
          {(section.items || []).map((item, itemIndex) => (
            <div className="docs-editor-row docs-editor-row-changelog" key={`${item.version || 'version'}-${itemIndex}`}>
              <input style={inputStyle} value={item.version || ''} placeholder="Version" onChange={(event) => updateListItem('items', itemIndex, 'version', event.target.value)} />
              <input style={inputStyle} value={item.date || ''} placeholder="Date" onChange={(event) => updateListItem('items', itemIndex, 'date', event.target.value)} />
              <input style={inputStyle} value={item.note || ''} placeholder="Note" onChange={(event) => updateListItem('items', itemIndex, 'note', event.target.value)} />
              <button type="button" className="docs-ghost-btn" onClick={() => removeItem('items', itemIndex)}>Remove</button>
            </div>
          ))}
          <button type="button" className="docs-ghost-btn" onClick={() => addItem('items', { version: '', date: '', note: '' })}>Add changelog entry</button>
        </div>
      )}

      <div className="docs-editor-footer">
        <button type="button" className="docs-ghost-btn" onClick={onMoveUp}>Move up</button>
        <button type="button" className="docs-ghost-btn" onClick={onMoveDown}>Move down</button>
        <button type="button" className="docs-ghost-btn docs-danger-btn" onClick={() => onDelete(index)}>Delete section</button>
      </div>
    </section>
  );
}

function DocsEditor({ docs, history = [], adminKey, onAdminKeyChange, onUnlock, onRefresh, onSave, saving, status, onUpdateDocs }) {
  const publish = docs?.publish || {};
  const sections = docs?.sections || [];

  const updatePublish = (field, value) => {
    onUpdateDocs((current) => ({
      ...current,
      publish: {
        ...(current.publish || {}),
        [field]: value,
      },
    }));
  };

  const updateWindow = (field, value) => {
    onUpdateDocs((current) => ({
      ...current,
      publish: {
        ...(current.publish || {}),
        window: {
          ...((current.publish && current.publish.window) || {}),
          [field]: value,
        },
      },
    }));
  };

  const updateMeta = (field, value) => {
    onUpdateDocs((current) => ({
      ...current,
      meta: {
        ...(current.meta || {}),
        [field]: value,
      },
    }));
  };

  const updateSection = (index, nextSection) => {
    onUpdateDocs((current) => {
      const nextSections = (current.sections || []).slice();
      nextSections[index] = nextSection;
      return { ...current, sections: nextSections };
    });
  };

  const moveSection = (index, delta) => {
    onUpdateDocs((current) => {
      const nextSections = (current.sections || []).slice();
      const nextIndex = index + delta;
      if (nextIndex < 0 || nextIndex >= nextSections.length) return current;
      [nextSections[index], nextSections[nextIndex]] = [nextSections[nextIndex], nextSections[index]];
      return { ...current, sections: nextSections };
    });
  };

  const deleteSection = (index) => {
    onUpdateDocs((current) => {
      const nextSections = (current.sections || []).slice();
      nextSections.splice(index, 1);
      return { ...current, sections: nextSections };
    });
  };

  const addSection = () => {
    onUpdateDocs((current) => ({
      ...current,
      sections: [...(current.sections || []), buildBlankSection('text')],
    }));
  };

  const setDefaultWindow = () => {
    onUpdateDocs((current) => ({
      ...current,
      publish: {
        ...(current.publish || {}),
        enabled: true,
        mode: 'window',
        window: {
          ...((current.publish && current.publish.window) || {}),
          startDate: '2026-06-10',
          startTime: '00:00',
          endDate: '2026-06-14',
          endTime: '23:59',
        },
      },
    }));
  };

  const goLiveNow = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const endDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
    onUpdateDocs((current) => ({
      ...current,
      publish: {
        ...(current.publish || {}),
        enabled: true,
        mode: 'window',
        window: {
          ...((current.publish && current.publish.window) || {}),
          startDate: date,
          startTime: time,
          endDate,
          endTime: `${pad((now.getHours() + 24) % 24)}:${pad(now.getMinutes())}`,
        },
      },
    }));
  };

  return (
    <section className="docs-admin-shell">
      <CardHeader
        icon="🔐"
        color="#7da2f0"
        title="Admin controls"
        subtitle="Visibility, scheduling, section editing, and versioned saves for the docs module."
      />

      <div className="docs-admin-grid">
        <Field>
          <Label>Admin key</Label>
          <div className="docs-admin-row">
            <input style={inputStyle} value={adminKey} onChange={(event) => onAdminKeyChange(event.target.value)} placeholder="Enter DOCS_ADMIN_KEY" />
            <button type="button" style={primaryBtn('#7da2f0', 'rgba(125,162,240,.18)')} onClick={onUnlock}>Unlock</button>
            <button type="button" className="docs-ghost-btn" onClick={onRefresh}>Refresh</button>
          </div>
        </Field>

        <Field>
          <Label>Team name</Label>
          <input style={inputStyle} value={docs?.meta?.teamName || ''} onChange={(event) => updateMeta('teamName', event.target.value)} />
        </Field>

        <Field>
          <Label>Docs title</Label>
          <input style={inputStyle} value={docs?.meta?.title || ''} onChange={(event) => updateMeta('title', event.target.value)} />
        </Field>

        <Field>
          <Label>Version</Label>
          <input style={inputStyle} value={docs?.meta?.version || ''} onChange={(event) => updateMeta('version', event.target.value)} />
        </Field>

        <Field style={{ gridColumn: '1 / -1' }}>
          <Label>Subtitle</Label>
          <input style={inputStyle} value={docs?.meta?.subtitle || ''} onChange={(event) => updateMeta('subtitle', event.target.value)} />
        </Field>

        <Field>
          <Label>Visibility</Label>
          <label className="docs-inline-toggle">
            <input type="checkbox" checked={publish.enabled !== false} onChange={(event) => updatePublish('enabled', event.target.checked)} />
            <span>{publish.enabled !== false ? 'Enabled' : 'Disabled'}</span>
          </label>
        </Field>

        <Field>
          <Label>Schedule mode</Label>
          <select style={inputStyle} value={publish.mode || 'window'} onChange={(event) => updatePublish('mode', event.target.value)}>
            <option value="window">Window</option>
            <option value="duration">Duration</option>
          </select>
        </Field>

        <Field>
          <Label>Duration minutes</Label>
          <input style={inputStyle} type="number" min="15" step="15" value={publish.durationMinutes || 0} onChange={(event) => updatePublish('durationMinutes', Number(event.target.value || 0))} />
        </Field>

        <Field>
          <Label>Schedule note</Label>
          <input style={inputStyle} value={publish.note || ''} onChange={(event) => updatePublish('note', event.target.value)} />
        </Field>

        <Field>
          <Label>Default window</Label>
          <button type="button" className="docs-ghost-btn" onClick={setDefaultWindow}>Reset to June 10 - June 14</button>
        </Field>

        <Field>
          <Label>Go live now</Label>
          <button type="button" className="docs-ghost-btn" onClick={goLiveNow}>Use current time</button>
        </Field>

        <Field>
          <Label>Start date</Label>
          <input style={inputStyle} type="date" value={publish.window?.startDate || ''} onChange={(event) => updateWindow('startDate', event.target.value)} />
        </Field>

        <Field>
          <Label>Start time</Label>
          <input style={inputStyle} type="time" value={publish.window?.startTime || ''} onChange={(event) => updateWindow('startTime', event.target.value)} />
        </Field>

        <Field>
          <Label>End date</Label>
          <input style={inputStyle} type="date" value={publish.window?.endDate || ''} onChange={(event) => updateWindow('endDate', event.target.value)} />
        </Field>

        <Field>
          <Label>End time</Label>
          <input style={inputStyle} type="time" value={publish.window?.endTime || ''} onChange={(event) => updateWindow('endTime', event.target.value)} />
        </Field>
      </div>

      <div className="docs-admin-actions-bar">
        <button type="button" style={primaryBtn('#9cc4b2', 'rgba(156,196,178,.2)')} disabled={saving} onClick={onSave}>{saving ? 'Saving...' : 'Save draft'}</button>
        <button type="button" className="docs-ghost-btn" onClick={addSection}>Add section</button>
        <span className="docs-admin-status">{status}</span>
      </div>

      <div className="docs-editor-list docs-editor-list-sections">
        {sections.map((section, index) => (
          <SectionEditor
            key={`${section.slug || section.title || 'section'}-${index}`}
            section={section}
            index={index}
            onChange={updateSection}
            onMoveUp={() => moveSection(index, -1)}
            onMoveDown={() => moveSection(index, 1)}
            onDelete={deleteSection}
          />
        ))}
      </div>

      <div className="docs-history-panel">
        <div className="docs-aside-title">Recent snapshots</div>
        <div className="docs-history-list">
          {history.length ? history.slice(0, 5).map((entry) => (
            <div className="docs-history-row" key={entry.fileName}>
              <div>
                <div className="docs-history-file">{entry.fileName}</div>
                <div className="docs-history-date">{formatDateTime(entry.updatedAt)}</div>
              </div>
              <Pill tone="planned">saved</Pill>
            </div>
          )) : <div className="docs-history-empty">No snapshots yet. Save a draft to create one.</div>}
        </div>
      </div>
    </section>
  );
}

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
                <motion.section
                  key={section.slug}
                  id={section.slug}
                  className="docs-section"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: index * 0.02 }}
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
                </motion.section>
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
