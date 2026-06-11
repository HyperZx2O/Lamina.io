import { useEffect } from 'react';
import FocusTrap from 'focus-trap-react';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';

export default function SettingsModal({ children, onClose, title = 'Settings', accent = '#7da2f0' }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-900/45 backdrop-blur-[6px] settings-modal-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <FocusTrap>
        <div
          className="settings-modal-card relative w-full max-w-2xl mx-4 rounded-2xl bg-base-700/90 border border-base-500/80 panel-glow animate-modal-in"
          style={{ '--tab-color': accent }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Top edge accent — mirrors PanelCard's top stripe so it reads as the same family */}
          <div
            className="h-[3px] rounded-t-[14px]"
            style={{ background: `linear-gradient(90deg, ${accent}, ${accent}33, transparent)` }}
            aria-hidden="true"
          />
          <div className="px-7 pt-5 pb-7 sm:px-8 sm:pt-6 sm:pb-8">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-caption text-base-300 uppercase tracking-widest font-sans font-bold">
                  {title}
                </div>
                <div className="text-caption text-base-400 mt-1 font-sans">
                  Stored locally · never sent to a server
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close settings"
                className="settings-modal-close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div>{children}</div>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
