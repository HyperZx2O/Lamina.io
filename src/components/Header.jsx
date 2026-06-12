import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils.js';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import UserGroupIcon from '@heroicons/react/24/outline/UserGroupIcon';
import GlobeAltIcon from '@heroicons/react/24/outline/GlobeAltIcon';
import LightBulbIcon from '@heroicons/react/24/outline/LightBulbIcon';
import QuestionMarkCircleIcon from '@heroicons/react/24/outline/QuestionMarkCircleIcon';
import Cog6ToothIcon from '@heroicons/react/24/outline/Cog6ToothIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import SunIcon from '@heroicons/react/24/outline/SunIcon';
import MoonIcon from '@heroicons/react/24/outline/MoonIcon';

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
  intro = false,
  theme = 'dark',
  onToggleTheme,
}) {
  const accentColor = activeTab?.color || '#9cc4b2';
  const navRef = useRef(null);
  const [overflowLeft, setOverflowLeft] = useState(false);
  const [overflowRight, setOverflowRight] = useState(false);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const check = () => {
      setOverflowLeft(el.scrollLeft > 2);
      setOverflowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    };
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', check); ro.disconnect(); };
  }, []);

  return (
    <header
      className="sticky top-0 z-50 overflow-hidden app-header"
      style={{ '--header-accent': accentColor }}
      data-intro={intro ? 'true' : 'false'}
    >
      <div className="max-w-[860px] mx-auto" data-intro={intro ? 'true' : 'false'}>
        <div className="flex items-center justify-between px-6 pt-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-sage to-accent-rose flex items-center justify-center shrink-0 shadow-[0_2px_14px_rgba(156,196,178,0.2)] lamina-logo-tile"
              aria-hidden="true"
            >
              <img
                src="/lamina-logo.svg"
                alt=""
                width="24"
                height="24"
                className="lamina-logo-mark"
                draggable="false"
              />
            </div>
            <div>
              <div className="font-display font-bold text-heading tracking-[-.5px] text-base-50">
                Lamina
                <span className="bg-gradient-to-r from-accent-sage to-accent-rose bg-clip-text text-transparent">.io</span>
              </div>
              <div className="text-caption text-base-200 mt-[3px] font-semibold tracking-[.12em] uppercase font-sans">
                {bn ? 'বাংলাদেশের জন্য AI শিক্ষা' : 'Adaptive AI Learning \u00B7 Bangladesh'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <a
              href="/docs"
              className="hidden sm:inline-flex px-3 py-1.5 rounded-lg border border-base-600 text-base-200 no-underline font-bold text-caption tracking-[.08em] uppercase font-sans hover:bg-base-700 transition-colors"
            >
              Docs
            </a>

            <div className="flex gap-0.5 bg-base-700 rounded-lg p-[3px] border border-base-600">
              <button
                onClick={() => handleSetLang('en')}
                className={cn(
                  'px-3.5 py-1 rounded-md border-none font-bold text-caption cursor-pointer font-sans transition-all flex items-center gap-1',
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
                  'px-[14px] py-[5px] rounded-md border-none font-bold text-caption cursor-pointer font-sans transition-all flex items-center gap-1',
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

            <a
              href="/docs"
              className="sm:hidden p-[6px] rounded-lg border border-base-600 bg-transparent text-base-200 no-underline cursor-pointer font-bold hover:bg-base-700 transition-colors"
              aria-label="Docs"
              title="Docs"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </a>
            <div className="ml-0.5 flex gap-1.5">
              <button
                aria-label={theme === 'dark' ? (bn ? 'লাইট মোডে পরিবর্তন করুন' : 'Switch to light mode') : (bn ? 'ডার্ক মোডে পরিবর্তন করুন' : 'Switch to dark mode')}
                title={theme === 'dark' ? (bn ? 'লাইট মোড' : 'Light mode') : (bn ? 'ডার্ক মোড' : 'Dark mode')}
                onClick={onToggleTheme}
                className="p-[6px] rounded-lg border border-base-600 bg-transparent text-base-200 cursor-pointer font-bold hover:bg-base-700 transition-colors"
              >
                {theme === 'dark'
                  ? <SunIcon className="w-4 h-4" />
                  : <MoonIcon className="w-4 h-4" />}
              </button>
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

        <nav
          ref={navRef}
          className="flex gap-0 justify-start sm:justify-center overflow-x-auto mt-1.5 tab-strip"
          data-overflow-left={overflowLeft ? 'true' : 'false'}
          data-overflow-right={overflowRight ? 'true' : 'false'}
          data-intro={intro ? 'true' : 'false'}
        >
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
                  'px-4 py-[10px] border-none bg-transparent cursor-pointer font-sans text-secondary whitespace-nowrap relative top-px transition-[color,border-color] duration-180',
                  active ? 'font-semibold' : 'font-normal text-base-400'
                )}
                style={{
                  color: active ? t.color : undefined,
                  borderBottom: `2px solid ${active ? t.color : 'transparent'}`,
                }}
              >
                {Icon && <Icon className="w-4 h-4 inline-block align-text-bottom" />}
                <span className="ml-1 hidden sm:inline">{bn ? t.bn : t.en}</span>
              </button>
            );
          })}
        </nav>
      </div>

    </header>
  );
}
