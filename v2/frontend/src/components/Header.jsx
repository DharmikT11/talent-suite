import React from 'react';
import { Sparkles, Database, RefreshCw, Key, Cpu, Columns, Mail } from 'lucide-react';

export default function Header({ 
  status, 
  emailConfig,
  onOpenSheetModal, 
  onOpenKeyModal, 
  onOpenColumnModal, 
  onOpenEmailModal,
  onRefresh, 
  loading 
}) {
  const isSheetConnected = status?.sheet_connected;
  const hasAiKey = status?.has_ai_key;
  const provider = status?.provider || 'none';

  const providerLabel = provider === 'gemini' 
    ? 'Gemini 2.5' 
    : provider === 'anthropic' 
    ? 'Claude 3.5' 
    : provider === 'openai' 
    ? 'GPT-4o Mini' 
    : 'No AI Key';

  const isEmailConfigured = emailConfig?.is_configured;
  const emailProviderLabel = emailConfig?.provider === 'brevo' ? 'Brevo Mail' : 'SMTP Mail';

  return (
    <header className="navbar">
      <div className="brand-section">
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
        {/* AI Key & Provider Button */}
        <button 
          className="sheet-status-pill"
          style={{ 
            background: hasAiKey ? '#EFF6FF' : '#FEF3C7', 
            borderColor: hasAiKey ? '#BFDBFE' : '#FDE68A',
            color: hasAiKey ? '#1D4ED8' : '#B45309'
          }}
          onClick={onOpenKeyModal}
          title="Click to configure AI Engine & API Key"
        >
          {hasAiKey ? <Cpu size={14} /> : <Key size={14} />}
          <span>
            <strong>{hasAiKey ? `${providerLabel} Active` : 'Configure AI Key'}</strong>
          </span>
        </button>

        {/* Email Setup Button (Brevo / SMTP) */}
        <button
          className="sheet-status-pill"
          style={{
            background: isEmailConfigured ? '#EFF6FF' : '#F8FAFC',
            borderColor: isEmailConfigured ? '#BFDBFE' : '#E2E8F0',
            color: isEmailConfigured ? '#1D4ED8' : '#64748B',
          }}
          onClick={onOpenEmailModal}
          title="Click to configure Brevo API or Custom SMTP email dispatch"
        >
          <Mail size={14} style={{ color: isEmailConfigured ? '#2563EB' : '#64748B' }} />
          <span>
            <strong>
              {isEmailConfigured ? `${emailProviderLabel} Active` : '✉️ Email Setup'}
            </strong>
          </span>
        </button>

        {/* Google Sheet Connection Pill */}
        <button 
          className="sheet-status-pill" 
          onClick={onOpenSheetModal}
          title="Click to configure Google Sheet connection"
        >
          <span className={`pulse-dot ${isSheetConnected ? '' : 'offline'}`} />
          <span>
            {isSheetConnected ? (
              <strong>{status.spreadsheet || 'Google Sheet'} › {status.sheet || 'Tab'}</strong>
            ) : (
              'Connect Google Sheet'
            )}
          </span>
          <Database size={14} style={{ opacity: 0.7 }} />
        </button>

        {/* Sheet Column Setup Button */}
        <button
          className="btn btn-secondary"
          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
          onClick={onOpenColumnModal}
          title="Set up or customize Google Sheet column headers"
        >
          <Columns size={14} style={{ color: '#2563EB' }} />
          <span>Sheet Columns</span>
        </button>

        {/* Refresh Button */}
        <button 
          className="btn btn-secondary" 
          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
          onClick={onRefresh}
          disabled={loading}
          title="Refresh latest candidates from Google Sheet"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>
    </header>
  );
}
