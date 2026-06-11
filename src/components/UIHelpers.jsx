import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { cn } from '../lib/utils.js';

export function Label({ children, htmlFor, className }) {
  return (
    <label htmlFor={htmlFor} className={cn('block uppercase tracking-wider text-xs font-semibold text-base-200 mb-2', className)}>
      {children}
    </label>
  );
}

export function Field({ children, className, style }) {
  return <div className={cn('mb-5', className)} style={style}>{children}</div>;
}

export function CardHeader({ icon: Icon, color, title, subtitle }) {
  return (
    <div className="flex items-start gap-4 mb-7 pb-[22px] border-b border-base-500">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: `linear-gradient(135deg, ${color}18, ${color}08)`,
          border: `1px solid ${color}28`,
          boxShadow: `0 2px 12px ${color}18`,
        }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="pt-0.5">
        <div className="font-display text-xl font-semibold text-base-50 mb-1 leading-tight" style={{ letterSpacing: '-.25px' }}>
          {title}
        </div>
        <div className="text-sm text-base-200 leading-relaxed max-w-[520px]">
          {subtitle}
        </div>
      </div>
    </div>
  );
}

export function WordCount({ text, accent }) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  if (!chars) return null;
  return (
    <div className="text-right text-[10.5px] text-base-300 mt-1">
      <span style={{ color: words > 0 ? accent : undefined }}>{words}w</span>
      <span className="mx-1 opacity-40">·</span>
      {chars}c
    </div>
  );
}

export function AutoTextarea({ value, onChange, onKeyDown, placeholder, minRows = 2, style, className }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, minRows * 24 + 22) + 'px';
  }, [value, minRows]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={minRows}
      className={cn('w-full bg-base-600 rounded-lg px-3.5 py-[11px] text-base-50 font-sans text-sm outline-none border border-base-500 transition-colors', className)}
      style={{ ...style, resize: 'none', overflow: 'hidden' }}
    />
  );
}

export const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 9,
  border: '1px solid #343028',
  background: '#282422',
  color: '#ede0d8',
  fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color .2s, box-shadow .2s',
  lineHeight: 1.5,
};

export function chipStyle(active, color) {
  return {
    padding: '8px 15px',
    border: `1px solid ${active ? color : '#343028'}`,
    borderRadius: 8,
    background: active ? `${color}14` : 'transparent',
    color: active ? color : '#6b5e58',
    cursor: 'pointer',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    fontSize: 12.5,
    fontWeight: active ? 600 : 400,
    transition: 'all .18s',
    letterSpacing: '.01em',
    boxShadow: active ? `0 0 0 1px ${color}22, 0 2px 8px ${color}14` : 'none',
  };
}

export function secondaryBtn(color) {
  return {
    padding: '8px 20px',
    borderRadius: 8,
    border: `1px solid ${color}44`,
    background: 'transparent',
    color: color,
    fontWeight: 600,
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    marginTop: 10,
    marginRight: 8,
    transition: 'all .18s',
    letterSpacing: '.03em',
  };
}

export function primaryBtn(color, glow) {
  return {
    padding: '12px 28px',
    border: 'none',
    borderRadius: 9,
    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
    color: '#1c1917',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    marginTop: 6,
    boxShadow: `0 4px 20px ${glow}, 0 1px 0 rgba(255,255,255,.1) inset`,
    transition: 'all .2s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    letterSpacing: '.03em',
  };
}

export function CustomDropdown({ options, value, onChange, style, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className={cn('relative', className)} style={style}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between cursor-pointer text-left',
          'bg-base-600 border border-base-500 text-base-50 rounded-lg px-3.5 py-[11px] font-sans text-sm outline-none transition-colors',
        )}
      >
        {selected ? selected.label : ''}
        <ChevronDownIcon className={cn('w-4 h-4 text-base-300 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-0.5 bg-base-600 border border-base-500 rounded-lg max-h-[280px] overflow-y-auto py-1">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn(
                'block w-full text-left px-3 py-1.5 text-sm font-sans border-none cursor-pointer transition-colors',
                value === o.value
                  ? 'bg-accent-sage text-base-900'
                  : 'text-base-100 hover:bg-base-500',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
