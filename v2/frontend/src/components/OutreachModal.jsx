import React, { useState, useEffect } from 'react';
import { X, Sparkles, Copy, Check, ExternalLink, Loader2, Mail, Settings, AlertCircle, Send, CheckCircle2 } from 'lucide-react';
import { FaLinkedin, FaWhatsapp, FaEnvelope, FaPaperPlane } from 'react-icons/fa';
import EmailSettingsModal from './EmailSettingsModal';

export default function OutreachModal({ candidate, roleTitle, jdSummary, onClose, onStatusUpdated }) {
  const [pitches, setPitches] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('linkedin');
  const [copiedKey, setCopiedKey] = useState(null);
  const [error, setError] = useState('');
  const [statusSent, setStatusSent] = useState(false);

  // Email dispatch state
  const [emailConfig, setEmailConfig] = useState(null);
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
  const [sendingDirectEmail, setSendingDirectEmail] = useState(false);
  const [directEmailSuccess, setDirectEmailSuccess] = useState('');
  const [directEmailError, setDirectEmailError] = useState('');

  useEffect(() => {
    fetchEmailSettings();
    if (candidate) {
      generatePitch();
    }
  }, [candidate]);

  const fetchEmailSettings = async () => {
    try {
      const res = await fetch('/api/email/settings');
      const data = await res.json();
      if (data.ok) {
        setEmailConfig(data);
      }
    } catch (err) {
      console.error('Failed to load email settings in OutreachModal:', err);
    }
  };

  const generatePitch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sourcing/pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate,
          job_title: roleTitle || candidate.headline || 'Firmware Engineer',
          jd_summary: jdSummary || 'Firmware & Embedded Systems Engineer opportunity',
          company_name: 'Our Engineering Team',
        }),
      });
      const data = await res.json();
      if (data.ok && data.pitches) {
        setPitches(data.pitches);
      } else {
        setError(data.detail || 'Could not generate outreach pitches.');
      }
    } catch (err) {
      setError(err.message || 'Network error while contacting AI sourcer.');
    } finally {
      setLoading(false);
    }
  };

  const [candidateEmail, setCandidateEmail] = useState(candidate?.email || '');

  const applyUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/apply?role=${encodeURIComponent(roleTitle || 'Firmware Engineer')}&name=${encodeURIComponent(candidate?.name || '')}`
    : '/apply';

  const updateStatusToOutreachSent = async (channel = 'Email') => {
    try {
      await fetch('/api/sourcing/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: candidate?.name || '',
          email: candidateEmail || candidate?.email || '',
          profile_url: candidate?.profile_url || '',
          status: 'Outreach Sent',
          channel: channel,
        }),
      });
      setStatusSent(true);
      onStatusUpdated?.(candidate, channel);
    } catch (e) {
      console.error('Failed to update outreach status:', e);
    }
  };

  const handleSendDirectEmail = async () => {
    if (!pitches) return;
    if (!candidateEmail.trim() || !candidateEmail.includes('@')) {
      setDirectEmailError('Please enter a valid candidate email address to dispatch message.');
      return;
    }

    if (!emailConfig?.is_configured) {
      setIsEmailSettingsOpen(true);
      return;
    }

    setSendingDirectEmail(true);
    setDirectEmailError('');
    setDirectEmailSuccess('');

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_name: candidate?.name || 'Candidate',
          to_email: candidateEmail.trim(),
          subject: pitches.email_subject || 'Exciting Career Opportunity',
          body: pitches.email_body || '',
          profile_url: candidate?.profile_url || '',
          provider: emailConfig?.provider || 'brevo',
          apply_url: applyUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to dispatch email.');
      }

      const prov = (data.provider || emailConfig?.provider || 'brevo').toUpperCase();
      setDirectEmailSuccess(`Cold email successfully sent via ${prov} to ${candidateEmail.trim()}! Pipeline & Sheet updated.`);
      setStatusSent(true);
      onStatusUpdated?.(candidate, `Email (${prov})`);
    } catch (err) {
      setDirectEmailError(err.message || 'Failed to deliver email. Please check your Brevo / SMTP configuration.');
    } finally {
      setSendingDirectEmail(false);
    }
  };

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSendMailto = () => {
    if (!pitches) return;
    const bodyWithLink = pitches.email_body.includes('/apply')
      ? pitches.email_body
      : `${pitches.email_body}\n\n---\nSubmit your CV directly here: ${applyUrl}`;
    
    const mailtoUrl = `mailto:${encodeURIComponent(candidateEmail)}?subject=${encodeURIComponent(pitches.email_subject || '')}&body=${encodeURIComponent(bodyWithLink)}`;
    window.open(mailtoUrl, '_blank');
    updateStatusToOutreachSent('Email (Mailto)');
  };

  const candidateName = candidate?.name || 'Candidate';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '640px', width: '92%' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px' }}>
              <Sparkles size={13} />
              <span>AI Outreach Generator</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Connect with {candidateName}
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
              {candidate?.headline || 'Targeted Candidate Lead'}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Channel Selection Tabs */}
        <div className="modal-channel-tabs" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveTab('linkedin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'linkedin' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
              background: activeTab === 'linkedin' ? 'var(--primary-light)' : 'var(--bg-secondary)',
              color: activeTab === 'linkedin' ? 'var(--primary)' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <FaLinkedin size={15} style={{ color: activeTab === 'linkedin' ? '#0A66C2' : 'inherit' }} />
            <span>LinkedIn Note</span>
          </button>

          <button
            onClick={() => setActiveTab('email')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'email' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
              background: activeTab === 'email' ? 'var(--primary-light)' : 'var(--bg-secondary)',
              color: activeTab === 'email' ? 'var(--primary)' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <FaEnvelope size={14} style={{ color: activeTab === 'email' ? 'var(--primary)' : 'inherit' }} />
            <span>Cold Email</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'whatsapp' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
              background: activeTab === 'whatsapp' ? 'var(--primary-light)' : 'var(--bg-secondary)',
              color: activeTab === 'whatsapp' ? 'var(--primary)' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <FaWhatsapp size={15} style={{ color: activeTab === 'whatsapp' ? '#25D366' : 'inherit' }} />
            <span>WhatsApp / DM</span>
          </button>
        </div>

        {statusSent && (
          <div style={{ padding: '8px 12px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: '6px', color: 'var(--success-text)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
            <Check size={14} />
            <span>Outreach recorded! Status in Google Sheet & Pipeline updated to "Outreach Sent".</span>
          </div>
        )}

        {/* Content Body */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              Tailoring personalized message for {candidateName}...
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Analyzing background against job requirements
            </p>
          </div>
        ) : error ? (
          <div style={{ padding: '16px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '8px', color: 'var(--danger-text)', fontSize: '0.88rem' }}>
            {error}
            <button className="btn btn-secondary" style={{ marginTop: '10px' }} onClick={generatePitch}>
              Try Again
            </button>
          </div>
        ) : pitches ? (
          <div>
            {/* LinkedIn Tab */}
            {activeTab === 'linkedin' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Connection Invite Note ({pitches.linkedin_note?.length || 0} / 300 chars)
                  </span>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    onClick={() => {
                      copyToClipboard(pitches.linkedin_note, 'linkedin');
                      updateStatusToOutreachSent('LinkedIn');
                    }}
                  >
                    {copiedKey === 'linkedin' ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                    <span>{copiedKey === 'linkedin' ? 'Copied & Recorded!' : 'Copy Note'}</span>
                  </button>
                </div>
                <div 
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '14px',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {pitches.linkedin_note}
                </div>
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  {candidate?.profile_url && (
                    <a
                      href={candidate.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ padding: '8px 14px', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => updateStatusToOutreachSent('LinkedIn')}
                    >
                      <FaLinkedin size={15} />
                      <span>Open Profile & Send Invite</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Email Tab */}
            {activeTab === 'email' && (
              <div>
                {/* Email Service Connection Banner */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    marginBottom: '12px',
                    background: emailConfig?.is_configured ? '#F0FDF4' : '#FEF3C7',
                    border: emailConfig?.is_configured ? '1px solid #BBF7D0' : '1px solid #FDE68A',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {emailConfig?.is_configured ? (
                      <CheckCircle2 size={15} style={{ color: '#16A34A', flexShrink: 0 }} />
                    ) : (
                      <AlertCircle size={15} style={{ color: '#D97706', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: emailConfig?.is_configured ? '#166534' : '#92400E' }}>
                      {emailConfig?.is_configured
                        ? `${emailConfig.provider === 'brevo' ? 'Brevo Cloud API Active' : 'Custom SMTP Active'} (${emailConfig.provider === 'brevo' ? emailConfig.brevo?.sender_email : emailConfig.smtp?.sender_email})`
                        : 'Email provider not configured. Setup Brevo or SMTP for 1-click cloud dispatch.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.74rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => setIsEmailSettingsOpen(true)}
                  >
                    <Settings size={12} />
                    <span>{emailConfig?.is_configured ? 'Settings' : 'Configure'}</span>
                  </button>
                </div>

                {/* Direct Email Delivery Alerts */}
                {directEmailSuccess && (
                  <div style={{ padding: '8px 12px', background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '6px', color: '#166534', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <Check size={14} />
                    <span>{directEmailSuccess}</span>
                  </div>
                )}

                {directEmailError && (
                  <div style={{ padding: '8px 12px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '6px', color: '#991B1B', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <AlertCircle size={14} />
                    <span>{directEmailError}</span>
                  </div>
                )}

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    SUBJECT LINE
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1, background: 'var(--bg-primary)', padding: '8px 12px', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 600 }}>
                      {pitches.email_subject}
                    </div>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                      onClick={() => copyToClipboard(pitches.email_subject, 'subject')}
                    >
                      {copiedKey === 'subject' ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>EMAIL BODY</span>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                      onClick={() => {
                        copyToClipboard(pitches.email_body, 'email_body');
                        updateStatusToOutreachSent('Email');
                      }}
                    >
                      {copiedKey === 'email_body' ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                      <span>{copiedKey === 'email_body' ? 'Copied & Recorded!' : 'Copy Email'}</span>
                    </button>
                  </div>
                  <div 
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '14px',
                      fontSize: '0.88rem',
                      lineHeight: '1.6',
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {pitches.email_body}
                  </div>
                </div>

                {/* Candidate Email Input & Dual Action Buttons */}
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="input-with-icon">
                    <Mail className="input-icon" size={15} />
                    <input
                      type="email"
                      className="form-input"
                      style={{ fontSize: '0.84rem' }}
                      placeholder="Candidate email address (e.g. rahul@example.com)"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={handleSendMailto}
                      title="Open default email application (Thunderbird/Outlook/Apple Mail)"
                    >
                      <FaPaperPlane size={12} />
                      <span>Open in Email App</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.84rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={handleSendDirectEmail}
                      disabled={sendingDirectEmail}
                      title="Send directly via Brevo API or SMTP server"
                    >
                      {sendingDirectEmail ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      <span>
                        {sendingDirectEmail
                          ? 'Sending...'
                          : emailConfig?.provider === 'smtp'
                          ? 'Send via SMTP'
                          : 'Send via Brevo API'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* WhatsApp Tab */}
            {activeTab === 'whatsapp' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Direct Message (WhatsApp / Telegram)
                  </span>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    onClick={() => {
                      copyToClipboard(pitches.whatsapp_dm, 'whatsapp');
                      updateStatusToOutreachSent('WhatsApp');
                    }}
                  >
                    {copiedKey === 'whatsapp' ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                    <span>{copiedKey === 'whatsapp' ? 'Copied & Recorded!' : 'Copy Message'}</span>
                  </button>
                </div>
                <div 
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '14px',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {pitches.whatsapp_dm}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Candidate Application Link Banner */}
        <div style={{ marginTop: '16px', background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.18)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              Candidate Resume Intake Portal
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {applyUrl}
            </div>
          </div>
          <button
            className="btn btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
            onClick={() => copyToClipboard(applyUrl, 'apply_link')}
          >
            {copiedKey === 'apply_link' ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
            <span>{copiedKey === 'apply_link' ? 'Copied' : 'Copy Link'}</span>
          </button>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
          <button 
            type="button"
            className="btn btn-outline" 
            style={{ fontSize: '0.82rem', padding: '7px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => updateStatusToOutreachSent(activeTab)}
          >
            <Check size={13} style={{ color: statusSent ? 'var(--success)' : 'inherit' }} />
            <span>{statusSent ? '✓ Status: Outreach Sent' : 'Mark as Outreach Sent'}</span>
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Email Settings Modal for quick configuration */}
        {isEmailSettingsOpen && (
          <EmailSettingsModal
            isOpen={isEmailSettingsOpen}
            onClose={() => setIsEmailSettingsOpen(false)}
            onSaved={(newCfg) => {
              setEmailConfig(newCfg);
            }}
          />
        )}
      </div>
    </div>
  );
}
