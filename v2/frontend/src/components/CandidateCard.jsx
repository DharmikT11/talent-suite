import React, { useState } from 'react';
import { ExternalLink, Sparkles, MapPin, Briefcase, Mail, Phone, Check, Copy, Clock, RefreshCw, FileText, Building2 } from 'lucide-react';
import { FaLinkedin, FaGithub, FaPaperPlane } from 'react-icons/fa';

export default function CandidateCard({ candidate, onOpenInterviewKit, onOpenOutreach }) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Helper to extract fields regardless of exact header casing
  const getField = (...keys) => {
    for (const key of keys) {
      const match = Object.keys(candidate).find(k => k.toLowerCase().includes(key.toLowerCase()));
      if (match && candidate[match]) return String(candidate[match]).trim();
    }
    return '';
  };

  const name = getField('name', 'applicant') || 'Candidate';
  const title = getField('title', 'role', 'designation') || 'Applicant';
  const email = getField('email', 'mail');
  const phone = getField('phone', 'mobile', 'contact');
  const exp = getField('exp', 'year');
  const location = getField('location', 'city');
  const company = getField('company', 'employer');
  const skillsStr = getField('skill');
  const rawCvLink = getField('cv link', 'resume link', 'link', 'drive');
  const linkedInUrl = candidate['LinkedIn URL'] || candidate['Profile URL'] || candidate['profile_url'] || (rawCvLink && (rawCvLink.includes('linkedin.com') || rawCvLink.includes('github.com') || rawCvLink.includes('naukri.com') || rawCvLink.includes('indeed.com')) ? rawCvLink : '');
  const realCvLink = (rawCvLink && !rawCvLink.includes('linkedin.com') && !rawCvLink.includes('github.com') && !rawCvLink.includes('naukri.com') && !rawCvLink.includes('indeed.com')) ? rawCvLink : '';
  const fitScoreStr = getField('fit', 'score');
  const status = getField('status');
  const dateAdded = getField('date', 'added', 'time');

  let fitScore = null;
  if (fitScoreStr) {
    const parsed = parseInt(fitScoreStr.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsed)) fitScore = parsed;
  }

  const skills = skillsStr ? skillsStr.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5) : [];

  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const isUpdated = status && status.toLowerCase().includes('update');

  return (
    <div className="candidate-card">
      <div>
        <div className="candidate-top">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 className="candidate-name" style={{ margin: 0 }}>{name}</h3>
              {status && (
                <span 
                  style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.68rem', 
                    padding: '2px 8px', 
                    borderRadius: '10px',
                    fontWeight: 700,
                    background: status.toLowerCase().includes('screened') || status.toLowerCase().includes('received') || status.toLowerCase().includes('portal')
                      ? 'var(--success-bg)' 
                      : status.toLowerCase().includes('outreach')
                      ? '#EDE9FE'
                      : status.toLowerCase().includes('sourced')
                      ? '#EFF6FF'
                      : '#F1F5F9',
                    color: status.toLowerCase().includes('screened') || status.toLowerCase().includes('received') || status.toLowerCase().includes('portal')
                      ? 'var(--success-text)' 
                      : status.toLowerCase().includes('outreach')
                      ? '#6D28D9'
                      : status.toLowerCase().includes('sourced')
                      ? '#1D4ED8'
                      : '#475569',
                    border: `1px solid ${
                      status.toLowerCase().includes('screened') || status.toLowerCase().includes('received') || status.toLowerCase().includes('portal')
                        ? 'var(--success-border)'
                        : status.toLowerCase().includes('outreach')
                        ? '#DDD6FE'
                        : status.toLowerCase().includes('sourced')
                        ? '#BFDBFE'
                        : '#CBD5E1'
                    }`
                  }}
                >
                  {status}
                </span>
              )}
              {isUpdated && (
                <span className="match-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '2px 6px', fontSize: '0.65rem' }}>
                  <RefreshCw size={10} />
                  <span>Updated</span>
                </span>
              )}
            </div>
            <div className="candidate-role">{title}</div>
          </div>
          {fitScore !== null && (
            <div className={`match-badge ${fitScore >= 80 ? 'high' : fitScore >= 60 ? 'medium' : 'low'}`}>
              <Sparkles size={12} />
              <span>{fitScore}% Match</span>
            </div>
          )}
        </div>

        <div className="candidate-meta">
          {exp && (
            <div className="meta-pill">
              <Briefcase size={14} style={{ color: '#818CF8' }} />
              <span>{exp} {String(exp).includes('yr') ? '' : 'Yrs Exp'}</span>
            </div>
          )}
          {location && (
            <div className="meta-pill">
              <MapPin size={14} style={{ color: '#F472B6' }} />
              <span>{location}</span>
            </div>
          )}
          {company && (
            <div className="meta-pill">
              <Building2 size={13} style={{ color: '#64748B' }} />
              <span>{company}</span>
            </div>
          )}
          {dateAdded && (
            <div className="meta-pill" title={`Added / Updated: ${dateAdded}`}>
              <Clock size={13} style={{ color: '#10B981' }} />
              <span>{dateAdded.split(' ')[0]}</span>
            </div>
          )}
        </div>

        {skills.length > 0 && (
          <div className="skills-tags">
            {skills.map((skill, i) => (
              <span key={i} className="skill-tag">{skill}</span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          {email && (
            <button 
              className="btn btn-secondary" 
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => copyToClipboard(email, 'email')}
              title={email}
            >
              {copiedEmail ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Mail size={12} />}
              <span>{copiedEmail ? 'Copied' : email.length > 20 ? `${email.substring(0, 18)}...` : email}</span>
            </button>
          )}
          {phone && (
            <button 
              className="btn btn-secondary" 
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => copyToClipboard(phone, 'phone')}
              title={phone}
            >
              {copiedPhone ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Phone size={12} />}
              <span>{copiedPhone ? 'Copied' : phone}</span>
            </button>
          )}
        </div>
      </div>

      <div className="candidate-actions" style={{ flexWrap: 'wrap', gap: '8px' }}>
        {/* If real uploaded resume PDF exists */}
        {realCvLink && (
          <a 
            href={realCvLink} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-primary"
            style={{ flex: 1, minWidth: '120px', padding: '8px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <FileText size={14} />
            <span>View Resume</span>
            <ExternalLink size={12} />
          </a>
        )}

        {/* If LinkedIn / Web Profile exists */}
        {linkedInUrl && (
          <a 
            href={linkedInUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-secondary"
            style={{ 
              flex: 1, 
              minWidth: '120px',
              padding: '8px 12px', 
              fontSize: '0.8rem', 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px',
              color: '#0A66C2',
              background: '#EFF6FF',
              borderColor: '#BFDBFE',
              fontWeight: 600
            }}
          >
            {linkedInUrl.includes('github.com') ? (
              <FaGithub size={14} style={{ color: '#24292e' }} />
            ) : (
              <FaLinkedin size={14} style={{ color: '#0A66C2' }} />
            )}
            <span>{linkedInUrl.includes('github.com') ? 'GitHub' : 'LinkedIn'}</span>
            <ExternalLink size={12} />
          </a>
        )}

        {/* If NEITHER resume NOR profile exists */}
        {!realCvLink && !linkedInUrl && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '6px 0' }}>
            Resume not uploaded
          </span>
        )}

        {/* Reach Out Pitch Generator Button */}
        {onOpenOutreach && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#1D4ED8' }}
            onClick={() => onOpenOutreach(candidate)}
            title="Generate AI Outreach Pitch (LinkedIn, Email, WhatsApp)"
          >
            <FaPaperPlane size={11} style={{ color: '#2563EB' }} />
            <span>Reach Out</span>
          </button>
        )}

        {/* AI Interview Kit Button */}
        <button 
          type="button"
          className="btn btn-outline"
          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
          onClick={() => onOpenInterviewKit(candidate)}
          title="Generate AI Interview Questions"
        >
          <Sparkles size={13} />
          <span>Interview Kit</span>
        </button>
      </div>
    </div>
  );
}
