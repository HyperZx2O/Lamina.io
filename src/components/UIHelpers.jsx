import React from 'react';

export function Label({ children }) {
  return (
    <label style={{ display: 'block', marginBottom: 8, fontSize: 10, fontWeight: 700, color: '#6b5e58', textTransform: 'uppercase', letterSpacing: '.12em', fontFamily: "'DM Sans', sans-serif" }}>
      {children}
    </label>
  );
}

export function Field({ children, style }) {
  return <div style={{ marginBottom: 20, ...style }}>{children}</div>;
}

export function CardHeader({ icon, color, title, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 28, paddingBottom: 22, borderBottom: '1px solid #3a3634' }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `linear-gradient(135deg, ${color}18, ${color}08)`,
        border: `1px solid ${color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, flexShrink: 0,
        boxShadow: `0 2px 12px ${color}18`,
      }}>
        {icon}
      </div>
      <div style={{ paddingTop: 3 }}>
        <div style={{ fontWeight: 700, fontSize: 19, color: '#e8ddd6', marginBottom: 5, fontFamily: "'Crimson Pro', Georgia, serif", letterSpacing: '-.25px', lineHeight: 1.2 }}>
          {title}
        </div>
        <div style={{ fontSize: 12.5, color: '#a89890', lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif", maxWidth: 520 }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}

export const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 9,
  border: '1px solid #3a3634', background: '#2e2b2a', color: '#e8ddd6',
  fontFamily: "'DM Sans', 'Segoe UI', sans-serif", fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color .2s, box-shadow .2s', lineHeight: 1.5,
};

export function chipStyle(active, color) {
  return {
    padding: '8px 15px',
    border: `1px solid ${active ? color : '#3a3634'}`,
    borderRadius: 8,
    background: active ? `${color}14` : 'transparent',
    color: active ? color : '#6b5e58',
    cursor: 'pointer',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    fontSize: 12.5, fontWeight: active ? 600 : 400,
    transition: 'all .18s', letterSpacing: '.01em',
    boxShadow: active ? `0 0 0 1px ${color}22, 0 2px 8px ${color}14` : 'none',
  };
}

export function primaryBtn(color, glow) {
  return {
    padding: '12px 28px', border: 'none', borderRadius: 9,
    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
    color: '#1c1917', fontWeight: 700, fontSize: 13,
    cursor: 'pointer', fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    marginTop: 6,
    boxShadow: `0 4px 20px ${glow}, 0 1px 0 rgba(255,255,255,.1) inset`,
    transition: 'all .2s', display: 'inline-flex', alignItems: 'center', gap: 8,
    letterSpacing: '.03em',
  };
}

export default {};
