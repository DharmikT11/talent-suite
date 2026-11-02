import React, { useState, useEffect } from 'react';
import { 
  X, Key, Database, Mail, Columns, ShieldCheck, 
  Sparkles, Check, AlertCircle, Eye, EyeOff, 
  ExternalLink, Copy, ChevronDown, ChevronUp, Send, Loader2
} from 'lucide-react';
import { FaLinkedin, FaGithub, FaEnvelope, FaServer } from 'react-icons/fa';

export default function SecretAdminModal({ 
  isOpen, 
  onClose, 
  status, 
  emailConfig, 
  onKeySaved, 
  onSheetConnected, 
  onEmailSaved, 
  onColumnsUpdated 
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('key'); // 'key' | 'sheet' | 'email' | 'columns'

  // ==========================================
  // TAB 1: AI Engine & Key State
  // ==========================================
  const [provider, setProvider] = useState(status?.provider && status.provider !== 'none' ? status.provider : 'gemini');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [keySuccess, setKeySuccess] = useState('');

  const handleSaveKey = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setKeyError('Please paste your API key.');
      return;
    }
    setIsSavingKey(true);
    setKeyError('');
    setKeySuccess('');
    try {
      const res = await fetch('/api/settings/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, api_key: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to save API key');
      setKeySuccess(data.message || 'API key saved and activated!');
      onKeySaved?.(provider);
      setApiKey('');
    } catch (err) {
      setKeyError(err.message || 'Error saving API key.');
    } finally {
      setIsSavingKey(false);
    }
  };

  // ==========================================
  // TAB 2: Google Sheet State
  // ==========================================
  const [sheetUrl, setSheetUrl] = useState(status?.sheet_url || '');
  const [accessKey, setAccessKey] = useState('');
  const [isConnectingSheet, setIsConnectingSheet] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [sheetSuccess, setSheetSuccess] = useState('');
  const [showAppsScript, setShowAppsScript] = useState(false);
  const [appsScriptCode, setAppsScriptCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    fetch('/api/apps-script-code')
      .then(res => res.json())
      .then(data => { if (data.ok && data.code) setAppsScriptCode(data.code); })
      .catch(() => {});
  }, []);

  const handleConnectSheet = async (e) => {
    e.preventDefault();
    if (!sheetUrl.trim()) {
      setSheetError('Please enter your Google Apps Script Web App URL.');
      return;
    }
    setIsConnectingSheet(true);
    setSheetError('');
    setSheetSuccess('');
    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sheetUrl.trim(), access_key: accessKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Connection failed');
      setSheetSuccess(`Connected to ${data.spreadsheet || 'Google Sheet'} (${data.candidate_count || 0} candidates synced)`);
      onSheetConnected?.(data);
    } catch (err) {
      setSheetError(err.message || 'Could not connect to Google Sheet.');
    } finally {
      setIsConnectingSheet(false);
    }
  };

  const copyAppsScript = () => {
    if (!appsScriptCode) return;
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ==========================================
  // TAB 3: Email Setup State
  // ==========================================
  const [emailProvider, setEmailProvider] = useState(emailConfig?.provider || 'brevo');
  const [brevoKey, setBrevoKey] = useState('');
  const [brevoSenderEmail, setBrevoSenderEmail] = useState(emailConfig?.brevo?.sender_email || '');
  const [brevoSenderName, setBrevoSenderName] = useState(emailConfig?.brevo?.sender_name || 'RecruitAI Talent Team');
  const [showBrevoKey, setShowBrevoKey] = useState(false);
  const [smtpHost, setSmtpHost] = useState(emailConfig?.smtp?.host || '');
  const [smtpPort, setSmtpPort] = useState(emailConfig?.smtp?.port || 587);
  const [smtpUser, setSmtpUser] = useState(emailConfig?.smtp?.user || '');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSenderEmail, setSmtpSenderEmail] = useState(emailConfig?.smtp?.sender_email || '');
  const [smtpSenderName, setSmtpSenderName] = useState(emailConfig?.smtp?.sender_name || 'RecruitAI Talent Team');
  const [smtpUseTls, setSmtpUseTls] = useState(emailConfig?.smtp?.use_tls !== false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState(null);

  const handleSaveEmail = async (e) => {
    if (e) e.preventDefault();
    setIsSavingEmail(true);
    setEmailFeedback(null);
    try {
      const payload = {
        provider: emailProvider,
        brevo_api_key: brevoKey.trim() || undefined,
        brevo_sender_email: brevoSenderEmail.trim(),
        brevo_sender_name: brevoSenderName.trim(),
        smtp_host: smtpHost.trim(),
        smtp_port: parseInt(smtpPort, 10) || 587,
        smtp_user: smtpUser.trim(),
        smtp_pass: smtpPass.trim() || undefined,
        smtp_sender_email: smtpSenderEmail.trim(),
        smtp_sender_name: smtpSenderName.trim(),
        smtp_use_tls: smtpUseTls,
      };
      const res = await fetch('/api/email/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to save email settings');
      setEmailFeedback({ type: 'success', text: 'Email delivery settings saved successfully!' });
      onEmailSaved?.(data);
    } catch (err) {
      setEmailFeedback({ type: 'error', text: err.message || 'Error saving email settings.' });
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setEmailFeedback({ type: 'error', text: 'Please enter a valid test recipient email.' });
      return;
    }
    setIsTestingEmail(true);
    setEmailFeedback(null);
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_email: testEmail.trim(), provider: emailProvider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Test email failed');
      setEmailFeedback({ type: 'success', text: `Test email successfully delivered to ${testEmail.trim()}!` });
    } catch (err) {
      setEmailFeedback({ type: 'error', text: err.message || 'Test email delivery failed.' });
    } finally {
      setIsTestingEmail(false);
    }
  };

  // ==========================================
  // TAB 4: Sheet Columns State
  // ==========================================
  const DEFAULT_COLS = ["Applicant Name", "Email", "Phone", "Current Title", "Years of Experience", "Skills"];
  const OPTIONAL_COLS = ["Current Company", "Location", "Highest Education", "Notice Period", "Expected Salary", "LinkedIn URL"];
  const AUTO_COLS = ["Date Added", "Source File", "Status", "CV Link"];
  const [selectedCols, setSelectedCols] = useState([...DEFAULT_COLS, "Current Company", "Location"]);
  const [includeAuto, setIncludeAuto] = useState(true);
  const [customCols, setCustomCols] = useState('');
  const [isSubmittingCols, setIsSubmittingCols] = useState(false);
  const [colFeedback, setColFeedback] = useState(null);

  const toggleCol = (col) => {
    if (selectedCols.includes(col)) {
      setSelectedCols(selectedCols.filter(c => c !== col));
    } else {
      setSelectedCols([...selectedCols, col]);
    }
  };

  const handleApplyColumns = async () => {
    const extra = customCols.split(',').map(c => c.trim()).filter(Boolean);
    const combined = Array.from(new Set([...selectedCols, ...extra, ...(includeAuto ? AUTO_COLS : [])]));
    if (combined.length === 0) {
      setColFeedback({ type: 'error', text: 'Please select at least one column.' });
      return;
    }
    setIsSubmittingCols(true);
    setColFeedback(null);
    try {
      const res = await fetch('/api/columns/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers: combined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update columns');
      setColFeedback({ type: 'success', text: `Updated ${combined.length} columns in Google Sheet!` });
      onColumnsUpdated?.(combined);
    } catch (err) {
      setColFeedback({ type: 'error', text: err.message || 'Failed to apply columns to Google Sheet.' });
    } finally {
      setIsSubmittingCols(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '680px', width: '94%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Enterprise Admin Console
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                System Credentials & Core Integrations (Shortcut: <kbd style={{ padding: '1px 5px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '0.74rem' }}>Ctrl+Shift+K</kbd>)
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={activeTab === 'key' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setActiveTab('key')}
          >
            <Key size={13} />
            <span>AI Engine & Key</span>
          </button>

          <button
            type="button"
            className={activeTab === 'sheet' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setActiveTab('sheet')}
          >
            <Database size={13} />
            <span>Google Sheet Sync</span>
          </button>

          <button
            type="button"
            className={activeTab === 'email' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setActiveTab('email')}
          >
            <Mail size={13} />
            <span>Email Delivery</span>
          </button>

          <button
            type="button"
            className={activeTab === 'columns' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setActiveTab('columns')}
          >
            <Columns size={13} />
            <span>Sheet Columns</span>
          </button>
        </div>

        {/* TAB 1: AI Engine & Key */}
        {activeTab === 'key' && (
          <form onSubmit={handleSaveKey} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                Select AI Engine
              </label>
              <div className="provider-grid">
                {[
                  { id: 'gemini', label: 'Google Gemini', sub: 'Fast & Free' },
                  { id: 'anthropic', label: 'Claude', sub: '3.5 Haiku' },
                  { id: 'openai', label: 'OpenAI', sub: 'GPT-4o Mini' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`btn ${provider === p.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flexDirection: 'column', padding: '10px 8px', textAlign: 'center', gap: '2px' }}
                    onClick={() => setProvider(p.id)}
                  >
                    <span style={{ fontSize: '0.825rem', fontWeight: 700 }}>{p.label}</span>
                    <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>{p.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {provider === 'gemini' ? 'Google AI Studio API Key' : provider === 'anthropic' ? 'Anthropic API Key' : 'OpenAI API Key'}
                </label>
                {status?.masked_key && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
                    Active: {status.masked_key}
                  </span>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <input 
                  type={showKey ? 'text' : 'password'}
                  className="search-input"
                  style={{ 
                    background: 'var(--bg-elevated)', 
                    border: '1px solid var(--border-medium)', 
                    borderRadius: '8px', 
                    padding: '10px 42px 10px 14px', 
                    fontSize: '0.875rem' 
                  }}
                  placeholder={provider === 'gemini' ? 'AIzaSy...' : provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {provider === 'gemini' && (
                <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Don't have a key?{' '}
                  <a 
                    href="https://aistudio.google.com/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                  >
                    <span>Get a free Gemini API key</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              )}
            </div>

            {keyError && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: '#DC2626', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{keyError}</span>
              </div>
            )}

            {keySuccess && (
              <div style={{ padding: '10px 14px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: '#059669', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} />
                <span>{keySuccess}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ padding: '10px', marginTop: '6px', fontWeight: 700 }}
              disabled={isSavingKey || !apiKey.trim()}
            >
              <Sparkles size={16} />
              <span>{isSavingKey ? 'Activating Key...' : 'Save & Activate AI Key'}</span>
            </button>
          </form>
        )}

        {/* TAB 2: Google Sheet */}
        {activeTab === 'sheet' && (
          <form onSubmit={handleConnectSheet} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Apps Script Web App URL (ends with /exec)
              </label>
              <input 
                type="text" 
                className="search-input"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.875rem' }}
                placeholder="https://script.google.com/macros/s/.../exec"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Access Key (Optional)
              </label>
              <input 
                type="password" 
                className="search-input"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.875rem' }}
                placeholder="Leave blank if not set in Code.gs"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
              />
            </div>

            {sheetError && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-bg)', color: '#DC2626', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{sheetError}</span>
              </div>
            )}

            {sheetSuccess && (
              <div style={{ padding: '10px 14px', background: 'var(--success-bg)', color: '#059669', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} />
                <span>{sheetSuccess}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px', fontWeight: 700 }}
              disabled={isConnectingSheet}
            >
              <span>{isConnectingSheet ? 'Verifying Connection...' : 'Connect & Test Google Sheet'}</span>
            </button>

            {/* Collapsible Apps Script setup instructions */}
            <div style={{ marginTop: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', fontWeight: 600 }}
                onClick={() => setShowAppsScript(!showAppsScript)}
              >
                <span>Google Apps Script Setup Code</span>
                {showAppsScript ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showAppsScript && (
                <div style={{ marginTop: '10px', background: 'var(--bg-elevated)', padding: '14px', borderRadius: '8px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Code.gs (Google Apps Script)</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={copyAppsScript}
                    >
                      <Copy size={12} />
                      <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                  <pre style={{ maxHeight: '160px', overflowY: 'auto', background: '#0F172A', color: '#F8FAFC', padding: '10px', borderRadius: '6px', fontSize: '0.74rem' }}>
                    {appsScriptCode || '// Loading code...'}
                  </pre>
                </div>
              )}
            </div>
          </form>
        )}

        {/* TAB 3: Email Setup */}
        {activeTab === 'email' && (
          <form onSubmit={handleSaveEmail} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="provider-grid">
              <button
                type="button"
                className={`btn ${emailProvider === 'brevo' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => setEmailProvider('brevo')}
              >
                <FaEnvelope size={14} />
                <span>Brevo API (Recommended)</span>
              </button>
              <button
                type="button"
                className={`btn ${emailProvider === 'smtp' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => setEmailProvider('smtp')}
              >
                <FaServer size={14} />
                <span>Custom SMTP Server</span>
              </button>
            </div>

            {emailProvider === 'brevo' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Brevo API Key
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showBrevoKey ? 'text' : 'password'}
                      className="search-input"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '8px 36px 8px 12px', fontSize: '0.84rem' }}
                      placeholder="xkeysib-xxxxxxxxxxxxxxxxxxxx"
                      value={brevoKey}
                      onChange={(e) => setBrevoKey(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowBrevoKey(!showBrevoKey)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      {showBrevoKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Sender Email (Verified in Brevo)
                    </label>
                    <input
                      type="email"
                      className="search-input"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.84rem' }}
                      placeholder="recruitment@yourcompany.com"
                      value={brevoSenderEmail}
                      onChange={(e) => setBrevoSenderEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Sender Name
                    </label>
                    <input
                      type="text"
                      className="search-input"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.84rem' }}
                      value={brevoSenderName}
                      onChange={(e) => setBrevoSenderName(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      SMTP Server Host
                    </label>
                    <input
                      type="text"
                      className="search-input"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.84rem' }}
                      placeholder="smtp.gmail.com or mail.domain.com"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Port
                    </label>
                    <input
                      type="number"
                      className="search-input"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.84rem' }}
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      SMTP Username
                    </label>
                    <input
                      type="text"
                      className="search-input"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.84rem' }}
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      SMTP Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showSmtpPass ? 'text' : 'password'}
                        className="search-input"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '8px 36px 8px 12px', fontSize: '0.84rem' }}
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpPass(!showSmtpPass)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        {showSmtpPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {emailFeedback && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: emailFeedback.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                color: emailFeedback.type === 'success' ? '#166534' : '#991B1B',
                border: `1px solid ${emailFeedback.type === 'success' ? '#86EFAC' : '#FCA5A5'}`
              }}>
                {emailFeedback.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                <span>{emailFeedback.text}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, padding: '9px', fontWeight: 700 }}
                disabled={isSavingEmail}
              >
                <span>{isSavingEmail ? 'Saving...' : 'Save Email Config'}</span>
              </button>
            </div>

            {/* Test Email Section */}
            <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', gap: '8px' }}>
              <input
                type="email"
                className="search-input"
                style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '6px 12px', fontSize: '0.82rem' }}
                placeholder="Send verification test email to..."
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                onClick={handleSendTestEmail}
                disabled={isTestingEmail || !testEmail}
              >
                {isTestingEmail ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>{isTestingEmail ? 'Sending...' : 'Send Test'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: Columns Setup */}
        {activeTab === 'columns' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Choose which candidate data columns to synchronize into your Google Sheet:
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[...DEFAULT_COLS, ...OPTIONAL_COLS].map((col) => (
                <button
                  key={col}
                  type="button"
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    background: selectedCols.includes(col) ? 'var(--primary-light)' : '#FFFFFF',
                    color: selectedCols.includes(col) ? 'var(--primary)' : 'var(--text-secondary)',
                    borderColor: selectedCols.includes(col) ? 'var(--primary)' : 'var(--border-subtle)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  onClick={() => toggleCol(col)}
                >
                  {selectedCols.includes(col) && <Check size={12} />}
                  <span>{col}</span>
                </button>
              ))}
            </div>

            {colFeedback && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: colFeedback.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                color: colFeedback.type === 'success' ? '#166534' : '#991B1B',
                border: `1px solid ${colFeedback.type === 'success' ? '#86EFAC' : '#FCA5A5'}`
              }}>
                {colFeedback.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                <span>{colFeedback.text}</span>
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '10px', fontWeight: 700 }}
              onClick={handleApplyColumns}
              disabled={isSubmittingCols}
            >
              <span>{isSubmittingCols ? 'Syncing Headers...' : 'Save & Sync Sheet Columns'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
