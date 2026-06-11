import { useState } from 'react';
import Cog6ToothIcon from '@heroicons/react/24/outline/Cog6ToothIcon';
import LockClosedIcon from '@heroicons/react/24/outline/LockClosedIcon';
import EyeIcon from '@heroicons/react/24/outline/EyeIcon';
import EyeSlashIcon from '@heroicons/react/24/outline/EyeSlashIcon';
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import { cn } from '../lib/utils.js';

function savePrefLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
function loadPrefLocal(k, fallback) { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; } }

export default function SettingsPanel({ bn, onReplayIntro }) {
  const [apiKey, setApiKey] = useState(() => loadPrefLocal('lamina_api_key', ''));
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(() => loadPrefLocal('lamina_model_override', ''));
  const [message, setMessage] = useState('');

  const save = () => {
    savePrefLocal('lamina_api_key', apiKey || '');
    savePrefLocal('lamina_model_override', model || '');
    setMessage(bn ? 'সেটিংস সংরক্ষিত' : 'Settings saved');
    setTimeout(() => setMessage(''), 2500);
  };

  const clearKey = () => {
    setApiKey('');
    savePrefLocal('lamina_api_key', '');
    setMessage(bn ? 'API কী মুছে ফেলা হয়েছে' : 'API key removed');
    setTimeout(() => setMessage(''), 2500);
  };

  return (
    <div className={cn('space-y-5')}>
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent-blue/15 text-accent-blue">
          <Cog6ToothIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-base-50">
            {bn ? 'সেটিংস' : 'Settings'}
          </h3>
          <p className="text-sm text-base-200">
            {bn ? 'সাইট সেটিংস এবং API কী এখানে কনফিগার করুন।' : 'Configure site settings and (optionally) provide an API key for local use.'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-base-50">
          <span className="inline-flex items-center gap-1.5">
            <LockClosedIcon className="w-3.5 h-3.5 text-base-200" />
            {bn ? 'Anthropic API কী (ঐচ্ছিক)' : 'Anthropic API Key (optional)'}
          </span>
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            autoComplete="off"
            spellCheck="false"
            className="w-full bg-base-600 border border-base-500 text-base-50 rounded pl-3 pr-10 py-2 text-sm placeholder-base-200/60 focus:outline-none focus:border-accent-blue transition-colors font-mono"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={bn ? 'এখানে আপনার CLAUDE_KEY লিখুন (স্থানীয় only)' : 'Paste your CLAUDE_KEY here (local only)'}
          />
          <button
            type="button"
            onClick={() => setShowKey(s => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-base-200 hover:text-base-50 transition-colors rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
            aria-label={showKey ? (bn ? 'কী লুকান' : 'Hide key') : (bn ? 'কী দেখান' : 'Show key')}
            title={showKey ? (bn ? 'কী লুকান' : 'Hide key') : (bn ? 'কী দেখান' : 'Show key')}
          >
            {showKey ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          </button>
        </div>
        {apiKey && !apiKey.startsWith('sk-ant-') && (
          <p className="text-xs text-amber-400 flex items-center gap-1.5" role="alert">
            <span aria-hidden="true">⚠</span>
            {bn
              ? 'সতর্কতা: Anthropic কীগুলি সাধারণত sk-ant- দিয়ে শুরু হয়'
              : 'Warning: Anthropic keys typically start with "sk-ant-"'}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={save}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-accent-blue text-white hover:brightness-110 transition-all"
          >
            {bn ? 'সংরক্ষণ করুন' : 'Save'}
          </button>
          <button
            onClick={clearKey}
            className="px-4 py-2 text-sm rounded-lg border border-base-500 bg-transparent text-base-200 hover:text-base-50 hover:border-base-400 transition-colors"
          >
            {bn ? 'মুছুন' : 'Clear'}
          </button>
        </div>
        <p className="text-xs text-base-200">
          {bn ? 'নোট: এই কী ব্রাউজারে সংরক্ষিত হবে এবং শুধু আপনার লোকাল অনুরোধে ব্যবহার করা হবে।' : 'Note: this key is stored in your browser and used only for local requests.'}
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-base-50">
          {bn ? 'মডেল ওভাররাইড (ঐচ্ছিক)' : 'Model override (optional)'}
        </label>
        <input
          className="w-full bg-base-600 border border-base-500 text-base-50 rounded px-3 py-2 text-sm placeholder-base-200/60 focus:outline-none focus:border-accent-blue transition-colors"
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder={bn ? 'উদাহরণ: claude-sonnet-4-6' : 'e.g. claude-sonnet-4-6'}
          maxLength={200}
        />
        <p className="text-xs text-base-200">
          {bn ? 'আপনি ইচ্ছা করলে এখানে মডেল নাম সরাসরি প্রদান করতে পারেন।' : 'Optionally provide a preferred model name to use for requests.'}
        </p>
      </div>

      {onReplayIntro && (
        <div className="space-y-2 pt-3 border-t border-base-600">
          <label className="block text-sm font-medium text-base-50">
            <span className="inline-flex items-center gap-1.5">
              <SparklesIcon className="w-3.5 h-3.5 text-accent-sage" />
              {bn ? 'ইন্ট্রো অ্যানিমেশন' : 'Intro animation'}
            </span>
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={onReplayIntro}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-accent-sage/40 bg-accent-sage/10 text-accent-sage hover:bg-accent-sage/15 hover:border-accent-sage/60 transition-all"
            >
              {bn ? 'আবার দেখুন' : 'Replay intro'}
            </button>
            <p className="text-xs text-base-200">
              {bn
                ? 'প্রথম-লোডের অ্যানিমেশন আবার চালান।'
                : 'Re-watch the first-load animation.'}
            </p>
          </div>
        </div>
      )}

      {message && (
        <div className="px-3 py-2.5 rounded-lg bg-accent-blue/10 border border-accent-blue/15 text-sm text-accent-blue">
          {message}
        </div>
      )}
    </div>
  );
}
