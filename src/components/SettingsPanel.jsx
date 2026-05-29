import React, { useState } from 'react';
import { CardHeader, Field, Label, inputStyle, primaryBtn } from './UIHelpers.jsx';

// Local helpers (small wrappers to match App.jsx behavior)
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
    <>
      <CardHeader icon="⚙️" color="#7da2f0"
        title={bn ? 'সেটিংস' : 'Settings'}
        subtitle={bn ? 'সাইট সেটিংস এবং API কী এখানে কনফিগার করুন।' : 'Configure site settings and (optionally) provide an API key for local use.'} />

      <Field>
        <Label>{bn ? 'Anthropic API কী (ঐচ্ছিক)' : 'Anthropic API Key (optional)'}</Label>
        <input style={inputStyle} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={bn ? 'এখানে আপনার CLAUDE_KEY লিখুন (স্থানীয় only)' : 'Paste your CLAUDE_KEY here (local only)'} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={save} style={primaryBtn('#7da2f0','rgba(125,162,240,.18)')}>{bn ? 'সংরক্ষণ করুন' : 'Save'}</button>
          <button onClick={clearKey} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #3a3634', background: 'transparent', color: '#a89890', cursor: 'pointer' }}>{bn ? 'মুছুন' : 'Clear'}</button>
        </div>
        <div style={{ marginTop: 8, color: '#a89890', fontSize: 12 }}>{bn ? 'নোট: এই কী ব্রাউজারে সংরক্ষিত হবে এবং শুধু আপনার লোকাল অনুরোধে ব্যবহার করা হবে।' : 'Note: this key is stored in your browser and used only for local requests.'}</div>
      </Field>

      <Field>
        <Label>{bn ? 'মডেল ওভাররাইড (ঐচ্ছিক)' : 'Model override (optional)'}</Label>
        <input style={inputStyle} value={model} onChange={e => setModel(e.target.value)} placeholder={bn ? 'উদাহরণ: claude-sonnet-4-6' : 'e.g. claude-sonnet-4-6'} />
        <div style={{ marginTop: 8, color: '#a89890', fontSize: 12 }}>{bn ? 'আপনি ইচ্ছা করলে এখানে মডেল নাম সরাসরি প্রদান করতে পারেন।' : 'Optionally provide a preferred model name to use for requests.'}</div>
      </Field>

      <div style={{ marginTop: 6 }}>
        {message && <div style={{ padding: '10px 12px', background: 'rgba(125,162,240,.06)', border: '1px solid rgba(125,162,240,.12)', borderRadius: 8, color: '#7da2f0' }}>{message}</div>}
      </div>
    </>
  );
}
