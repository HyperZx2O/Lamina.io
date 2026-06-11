import { useState } from 'react';
import { Cog6ToothIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { cn } from '../lib/utils.js';

function savePrefLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
function loadPrefLocal(k, fallback) { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; } }

export default function SettingsPanel({ bn }) {
  const [apiKey, setApiKey] = useState(() => loadPrefLocal('lamina_api_key', ''));
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
        <input
          className="w-full bg-base-600 border border-base-500 text-base-50 rounded px-3 py-2 text-sm placeholder-base-200/60 focus:outline-none focus:border-accent-blue transition-colors"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder={bn ? 'এখানে আপনার CLAUDE_KEY লিখুন (স্থানীয় only)' : 'Paste your CLAUDE_KEY here (local only)'}
        />
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
        />
        <p className="text-xs text-base-200">
          {bn ? 'আপনি ইচ্ছা করলে এখানে মডেল নাম সরাসরি প্রদান করতে পারেন।' : 'Optionally provide a preferred model name to use for requests.'}
        </p>
      </div>

      {message && (
        <div className="px-3 py-2.5 rounded-lg bg-accent-blue/10 border border-accent-blue/15 text-sm text-accent-blue">
          {message}
        </div>
      )}
    </div>
  );
}
