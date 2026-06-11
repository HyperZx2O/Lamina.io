import React from 'react';

export default function PanelCard({ children, color = '#9cc4b2' }) {
  return (
    <div className="mt-7 animate-fade-in">
      <div
        className="h-[3px] rounded-t-[3px]"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}20, transparent)`, transition: 'background 0.3s ease' }}
      />
      <div
        className="bg-base-700 border border-base-500 border-t-0 rounded-b-2xl p-6 pb-7 shadow-card panel-glow"
        style={{ '--tab-color': color }}
      >
        {children}
      </div>
    </div>
  );
}
