import React from 'react';

export default function RecentActivity({ history = [], streak = { streak: 0, lastStudied: '' }, bn, onClear, onClose, onViewEntry }) {
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      case 'tutor': return '🎓';
      case 'teacher': return '👩‍🏫';
      case 'multi': return '🌐';
      case 'answer': return '💡';
      case 'questions': return '❓';
      default: return '📝';
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#2e3234',
      borderLeft: '1px solid #424849',
      color: '#d5bbb1',
      fontFamily: "'DM Sans', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid #424849'
      }}>
        <div style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⏳</span> {bn ? 'সম্প্রতি অধ্যয়িত' : 'Recently Studied'}
        </div>
        <button onClick={onClose} style={{
          background: 'transparent',
          border: 'none',
          color: '#7a6d69',
          cursor: 'pointer',
          fontSize: 16,
          padding: 4
        }}>✕</button>
      </div>

      {/* Content Container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* Streak Counter */}
        <div style={{
          background: '#252829',
          border: '1px solid #424849',
          borderRadius: 12,
          padding: '16px',
          marginBottom: 20,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🔥</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#9cc4b2' }}>
            {bn ? `${streak.streak} দিন ধারাবাহিকতা` : `${streak.streak}-Day Streak`}
          </div>
          <div style={{ fontSize: 11, color: '#7a6d69', marginTop: 4 }}>
            {streak.lastStudied 
              ? (bn ? `সর্বশেষ পড়াশোনা: ${new Date(streak.lastStudied).toLocaleDateString()}` : `Last active: ${new Date(streak.lastStudied).toLocaleDateString()}`)
              : (bn ? 'আজই শুরু করুন!' : 'Start your streak today!')}
          </div>
        </div>

        {/* Recent History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#7a6d69', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {bn ? 'অধ্যয়ন ইতিহাস (সর্বোচ্চ ১০)' : 'Study History (Last 10)'}
          </div>

          {history.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '24px 12px',
              color: '#7a6d69',
              fontSize: 13,
              border: '1px dashed #424849',
              borderRadius: 8
            }}>
              {bn ? 'কোনো সাম্প্রতিক ইতিহাস নেই' : 'No recent activity yet'}
            </div>
          ) : (
            history.map((item, index) => (
              <div key={index} onClick={() => onViewEntry && onViewEntry(item)} style={{
                background: '#252829',
                border: '1px solid #424849',
                borderRadius: 8,
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                cursor: 'pointer',
                transition: 'border-color 0.15s'
              }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#9cc4b2'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#424849'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#9cc4b2', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>{getPanelIcon(item.panel)}</span> {getPanelName(item.panel)}
                  </span>
                  <span style={{ fontSize: 10, color: '#7a6d69' }}>{formatTime(item.timestamp)}</span>
                </div>
                <div style={{ fontSize: 13, color: '#d5bbb1', wordBreak: 'break-word', fontWeight: 500 }}>
                  {item.topic}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer / Actions */}
      {history.length > 0 && (
        <div style={{ padding: '16px 20px', borderTop: '1px solid #424849' }}>
          <button 
            onClick={onClear} 
            style={{
              width: '100%',
              padding: '10px 0',
              borderRadius: 8,
              border: '1px solid #424849',
              background: '#252829',
              color: '#d5bbb1',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#9cc4b2'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#424849'}
          >
            🗑 {bn ? 'ইতিহাস মুছে ফেলুন' : 'Clear History'}
          </button>
        </div>
      )}
    </div>
  );
}
