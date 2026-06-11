import React from 'react';
import { CardHeader, Field, Label, inputStyle, primaryBtn } from '../UIHelpers.jsx';
import { Pill } from './sections.jsx';
import { slugify, splitLines, joinLines, formatDateTime, buildBlankSection } from './helpers.js';

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

export function DocsEditor({ docs, history = [], adminKey, onAdminKeyChange, onUnlock, onRefresh, onSave, saving, status, onUpdateDocs }) {
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
    const defaultStart = '2026-06-10';
    const defaultEnd = '2026-06-14';
    onUpdateDocs((current) => ({
      ...current,
      publish: {
        ...(current.publish || {}),
        enabled: true,
        mode: 'window',
        window: {
          ...((current.publish && current.publish.window) || {}),
          startDate: defaultStart,
          startTime: '00:00',
          endDate: defaultEnd,
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
