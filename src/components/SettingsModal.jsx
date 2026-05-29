import React, { useEffect } from 'react';
import FocusTrap from 'focus-trap-react';

export default function SettingsModal({ bn, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="lamina-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <FocusTrap>
        <div className="lamina-modal" onMouseDown={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{bn ? 'সেটিংস' : 'Settings'}</div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#a89890', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <div>
            {children}
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
