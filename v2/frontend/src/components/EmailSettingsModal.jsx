import React, { useState, useEffect } from 'react';
import { X, Mail, Server, Key, User, Check, Eye, EyeOff, AlertCircle, Sparkles, ExternalLink, Send, ShieldCheck, Info } from 'lucide-react';
import { FaEnvelope, FaServer } from 'react-icons/fa';

export default function EmailSettingsModal({ isOpen, onClose, onSaved }) {
  if (!isOpen) return null;

  const [provider, setProvider] = useState('brevo'); // 'brevo' | 'smtp'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Status from backend
  const [configData, setConfigData] = useState(null);

  // Brevo form fields
  const [brevoKey, setBrevoKey] = useState('');
  const [brevoSenderEmail, setBrevoSenderEmail] = useState('');
  const [brevoSenderName, setBrevoSenderName] = useState('RecruitAI Talent Team');
  const [showBrevoKey, setShowBrevoKey] = useState(false);

  // SMTP form fields
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSenderEmail, setSmtpSenderEmail] = useState('');
  const [smtpSenderName, setSmtpSenderName] = useState('RecruitAI Talent Team');
  const [smtpUseTls, setSmtpUseTls] = useState(true);
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState(null);

  // Status message
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/email/settings');
      const data = await res.json();
      if (data.ok) {
        setConfigData(data);
        if (data.provider) setProvider(data.provider);

        // Pre-fill Brevo
        if (data.brevo) {
          setBrevoSenderEmail(data.brevo.sender_email || '');
          setBrevoSenderName(data.brevo.sender_name || 'RecruitAI Talent Team');
          if (data.brevo.sender_email && !testEmail) {
            setTestEmail(data.brevo.sender_email);
          }
        }

        // Pre-fill SMTP
        if (data.smtp) {
          setSmtpHost(data.smtp.host || '');
          setSmtpPort(data.smtp.port || 587);
          setSmtpUser(data.smtp.user || '');
          setSmtpSenderEmail(data.smtp.sender_email || '');
          setSmtpSenderName(data.smtp.sender_name || 'RecruitAI Talent Team');
          setSmtpUseTls(data.smtp.use_tls !== false);
          if (!testEmail && data.smtp.sender_email) {
            setTestEmail(data.smtp.sender_email);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load email settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setFeedback(null);
    setTestResult(null);

    const payload = {
      provider,
      brevo_api_key: brevoKey ? brevoKey.trim() : undefined,
      brevo_sender_email: brevoSenderEmail.trim(),
      brevo_sender_name: brevoSenderName.trim(),
      smtp_host: smtpHost.trim(),
      smtp_port: parseInt(smtpPort, 10) || 587,
      smtp_user: smtpUser.trim(),
      smtp_pass: smtpPass ? smtpPass.trim() : undefined,
      smtp_sender_email: smtpSenderEmail.trim(),
      smtp_sender_name: smtpSenderName.trim(),
      smtp_use_tls: smtpUseTls,
    };

    try {
      const res = await fetch('/api/email/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to save email settings.');
      }

      setFeedback({ type: 'success', message: data.message || 'Settings saved successfully!' });
      setConfigData(data);
      onSaved?.(data);

      setTimeout(() => {
        setFeedback(null);
      }, 3500);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error saving settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail.trim() || !testEmail.includes('@')) {
      setTestResult({ ok: false, message: 'Please enter a valid recipient email to send the test message to.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_email: testEmail.trim(),
          provider: provider,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Test email failed to send.');
      }
      setTestResult({ ok: true, message: data.message || `Test email successfully sent to ${testEmail}!` });
    } catch (err) {
      setTestResult({ ok: false, message: err.message || 'Test email delivery failed.' });
    } finally {
      setTesting(false);
    }
  };

  const isBrevoActive = configData?.provider === 'brevo' && configData?.brevo?.configured;
  const isSmtpActive = configData?.provider === 'smtp' && configData?.smtp?.configured;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '640px', width: '92%', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '12px', 
                background: 'rgba(37, 99, 235, 0.12)', 
                color: 'var(--primary)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)'
              }}
            >
              <Mail size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Email Outreach Dispatch
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Configure Brevo API or your custom SMTP server for 1-click candidate emails
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div 
            style={{ 
              padding: '10px 14px', 
              borderRadius: '8px', 
              marginBottom: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: feedback.type === 'success' ? '#DCFCE7' : '#FEE2E2',
              color: feedback.type === 'success' ? '#166534' : '#991B1B',
              border: feedback.type === 'success' ? '1px solid #86EFAC' : '1px solid #FCA5A5'
            }}
          >
            {feedback.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Dispatch Provider Selection Cards */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Select Active Email Provider
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Brevo Card */}
            <div
              onClick={() => setProvider('brevo')}
              style={{
                cursor: 'pointer',
                padding: '14px',
                borderRadius: '10px',
                border: provider === 'brevo' ? '2px solid var(--primary)' : '1px solid var(--border-medium)',
                background: provider === 'brevo' ? 'var(--primary-light)' : '#FFFFFF',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaEnvelope size={16} style={{ color: provider === 'brevo' ? 'var(--primary)' : '#64748B' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Brevo API</span>
                </div>
                {isBrevoActive ? (
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: '#DCFCE7', color: '#166534', fontWeight: 700 }}>
                    Active
                  </span>
                ) : (
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: '#DBEAFE', color: '#1E40AF', fontWeight: 600 }}>
                    Recommended
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Instant transactional delivery via Brevo v3 REST API. High deliverability.
              </p>
            </div>

            {/* Custom SMTP Card */}
            <div
              onClick={() => setProvider('smtp')}
              style={{
                cursor: 'pointer',
                padding: '14px',
                borderRadius: '10px',
                border: provider === 'smtp' ? '2px solid var(--primary)' : '1px solid var(--border-medium)',
                background: provider === 'smtp' ? 'var(--primary-light)' : '#FFFFFF',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaServer size={15} style={{ color: provider === 'smtp' ? 'var(--primary)' : '#64748B' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Custom SMTP</span>
                </div>
                {isSmtpActive && (
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: '#DCFCE7', color: '#166534', fontWeight: 700 }}>
                    Active
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Connect Gmail, Outlook 365, AWS SES or company mail server directly.
              </p>
            </div>
          </div>
        </div>

        {/* Tab 1: Brevo Settings Form */}
        {provider === 'brevo' && (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={16} style={{ color: '#2563EB', flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Need a free Brevo API key? Create one in your Brevo console.
                </span>
              </div>
              <a 
                href="https://app.brevo.com/settings/keys/api" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ fontSize: '0.76rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>Brevo Keys</span>
                <ExternalLink size={12} />
              </a>
            </div>

            {/* Brevo API Key */}
            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  Brevo API Key (v3) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                {configData?.brevo?.masked_key && (
                  <span style={{ fontSize: '0.74rem', color: '#16A34A', fontWeight: 600 }}>
                    Saved: {configData.brevo.masked_key}
                  </span>
                )}
              </div>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Key className="input-icon" size={16} />
                <input
                  type={showBrevoKey ? 'text' : 'password'}
                  className="form-input"
                  placeholder={configData?.brevo?.configured ? 'Leave blank to keep existing key, or paste new key' : 'xkeysib-xxxxxxxxxxxxxxxx'}
                  value={brevoKey}
                  onChange={(e) => setBrevoKey(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowBrevoKey(!showBrevoKey)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                >
                  {showBrevoKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Sender Email & Name in 2 columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Sender Email (From) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div className="input-with-icon">
                  <Mail className="input-icon" size={16} />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="hr@yourcompany.com"
                    value={brevoSenderEmail}
                    onChange={(e) => setBrevoSenderEmail(e.target.value)}
                    required
                  />
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Must be verified in your Brevo account
                </span>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Sender Name (Display)
                </label>
                <div className="input-with-icon">
                  <User className="input-icon" size={16} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="RecruitAI Talent Team"
                    value={brevoSenderName}
                    onChange={(e) => setBrevoSenderName(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Custom SMTP Form */}
        {provider === 'smtp' && (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <strong>Tip for Gmail users:</strong> Use <code style={{ background: '#E2E8F0', padding: '2px 4px', borderRadius: '4px' }}>smtp.gmail.com</code>, Port 587, and an <strong>App Password</strong> generated from your Google Account security settings.
            </div>

            {/* SMTP Host and Port */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  SMTP Host Server <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div className="input-with-icon">
                  <Server className="input-icon" size={16} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="smtp.gmail.com / mail.domain.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Port
                </label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="587"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  style={{ textAlign: 'center' }}
                />
              </div>
            </div>

            {/* SMTP Username and Password */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  SMTP Username / Login
                </label>
                <div className="input-with-icon">
                  <User className="input-icon" size={16} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="user@domain.com"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    SMTP Password
                  </label>
                  {configData?.smtp?.masked_pass && (
                    <span style={{ fontSize: '0.74rem', color: '#16A34A', fontWeight: 600 }}>
                      Password Saved
                    </span>
                  )}
                </div>
                <div className="input-with-icon" style={{ position: 'relative' }}>
                  <Key className="input-icon" size={16} />
                  <input
                    type={showSmtpPass ? 'text' : 'password'}
                    className="form-input"
                    placeholder={configData?.smtp?.configured ? 'Keep saved password or enter new' : '••••••••'}
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass(!showSmtpPass)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                  >
                    {showSmtpPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Sender Email & Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Sender Email (From) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div className="input-with-icon">
                  <Mail className="input-icon" size={16} />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="talent@company.com"
                    value={smtpSenderEmail}
                    onChange={(e) => setSmtpSenderEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Sender Name (Display)
                </label>
                <div className="input-with-icon">
                  <User className="input-icon" size={16} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="RecruitAI Talent Team"
                    value={smtpSenderName}
                    onChange={(e) => setSmtpSenderName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* TLS Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="smtp-tls"
                checked={smtpUseTls}
                onChange={(e) => setSmtpUseTls(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="smtp-tls" style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Use STARTTLS encryption (recommended for Port 587)
              </label>
            </div>
          </form>
        )}

        {/* Test Email Section */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Verify Delivery with a Test Email
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div className="input-with-icon" style={{ flex: 1 }}>
              <Mail className="input-icon" size={16} />
              <input
                type="email"
                className="form-input"
                placeholder="your.email@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTestEmail}
              disabled={testing}
              style={{ whiteSpace: 'nowrap', padding: '10px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Send size={14} className={testing ? 'animate-spin' : ''} />
              <span>{testing ? 'Sending Test...' : 'Send Test'}</span>
            </button>
          </div>

          {testResult && (
            <div 
              style={{ 
                marginTop: '10px', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                fontSize: '0.82rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                background: testResult.ok ? '#DCFCE7' : '#FEE2E2',
                color: testResult.ok ? '#166534' : '#991B1B',
                border: testResult.ok ? '1px solid #86EFAC' : '1px solid #FCA5A5'
              }}
            >
              {testResult.ok ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 600 }}
          >
            {saving ? <Sparkles size={16} className="animate-spin" /> : <Check size={16} />}
            <span>{saving ? 'Saving Settings...' : 'Save Email Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
