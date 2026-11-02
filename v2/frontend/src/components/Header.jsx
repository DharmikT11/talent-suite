import React, { useState } from 'react';
import { Sparkles, RefreshCw, Lock } from 'lucide-react';

export default function Header({ 
  status, 
  onOpenSecretAdmin,
  onRefresh, 
  loading 
}) {
  const [clickCount, setClickCount] = useState(0);

  const handleBrandClick = () => {
    const next = clickCount + 1;
    if (next >= 3) {
      setClickCount(0);
      onOpenSecretAdmin?.();
    } else {
      setClickCount(next);
      setTimeout(() => setClickCount(0), 1200);
    }
  };

  return (
    <header className="navbar">
      <div 
        className="brand-section" 
        onClick={handleBrandClick}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        title="RecruitAI Suite (Triple-click or press Ctrl+Shift+K for Admin Console)"
      >
        <div className="brand-logo">
          <Sparkles size={22} />
        </div>
        <div className="brand-text">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h1>RecruitAI Suite</h1>
            <span className="brand-badge">Enterprise</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            AI-Powered Candidate Screening & Pipeline Intelligence
          </p>
        </div>
      </div>

      <div className="nav-controls">
        {/* Enterprise System Online Badge */}
        <div 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            padding: '6px 12px', 
            background: '#F0FDF4', 
            border: '1px solid #BBF7D0', 
            borderRadius: '20px', 
            fontSize: '0.78rem', 
            fontWeight: 700, 
            color: '#166534' 
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A34A', boxShadow: '0 0 0 2px rgba(22, 163, 74, 0.2)' }} />
          <span>Enterprise System Active</span>
        </div>

        {/* Refresh Button */}
        <button 
          className="btn btn-secondary" 
          style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onClick={onRefresh}
          disabled={loading}
          title="Refresh latest candidate pipeline data"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>

        {/* Discreet Secret Admin Trigger */}
        <button
          type="button"
          onClick={onOpenSecretAdmin}
          title="Admin Console (Shortcut: Ctrl + Shift + K)"
          style={{
            background: 'transparent',
            border: 'none',
            padding: '6px 8px',
            cursor: 'pointer',
            opacity: 0.25,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity 0.2s ease',
            color: 'var(--text-muted)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.25'}
        >
          <Lock size={14} />
        </button>
      </div>
    </header>
  );
}
