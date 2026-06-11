import React, { useState } from 'react';
import FireIcon from '@heroicons/react/24/outline/FireIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import UserGroupIcon from '@heroicons/react/24/outline/UserGroupIcon';
import GlobeAltIcon from '@heroicons/react/24/outline/GlobeAltIcon';
import LightBulbIcon from '@heroicons/react/24/outline/LightBulbIcon';
import QuestionMarkCircleIcon from '@heroicons/react/24/outline/QuestionMarkCircleIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { cn } from '../lib/utils.js';

export default function RecentActivity({ history = [], setHistory, onClose, onClear, onViewEntry, bn, streak = 0 }) {
  void setHistory; // accepted for API symmetry with future optimistic updates
  const [confirmClear, setConfirmClear] = useState(false);
  const streakNum = (streak && typeof streak === 'object') ? (streak.streak ?? 0) : (Number(streak) || 0);
  const showSidebar = true; // parent controls mount; inner div is always visible
  const setShowSidebar = onClose; // alias for the X button
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString(bn ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getPanelName = (panelId) => {
    switch (panelId) {
      case 'tutor': return bn ? 'অ্যাডাপটিভ টিউটর' : 'Adaptive Tutor';
      case 'teacher': return bn ? 'শিক্ষক সহকারী' : 'Teacher Copilot';
      case 'multi': return bn ? 'বহুভাষিক' : 'Multilingual';
      case 'answer': return bn ? 'উত্তর তৈরি' : 'Generate Answer';
      case 'questions': return bn ? 'কুইজ / প্রশ্ন' : 'Suggest Questions';
      default: return panelId;
    }
  };

  const getPanelIcon = (panelId) => {
    switch (panelId) {
      case 'tutor': return AcademicCapIcon;
      case 'teacher': return UserGroupIcon;
      case 'multi': return GlobeAltIcon;
      case 'answer': return LightBulbIcon;
      case 'questions': return QuestionMarkCircleIcon;
      default: return ClockIcon;
    }
  };

  const getStreakIntensity = () => {
    if (streakNum <= 2) return 'text-accent-rose/50';
    if (streakNum <= 6) return 'text-accent-coral drop-shadow-[0_0_8px_rgba(231,109,131,0.6)]';
    return 'text-accent-gold drop-shadow-[0_0_12px_rgba(240,194,122,0.7)]';
  };

  return (
    <div
      className={cn(
        'h-full w-full flex flex-col bg-base-700 border-l border-base-500 transition-[transform,opacity] duration-300 ease-out',
        showSidebar ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-base-500">
        <div className="flex items-center gap-2 font-sans font-bold text-base text-base-50">
          <ClockIcon className="w-4 h-4 text-base-200" />
          <span>{bn ? 'সম্প্রতি অধ্যয়িত' : 'Recently Studied'}</span>
        </div>
        <button
          onClick={() => setShowSidebar(false)}
          className="p-1 text-base-300 hover:text-base-200 transition-colors"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Streak Counter */}
        <div className="bg-base-800/80 border border-base-500 rounded-xl p-4 text-center space-y-1">
          <div className={cn('flex justify-center', getStreakIntensity())}>
            <FireIcon className="w-7 h-7" />
          </div>
          <div className="text-base text-accent-sage font-bold">
            {bn ? `${streakNum} দিন ধারাবাহিকতা` : `${streakNum}-Day Streak`}
          </div>
          <div className="text-xs text-base-300">
            {bn ? 'আজই শুরু করুন!' : 'Keep it going!'}
          </div>
        </div>

        {/* History List */}
        <div className="space-y-3">
          <div className="text-caption font-bold text-base-300 uppercase">
            {bn ? 'অধ্যয়ন ইতিহাস' : 'Study History'}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-6 px-3 text-base-300 text-xs border border-dashed border-base-500 rounded-lg">
              {bn ? 'কোনো সাম্প্রতিক ইতিহাস নেই' : 'No recent activity yet'}
            </div>
          ) : (
            history.slice(-10).reverse().map((item, index) => {
              const Icon = getPanelIcon(item.panel);
              return (
                <div
                  key={index}
                  onClick={() => onViewEntry && onViewEntry(item)}
                  className="bg-base-800/80 border border-base-500 rounded-lg p-3 flex flex-col gap-1.5 cursor-pointer transition-colors hover:border-accent-sage"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs font-semibold text-accent-sage">
                      <Icon className="w-3.5 h-3.5" />
                      {getPanelName(item.panel)}
                    </span>
                    <span className="text-caption text-base-300">{formatTime(item.timestamp || item.time)}</span>
                  </div>
                  <div className="text-xs text-base-50 font-medium text-break">
                    {item.topic}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      {history.length > 0 && (
        <div className="px-5 py-4 border-t border-base-500">
          {confirmClear ? (
            <div>
              <div className="text-xs text-base-200 mb-3 text-center leading-relaxed">
                {bn ? 'সমস্ত অধ্যয়ন ইতিহাস মুছে ফেলবেন? এটি পূর্বাবস্থায় ফেরানো যাবে না।' : 'Clear all study history? This cannot be undone.'}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmClear(false)}
                  className="flex-1 py-2.5 rounded-lg border border-base-500 bg-transparent text-base-300 font-semibold text-xs cursor-pointer transition-all hover:text-base-50 hover:border-base-400"
                >
                  {bn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  onClick={() => { onClear && onClear(); setConfirmClear(false); }}
                  className="flex-1 py-2.5 rounded-lg border border-accent-coral/40 bg-accent-coral/10 text-accent-coral font-semibold text-xs cursor-pointer transition-all hover:bg-accent-coral/20"
                >
                  {bn ? 'মুছে ফেলুন' : 'Delete'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="w-full py-2.5 rounded-lg border border-base-500 bg-base-800/80 text-base-50 font-semibold text-xs cursor-pointer transition-all hover:border-accent-sage flex items-center justify-center gap-2"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              {bn ? 'ইতিহাস মুছে ফেলুন' : 'Clear History'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
