import { useEffect } from 'react';
import FocusTrap from 'focus-trap-react';
import { XMarkIcon } from '@heroicons/react/24/outline';
export default function SettingsModal({ children, onClose, title = 'Settings' }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-900/60"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <FocusTrap>
        <div
          className="relative w-full max-w-lg mx-4 p-6 rounded-2xl bg-base-700 border border-base-500"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-base-50">{title}</h2>
            <button
              onClick={onClose}
              className="text-base-200 hover:text-base-50 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <div>{children}</div>
        </div>
      </FocusTrap>
    </div>
  );
}
