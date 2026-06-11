import React from 'react';
import { initials, statusTone } from './helpers.js';

export function Pill({ children, tone = 'planned' }) {
  return <span className={`docs-pill docs-pill-${tone}`}>{children}</span>;
}

export function Diagram({ nodes, variant = 'architecture' }) {
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

export function SectionBody({ section }) {
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
