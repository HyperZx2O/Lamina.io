import React from 'react';
import { cn } from '../lib/utils.js';
import {
  BookOpenIcon,
  AcademicCapIcon,
  UserGroupIcon,
  GlobeAltIcon,
  LightBulbIcon,
  QuestionMarkCircleIcon,
  Cog6ToothIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const TAB_ICONS = {
  tutor: AcademicCapIcon,
  teacher: UserGroupIcon,
  multi: GlobeAltIcon,
  answer: LightBulbIcon,
  questions: QuestionMarkCircleIcon,
};

export default function Header({
  bn,
  handleSetLang,
  activeTab,
  handleSetTab,
  TABS,
  sidebarOpen,
  setSidebarOpen,
  setSettingsOpen,
}) {
  const accentColor = activeTab?.color || '#9cc4b2';

  return (
    <header className="sticky top-0 z-50 bg-base-900/90 backdrop-blur-lg border-b border-base-700 overflow-hidden">
      <div className="max-w-[860px] mx-auto">
        <div className="flex items-center justify-between px-5 pt-[14px]">
          <div className="flex items-center gap-[13px]">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-sage to-accent-rose flex items-center justify-center shrink-0 shadow-[0_2px_14px_rgba(156,196,178,0.2)]">
              <BookOpenIcon className="w-5 h-5 text-base-900" />
            </div>
            <div>
              <div className="font-display font-bold text-[23px] tracking-[-.5px] leading-none text-base-50">
                Lamina
                <span className="bg-gradient-to-r from-accent-sage to-accent-rose bg-clip-text text-transparent">.io</span>
              </div>
              <div className="text-[9.5px] text-base-200 mt-[3px] font-semibold tracking-[.12em] uppercase font-sans">
                {bn ? 'বাংলাদেশের জন্য AI শিক্ষা' : 'Adaptive AI Learning \u00B7 Bangladesh'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/docs"
              className="px-3 py-[7px] rounded-lg border border-base-600 text-base-200 no-underline font-bold text-[11px] tracking-[.08em] uppercase font-sans hover:bg-base-700 transition-colors"
            >
              Docs
            </a>

            <div className="flex gap-0.5 bg-base-700 rounded-lg p-[3px] border border-base-600">
              <button
                onClick={() => handleSetLang('en')}
                className={cn(
                  'px-[14px] py-[5px] rounded-md border-none font-bold text-[11px] cursor-pointer font-sans transition-all flex items-center gap-1',
                  !bn
                    ? 'text-base-900 shadow-sm'
                    : 'text-base-300 bg-transparent hover:text-base-100'
                )}
                style={!bn ? {
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`,
                  boxShadow: `0 2px 8px ${accentColor}28`,
                } : undefined}
              >
                EN
              </button>
              <button
                onClick={() => handleSetLang('bn')}
                className={cn(
                  'px-[14px] py-[5px] rounded-md border-none font-bold text-[11px] cursor-pointer font-sans transition-all flex items-center gap-1',
                  bn
                    ? 'text-base-900 shadow-sm'
                    : 'text-base-300 bg-transparent hover:text-base-100'
                )}
                style={bn ? {
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`,
                  boxShadow: `0 2px 8px ${accentColor}28`,
                } : undefined}
              >
                বাং
              </button>
            </div>

            <div className="ml-0.5 flex gap-1.5">
              <button
                aria-label={bn ? 'অধ্যয়ন ইতিহাস' : 'Study History'}
                title={bn ? 'অধ্যয়ন ইতিহাস' : 'Study History'}
                onClick={() => setSidebarOpen((prev) => !prev)}
                className={cn(
                  'p-[6px] rounded-lg border cursor-pointer font-bold transition-all',
                  sidebarOpen ? '' : 'border-base-600 bg-transparent text-base-200 hover:bg-base-700'
                )}
                style={sidebarOpen ? {
                  borderColor: accentColor,
                  background: `${accentColor}12`,
                  color: accentColor,
                } : undefined}
              >
                <ClockIcon className="w-4 h-4" />
              </button>
              <button
                aria-label={bn ? 'সেটিংস' : 'Settings'}
                title={bn ? 'সেটিংস' : 'Settings'}
                onClick={() => setSettingsOpen(true)}
                className="p-[6px] rounded-lg border border-base-600 bg-transparent text-base-200 cursor-pointer font-bold hover:bg-base-700 transition-colors"
              >
                <Cog6ToothIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <nav className="flex gap-0 justify-center overflow-x-auto mt-1.5">
          {TABS.map((t) => {
            const active = activeTab?.id === t.id;
            const Icon = TAB_ICONS[t.id];
            return (
              <button
                key={t.id}
                onClick={() => handleSetTab(t.id)}
                title={bn ? t.bn : t.en}
                aria-label={`${t.en} / ${t.bn}`}
                className={cn(
                  'px-4 py-[10px] border-none bg-transparent cursor-pointer font-sans text-[12.5px] whitespace-nowrap relative top-px tracking-[.01em] transition-[color,border-color] duration-180',
                  active ? 'font-semibold' : 'font-normal text-[#4a4240]'
                )}
                style={{
                  color: active ? t.color : undefined,
                  borderBottom: `2px solid ${active ? t.color : 'transparent'}`,
                }}
              >
                {Icon && <Icon className="w-4 h-4 inline-block align-text-bottom" />}
                <span className="tab-label ml-1">{bn ? t.bn : t.en}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <style>{`@media (max-width: 520px) { .tab-label { display: none; } nav > button { padding: 10px 13px; } }`}</style>
    </header>
  );
}
