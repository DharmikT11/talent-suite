import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  UploadCloud, 
  CheckCircle2, 
  Sparkles, 
  FileText, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Loader2, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export default function CandidateApplyPortal() {
  const [roleTitle, setRoleTitle] = useState('Senior Firmware Engineer');
  const [jobId, setJobId] = useState('');
  const [jobDetails, setJobDetails] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Status state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusStep, setStatusStep] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Parse query params
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    const jobParam = params.get('job_id') || params.get('job');
    
    if (roleParam) setRoleTitle(roleParam);
    if (jobParam) setJobId(jobParam);

    // Fetch jobs to get full JD if matching
    fetch('/api/jobs')
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.jobs) {
          const match = data.jobs.find(j => 
            (jobParam && j.id === jobParam) || 
            (roleParam && j.title.toLowerCase().includes(roleParam.toLowerCase()))
          );
          if (match) {
            setJobDetails(match);
            setRoleTitle(match.title);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Please upload a PDF resume file.');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select or drop your resume (PDF).');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setStatusStep('Uploading and reading resume PDF...');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('job_title', roleTitle);
    if (jobId) formData.append('job_id', jobId);
    if (jobDetails?.jd) formData.append('jd', jobDetails.jd);
    if (name.trim()) formData.append('applicant_name', name.trim());
    if (email.trim()) formData.append('applicant_email', email.trim());
    if (phone.trim()) formData.append('applicant_phone', phone.trim());

    try {
      setTimeout(() => setStatusStep('AI extracting skills & firmware experience...'), 1200);
      setTimeout(() => setStatusStep('Matching background with role requirements...'), 2800);

      const res = await fetch('/api/sourcing/apply', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setResult(data);
      } else {
        setError(data.detail || 'Application submission failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Network error while submitting application.');
    } finally {
      setIsSubmitting(false);
      setStatusStep('');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Top Brand Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: 'var(--shadow-blue-glow)' }}>
          <Briefcase size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            RecruitAI Careers Portal
          </h1>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Engineering Talent Acquisition
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ width: '100%', maxWidth: '680px' }}>
        {result ? (
          /* Success Screen */
          <div className="panel-card" style={{ textAlign: 'center', padding: '48px 24px', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid var(--success-border)' }}>
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Application Received!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto 20px' }}>
              Thank you, <strong>{result.candidate?.name || name || 'Applicant'}</strong>. Your resume for the <strong>{result.job_title}</strong> role has been successfully received and screened by our engineering system.
            </p>

            {result.candidate?.fit_score && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--primary-light)', borderRadius: '24px', border: '1px solid rgba(37,99,235,0.2)', marginBottom: '24px' }}>
                <Sparkles size={16} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--primary)' }}>
                  Profile Alignment: {result.candidate.fit_score}% Match ({result.candidate.match_tier || 'Screened'})
                </span>
              </div>
            )}

            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '16px', textAlign: 'left', marginBottom: '24px', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                What happens next?
              </div>
              <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Our engineering team will review your profile and match with our technical requirements. If shortlisted, a recruiter will reach out via email or phone to schedule an introductory technical call.
              </p>
            </div>

            <button 
              className="btn btn-secondary"
              onClick={() => {
                setResult(null);
                setSelectedFile(null);
              }}
            >
              Submit Another Response
            </button>
          </div>
        ) : (
          /* Application Form */
          <div className="panel-card" style={{ padding: '32px' }}>
            {/* Header info */}
            <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '14px', fontSize: '0.78rem', fontWeight: 600, marginBottom: '8px' }}>
                <Sparkles size={13} />
                <span>Immediate Opening</span>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {roleTitle}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={14} />
                  <span>{jobDetails?.location || 'India (Hybrid / Remote)'}</span>
                </span>
                <span>•</span>
                <span>Experience: {jobDetails?.experience || '3 to 6 Years'}</span>
              </div>
            </div>

            {/* Quick overview if available */}
            {jobDetails?.jd && (
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px', marginBottom: '24px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Key Role Requirements:
                </div>
                <div style={{ whiteSpace: 'pre-line', maxHeight: '120px', overflowY: 'auto', lineHeight: 1.5 }}>
                  {jobDetails.jd}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Your Full Name *
                  </label>
                  <div className="input-with-icon">
                    <User size={16} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Email Address *
                  </label>
                  <div className="input-with-icon">
                    <Mail size={16} />
                    <input
                      type="email"
                      className="form-input"
                      placeholder="rahul@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '22px' }}>
                <label className="form-label">
                  Phone / WhatsApp Number
                </label>
                <div className="input-with-icon">
                  <Phone size={16} />
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Resume Dropzone */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Attach Resume / CV (PDF) *
                </label>
                <label 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    border: '2px dashed var(--border-medium)', 
                    borderRadius: '12px', 
                    padding: '28px 16px', 
                    cursor: 'pointer',
                    background: selectedFile ? 'var(--primary-light)' : 'var(--bg-primary)',
                    transition: 'all 0.2s ease' 
                  }}
                >
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }} 
                  />
                  {selectedFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                      <FileText size={24} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedFile.name}</div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {(selectedFile.size / 1024).toFixed(1)} KB • Click to change file
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <UploadCloud size={32} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        Click to upload or drag & drop your resume
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        PDF format only (Max 15MB)
                      </div>
                    </>
                  )}
                </label>
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '8px', color: 'var(--danger-text)', fontSize: '0.86rem', marginBottom: '16px' }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !selectedFile}
                style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700, justifyContent: 'center' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{statusStep || 'Processing Application...'}</span>
                  </>
                ) : (
                  <>
                    <span>Submit Application</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Back Link */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <a href="/" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
            ← Return to RecruitAI Portal
          </a>
        </div>
      </div>
    </div>
  );
}
