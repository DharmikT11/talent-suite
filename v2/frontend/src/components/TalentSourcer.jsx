import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Search, 
  Sparkles, 
  Target, 
  MapPin, 
  ExternalLink, 
  Loader2, 
  AlertCircle, 
  Check, 
  Copy, 
  Link as LinkIcon,
  UserCheck
} from 'lucide-react';
import { 
  FaLinkedin, 
  FaGithub,
  FaGlobe,
  FaFilePdf, 
  FaBriefcase, 
  FaPaperPlane, 
  FaPlus, 
  FaTrashAlt, 
  FaUpload, 
  FaFileAlt,
  FaCheck,
  FaBookmark,
  FaCheckCircle
} from 'react-icons/fa';
import OutreachModal from './OutreachModal';

export default function TalentSourcer({ onCandidateUpdated }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [roleTitle, setRoleTitle] = useState('Senior Firmware Engineer');
  const [location, setLocation] = useState('India');
  const [experience, setExperience] = useState('3 to 6 Years');
  const [jdText, setJdText] = useState('');
  
  // JD File Upload states
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isParsingJd, setIsParsingJd] = useState(false);

  // Sourcing states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [strategy, setStrategy] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedQueryIdx, setCopiedQueryIdx] = useState(null);
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [isDeletingJob, setIsDeletingJob] = useState(false);
  const [urgencyFilter, setUrgencyFilter] = useState('all'); // 'all', 'immediate', 'active'

  const handleCopyQuery = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedQueryIdx(idx);
    setTimeout(() => setCopiedQueryIdx(null), 2000);
  };

  // Candidate pipeline sync states
  const [savedStatusMap, setSavedStatusMap] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [saveBanner, setSaveBanner] = useState('');

  // Load jobs from backend on mount
  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.ok && data.jobs && data.jobs.length > 0) {
        setJobs(data.jobs);
        if (!selectedJobId) {
          applyJob(data.jobs[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch jobs:', e);
    }
  };

  const applyJob = (job) => {
    setSelectedJobId(job.id);
    setRoleTitle(job.title || '');
    setLocation(job.location || 'India');
    setExperience(job.experience || '3 to 5 Years');
    setJdText(job.jd || '');
    setUploadedFileName('');
    setStrategy(null);
    setCandidates([]);
  };

  const handleCreateNewJob = () => {
    setSelectedJobId('new');
    setRoleTitle('');
    setLocation('India');
    setExperience('3 to 5 Years');
    setJdText('');
    setUploadedFileName('');
    setStrategy(null);
    setCandidates([]);
  };

  const handleJdFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingJd(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/jobs/parse-file', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setUploadedFileName(file.name);
        if (data.role_title) setRoleTitle(data.role_title);
        if (data.experience) setExperience(data.experience);
        if (data.location) setLocation(data.location);
        if (data.jd_text) setJdText(data.jd_text);
      } else {
        setError(data.detail || 'Could not parse JD file. Please enter text manually.');
      }
    } catch (err) {
      setError('Failed to upload and parse JD document.');
    } finally {
      setIsParsingJd(false);
    }
  };

  const handleSaveJob = async () => {
    if (!roleTitle.trim()) {
      setError('Please enter a Target Role Title.');
      return;
    }
    const finalJd = jdText.trim() || `Position: ${roleTitle.trim()}\nLocation: ${location.trim()}\nExperience: ${experience.trim()}\nKey Responsibilities: End-to-end responsibilities for ${roleTitle.trim()}.`;

    setIsSavingJob(true);
    setError('');
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedJobId === 'new' ? undefined : selectedJobId,
          title: roleTitle.trim(),
          location: location.trim() || 'Remote',
          experience: experience.trim() || '3 to 5 Years',
          jd: finalJd,
        }),
      });
      const data = await res.json();
      if (data.ok && data.job) {
        setSelectedJobId(data.job.id);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
        await fetchJobs();
      }
    } catch (e) {
      setError('Failed to save job opening.');
    } finally {
      setIsSavingJob(false);
    }
  };

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return;
    setIsDeletingJob(true);
    try {
      await fetch(`/api/jobs/${jobToDelete.id}`, { method: 'DELETE' });
      setJobToDelete(null);
      const res = await fetch('/api/jobs');
      const data = await res.json();
      const updatedJobs = data.jobs || [];
      setJobs(updatedJobs);
      if (updatedJobs.length > 0) {
        applyJob(updatedJobs[0]);
      } else {
        handleCreateNewJob();
      }
    } catch (e) {
      console.error(e);
      setError('Failed to delete job opening.');
    } finally {
      setIsDeletingJob(false);
    }
  };

  const handleAnalyzeJD = async (e) => {
    if (e) e.preventDefault();
    if (!jdText.trim()) {
      setError('Please upload a JD document or paste the Job Description first.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setStrategy(null);
    setCandidates([]);

    try {
      const res = await fetch('/api/sourcing/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jd: jdText,
          role_title: roleTitle,
          location: location,
        }),
      });
      const data = await res.json();
      if (data.ok && data.strategy) {
        setStrategy(data.strategy);
        triggerSearch(data.strategy);
      } else {
        setError(data.detail || 'Could not generate sourcing strategy.');
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to backend.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const triggerSearch = async (strategyData) => {
    const strat = strategyData || strategy;
    if (!strat || !strat.search_queries) return;

    setIsSearching(true);
    setError('');
    try {
      const res = await fetch('/api/sourcing/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: strat.search_queries,
          core_skills: strat.core_skills || [],
          location: location || strat.location || 'India',
          max_results: 15,
          job_title: strat.job_title || roleTitle || '',
          experience: experience || strat.seniority || '1-3 Years',
        }),
      });
      const data = await res.json();
      if (data.ok && data.candidates) {
        setCandidates(data.candidates);
      } else {
        setError(data.detail || 'Could not find candidate profiles.');
      }
    } catch (err) {
      setError(err.message || 'Error executing search.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveCandidate = async (cand) => {
    setSavingId(cand.id);
    setError('');
    try {
      const res = await fetch('/api/sourcing/save-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate: cand,
          job_title: strategy?.job_title || roleTitle,
          status: 'Sourced',
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSavedStatusMap(prev => ({
          ...prev,
          [cand.id]: 'Sourced',
          [cand.name]: 'Sourced',
        }));
        setSaveBanner(`✓ ${cand.name} saved to Pipeline & Google Sheet with Status: "Sourced"!`);
        setTimeout(() => setSaveBanner(''), 4500);
        onCandidateUpdated?.();
      } else {
        setError(data.detail || 'Could not save candidate to pipeline.');
      }
    } catch (err) {
      setError('Failed to save candidate to pipeline.');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAll = async () => {
    if (!candidates.length) return;
    setIsSavingAll(true);
    setError('');
    try {
      for (const cand of candidates) {
        if (savedStatusMap[cand.id] || savedStatusMap[cand.name]) continue;
        const res = await fetch('/api/sourcing/save-candidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidate: cand,
            job_title: strategy?.job_title || roleTitle,
            status: 'Sourced',
          }),
        });
        if (res.ok) {
          setSavedStatusMap(prev => ({
            ...prev,
            [cand.id]: 'Sourced',
            [cand.name]: 'Sourced',
          }));
        }
      }
      setSaveBanner(`✓ Successfully saved discovered candidates to Google Sheet & Pipeline with Status: "Sourced"!`);
      setTimeout(() => setSaveBanner(''), 5000);
      onCandidateUpdated?.();
    } catch (err) {
      setError('Failed while saving candidates to pipeline.');
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleOutreachSuccess = (candidate, channel) => {
    setSavedStatusMap(prev => ({
      ...prev,
      [candidate.id]: 'Outreach Sent',
      [candidate.name]: 'Outreach Sent',
    }));
    setSaveBanner(`✓ Outreach sent to ${candidate.name} via ${channel}! Status updated to "Outreach Sent" in Sheet & Pipeline.`);
    setTimeout(() => setSaveBanner(''), 5000);
    onCandidateUpdated?.();
  };

  const currentApplyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/apply?role=${encodeURIComponent(roleTitle || 'Firmware Engineer')}${selectedJobId && selectedJobId !== 'new' ? `&job_id=${selectedJobId}` : ''}`
    : '/apply';

  const copyApplyUrl = () => {
    navigator.clipboard.writeText(currentApplyUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div style={{ width: '100%', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Top Banner */}
      <div 
        className="panel-card" 
        style={{ 
          marginBottom: '20px', 
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(2, 132, 199, 0.03) 100%)',
          border: '1.5px solid rgba(37, 99, 235, 0.15)' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
              <Compass size={14} />
              <span>Step 1: HR Job Requisition & Autonomous Sourcing</span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Outbound Sourcing & Candidate Discovery
            </h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '1000px' }}>
              Select an open role or upload a JD document. The AI extracts skills, scans public LinkedIn profiles safely (zero account ban risk), and generates multi-channel outreach.
            </p>
          </div>

          {/* Quick Apply Link preview for HR */}
          <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border-medium)', textAlign: 'right', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.04em' }}>
              PUBLIC CANDIDATE INTAKE LINK
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={copyApplyUrl}
              style={{ fontSize: '0.82rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {copiedLink ? <Check size={14} style={{ color: 'var(--success)' }} /> : <LinkIcon size={14} />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy /apply Link'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step 1: Active Job Requisitions Selector */}
      <div className="panel-card" style={{ marginBottom: '20px', padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaBriefcase size={14} />
            </div>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Active Job Openings ({jobs.length})
            </span>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreateNewJob}
            style={{ fontSize: '0.82rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <FaPlus size={12} />
            <span>Create New Role</span>
          </button>
        </div>

        {/* Job Tabs / Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {jobs.map((job) => {
            const isSelected = selectedJobId === job.id;
            return (
              <div
                key={job.id}
                onClick={() => applyJob(job)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  border: isSelected ? '2px solid var(--primary)' : '1.5px solid var(--border-medium)',
                  background: isSelected ? 'var(--primary-light)' : '#FFFFFF',
                  color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                  boxShadow: isSelected ? '0 2px 8px rgba(37,99,235,0.15)' : 'none',
                }}
              >
                <span>{job.title}</span>
                <span style={{ fontSize: '0.76rem', color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}>
                  ({job.location})
                </span>
                {isSelected && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setJobToDelete(job);
                    }}
                    title="Delete Job"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '2px', display: 'flex', marginLeft: '4px' }}
                  >
                    <FaTrashAlt size={12} />
                  </button>
                )}
              </div>
            );
          })}

          {jobs.length === 0 && selectedJobId !== 'new' && (
            <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
              No active job openings. Fill in the details below to add your first job opening!
            </div>
          )}

          {selectedJobId === 'new' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '9px 16px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 700,
                border: '2px dashed var(--primary)',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
              }}
            >
              <span>+ Drafting New Role</span>
            </div>
          )}
        </div>
      </div>

      {/* Professional Job Requisition Editor Form */}
      <div className="panel-card" style={{ marginBottom: '24px', padding: '24px' }}>
        <form onSubmit={handleAnalyzeJD}>
          {/* Form Header with Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid var(--border-subtle)', paddingBottom: '14px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {selectedJobId === 'new' ? 'Create New Job Opening' : `Role Details: ${roleTitle || 'Selected Job'}`}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {selectedJobId === 'new' 
                  ? 'Enter role title, location, and JD, then click "Save & Add Job Opening"' 
                  : 'Edit job specifications and save changes'}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={selectedJobId === 'new' ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={handleSaveJob}
                disabled={isSavingJob}
                style={{ fontSize: '0.84rem', padding: '8px 16px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {saveSuccess ? (
                  <>
                    <FaCheck size={12} style={{ color: 'var(--success)' }} />
                    <span style={{ color: 'var(--success)' }}>Job Saved!</span>
                  </>
                ) : (
                  <>
                    <FaBriefcase size={12} />
                    <span>{isSavingJob ? 'Saving...' : selectedJobId === 'new' ? 'Save & Add Job' : ' Save Changes'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3 Main Visible Inputs */}
          <div className="sourcer-inputs-grid">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Target Role Title *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Senior Firmware Engineer"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Experience Level
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 3 to 6 Years"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Target Location / Geography
              </label>
              <div className="input-with-icon">
                <MapPin size={15} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. India, Bangalore, Remote"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* JD Document Upload Zone */}
          <div style={{ marginBottom: '16px' }}>
            <div className="form-label" style={{ marginBottom: '8px' }}>
              <span>Upload Job Description Document (PDF / DOC / TXT)</span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Auto-extracts role, skills & requirements
              </span>
            </div>

            <label className={`jd-upload-dropzone ${uploadedFileName ? 'has-file' : ''}`}>
              <input 
                type="file" 
                accept=".pdf,.txt,.doc,.docx" 
                onChange={handleJdFileUpload} 
                style={{ display: 'none' }} 
              />
              {isParsingJd ? (
                <>
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--primary)' }}>
                    Reading and analyzing JD document with AI...
                  </span>
                </>
              ) : uploadedFileName ? (
                <>
                  <FaFilePdf size={20} style={{ color: 'var(--primary)' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--primary)' }}>
                      {uploadedFileName} (Successfully Extracted)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Click to upload a different JD file
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaUpload size={14} />
                  </div>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      Click to upload JD document
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                      (PDF, Word DOCX, or TXT)
                    </span>
                  </div>
                </>
              )}
            </label>
          </div>

          {/* Job Description Textarea */}
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <div className="form-label">
              <span>Job Description Specifications (Full Text) *</span>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {jdText.length} characters
              </span>
            </div>
            <textarea
              className="form-textarea"
              rows={7}
              placeholder="Paste or review the full job description here (firmware requirements, FreeRTOS, STM32, C/C++, protocols)..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              style={{ lineHeight: '1.55', fontSize: '0.88rem' }}
            />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '8px', color: 'var(--danger-text)', fontSize: '0.86rem', marginBottom: '16px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="sourcer-action-buttons">
            <button
              type="button"
              className={selectedJobId === 'new' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={handleSaveJob}
              disabled={isSavingJob || !roleTitle.trim()}
              style={{ padding: '12px 22px', fontSize: '0.92rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {saveSuccess ? (
                <>
                  <FaCheck size={14} style={{ color: 'var(--success)' }} />
                  <span style={{ color: 'var(--success)' }}>Job Saved!</span>
                </>
              ) : (
                <>
                  <FaBriefcase size={14} />
                  <span>{isSavingJob ? 'Saving...' : selectedJobId === 'new' ? ' Save & Add Job Opening' : 'Save Changes'}</span>
                </>
              )}
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isAnalyzing || isSearching || !jdText.trim()}
              style={{ minWidth: '240px', padding: '12px 24px', fontSize: '0.94rem', fontWeight: 700 }}
              title={!jdText.trim() ? 'Paste or upload a Job Description to scan matching candidates' : 'Scan public LinkedIn profiles matching this JD'}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Analyzing Requirements...</span>
                </>
              ) : isSearching ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Scanning Matching Profiles...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Find Matching Candidates</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Sourcing Strategy & Detected Keywords */}
      {strategy && (
        <div className="panel-card" style={{ marginBottom: '24px', background: '#FFFFFF', border: '1.5px solid var(--border-medium)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                Active Strategy: {strategy.job_title}
              </h3>
            </div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {strategy.seniority} • {strategy.location}
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>
              Extracted Must-Have Skills:
            </span>
            {strategy.core_skills?.map((skill, i) => (
              <span 
                key={i}
                style={{ 
                  background: 'var(--primary-light)', 
                  color: 'var(--primary)', 
                  padding: '3px 10px', 
                  borderRadius: '12px', 
                  fontSize: '0.78rem', 
                  fontWeight: 700,
                  border: '1px solid rgba(37,99,235,0.2)' 
                }}
              >
                {skill}
              </span>
            ))}
          </div>

          {/* Multi-Platform Search Queries Section */}
          <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Search size={15} style={{ color: 'var(--primary)' }} />
                <span>Multi-Platform Sourcing Queries ({(strategy.search_queries || []).length} Active Channels)</span>
              </div>
              <span style={{ fontSize: '0.74rem', color: '#64748B', background: '#E2E8F0', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                LinkedIn • Naukri • Indeed • GitHub • Resumes
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {((strategy.query_details && strategy.query_details.length > 0)
                ? strategy.query_details
                : (strategy.search_queries || []).map((q) => {
                    let platform = 'Web';
                    let channel = 'Web Search';
                    let signal = 'Targeted Search';
                    if (q.includes('linkedin.com')) {
                      platform = 'LinkedIn';
                      channel = q.includes('intitle:') ? 'LinkedIn Headline' : 'LinkedIn Broad';
                      signal = q.includes('intitle:') ? 'Open to Work in Headline' : 'Active Job Seekers';
                    } else if (q.includes('github.com')) {
                      platform = 'GitHub';
                      channel = 'GitHub - Developer Profiles';
                      signal = 'Developer Profiles & Repos';
                    } else if (q.includes('naukri') || q.includes('indeed')) {
                      platform = 'Naukri / Indeed';
                      channel = 'Naukri & Indeed - Resumes';
                      signal = 'Active Resumes & Candidates';
                    } else if (q.includes('filetype:pdf') || q.includes('resume')) {
                      platform = 'Public Resumes';
                      channel = 'Public Resumes - PDF/DOCX';
                      signal = 'Direct Resumes & CVs';
                    }
                    return { 
                      platform, 
                      channel, 
                      signal, 
                      query: q,
                      google_url: `https://www.google.com/search?q=${encodeURIComponent(q)}&tbs=qdr:y`
                    };
                  })
              ).map((item, idx) => {
                const isLinkedIn = item.platform === 'LinkedIn';
                const isGitHub = item.platform === 'GitHub';
                const isNaukriIndeed = item.platform?.includes('Naukri') || item.platform?.includes('Indeed');
                const isResume = item.platform?.includes('Resume') || item.platform === 'Public Resumes';
                const badgeBg = isLinkedIn ? '#EBF5FF' : isGitHub ? '#F3F4F6' : isNaukriIndeed ? '#FFF7ED' : isResume ? '#F0FDF4' : '#F1F5F9';
                const badgeColor = isLinkedIn ? '#0284C7' : isGitHub ? '#1F2937' : isNaukriIndeed ? '#D97706' : isResume ? '#15803D' : '#475569';
                const badgeBorder = isLinkedIn ? 'rgba(2,132,199,0.2)' : isGitHub ? 'rgba(31,41,55,0.2)' : isNaukriIndeed ? 'rgba(217,119,6,0.2)' : isResume ? 'rgba(21,128,61,0.2)' : 'rgba(71,85,105,0.2)';
                const googleSearchUrl = item.google_url || `https://www.google.com/search?q=${encodeURIComponent(item.query)}&tbs=qdr:y`;

                return (
                  <div 
                    key={idx}
                    style={{ 
                      background: '#FFFFFF', 
                      borderRadius: '6px', 
                      padding: '8px 12px', 
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <span 
                        style={{ 
                          background: badgeBg, 
                          color: badgeColor, 
                          border: `1px solid ${badgeBorder}`,
                          padding: '2px 8px', 
                          borderRadius: '6px', 
                          fontSize: '0.72rem', 
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        {isLinkedIn && <FaLinkedin size={11} />}
                        {isGitHub && <FaGithub size={11} />}
                        {isNaukriIndeed && <FaGlobe size={11} />}
                        {isResume && <FaFileAlt size={11} />}
                        <span>{item.channel || item.platform}</span>
                        <span style={{ opacity: 0.8, fontWeight: 500 }}>({item.signal})</span>
                      </span>

                      <code 
                        style={{ 
                          color: '#334155', 
                          fontFamily: 'monospace', 
                          fontSize: '0.78rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1
                        }}
                        title={item.query}
                      >
                        {item.query}
                      </code>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleCopyQuery(item.query, idx)}
                        style={{
                          background: copiedQueryIdx === idx ? '#DCFCE7' : '#F1F5F9',
                          color: copiedQueryIdx === idx ? '#166534' : '#475569',
                          border: '1px solid',
                          borderColor: copiedQueryIdx === idx ? '#86EFAC' : '#E2E8F0',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                        title="Copy search string to clipboard"
                      >
                        {copiedQueryIdx === idx ? (
                          <>
                            <Check size={12} style={{ color: '#16A34A' }} />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <a
                        href={googleSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1px solid #BFDBFE',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                        title="Open search in Google with past year filter"
                      >
                        <ExternalLink size={12} />
                        <span>Open in Google</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Candidate Results Grid */}
      {isSearching ? (
        <div className="panel-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>
            Scanning Multi-Platform Profiles for {roleTitle}...
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Scanning active candidates across LinkedIn, GitHub, Naukri & Indeed matching {strategy?.core_skills?.slice(0, 3).join(', ') || roleTitle} in {location || 'target region'}.
          </p>
        </div>
      ) : candidates.length > 0 ? (
        <div>
          {/* Notification Banner */}
          {saveBanner && (
            <div 
              style={{ 
                padding: '12px 16px', 
                background: 'var(--success-bg)', 
                border: '1px solid var(--success-border)', 
                borderRadius: '8px', 
                color: 'var(--success-text)', 
                fontSize: '0.88rem', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '16px' 
              }}
            >
              <FaCheckCircle size={16} />
              <span>{saveBanner}</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={20} style={{ color: 'var(--success)' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                Discovered Candidates ({candidates.length})
              </h3>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '7px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                disabled={isSavingAll}
                onClick={handleSaveAll}
                title="Save all discovered profiles to Google Sheet with Status: Sourced"
              >
                {isSavingAll ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <FaBookmark size={12} style={{ color: 'var(--primary)' }} />
                )}
                <span>{isSavingAll ? 'Saving to Sheet...' : 'Save All to Sheet'}</span>
              </button>

              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Step 3: Reach out and invite candidate to submit CV
              </span>
            </div>
          </div>

          {/* Urgency Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '4px' }}>
              Filter by Availability:
            </span>
            <button
              type="button"
              onClick={() => setUrgencyFilter('all')}
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                background: urgencyFilter === 'all' ? 'var(--primary)' : '#FFFFFF',
                color: urgencyFilter === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
                borderColor: urgencyFilter === 'all' ? 'var(--primary)' : 'var(--border-subtle)',
                transition: 'all 0.15s ease'
              }}
            >
              All Discovered ({candidates.length})
            </button>
            <button
              type="button"
              onClick={() => setUrgencyFilter('immediate')}
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                background: urgencyFilter === 'immediate' ? '#16A34A' : '#F0FDF4',
                color: urgencyFilter === 'immediate' ? '#FFFFFF' : '#166534',
                borderColor: urgencyFilter === 'immediate' ? '#16A34A' : '#BBF7D0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>🟢 Immediate Joiners & Notice Period</span>
              <span style={{ 
                background: urgencyFilter === 'immediate' ? 'rgba(255,255,255,0.25)' : '#DCFCE7',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '0.72rem'
              }}>
                {candidates.filter(c => (c.active_seeker_badge || '').includes('Immediate') || (c.active_seeker_badge || '').includes('Notice')).length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setUrgencyFilter('active')}
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                background: urgencyFilter === 'active' ? '#0284C7' : '#F0F9FF',
                color: urgencyFilter === 'active' ? '#FFFFFF' : '#0369A1',
                borderColor: urgencyFilter === 'active' ? '#0284C7' : '#BAE6FD',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>🔵 Actively Looking</span>
              <span style={{ 
                background: urgencyFilter === 'active' ? 'rgba(255,255,255,0.25)' : '#E0F2FE',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '0.72rem'
              }}>
                {candidates.filter(c => c.is_active_seeker).length}
              </span>
            </button>
          </div>

          <div className="sourced-candidate-grid">
            {candidates.filter(c => {
              if (urgencyFilter === 'immediate') {
                return (c.active_seeker_badge || '').includes('Immediate') || (c.active_seeker_badge || '').includes('Notice');
              }
              if (urgencyFilter === 'active') {
                return c.is_active_seeker;
              }
              return true;
            }).map((cand) => {
              const currentStatus = savedStatusMap[cand.id] || savedStatusMap[cand.name];
              const isSaved = Boolean(currentStatus);

              return (
                <div 
                  key={cand.id}
                  className="panel-card"
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    border: isSaved ? '1.5px solid #93C5FD' : '1.5px solid var(--border-medium)',
                    padding: '18px',
                    boxShadow: 'var(--shadow-sm)',
                    background: isSaved ? 'rgba(239, 246, 255, 0.25)' : '#FFFFFF',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {cand.name}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          <MapPin size={12} />
                          <span>{cand.location}</span>
                        </div>

                        {/* Multi-Platform & Active Seeker Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px', 
                            padding: '1px 7px', 
                            borderRadius: '4px', 
                            fontSize: '0.72rem', 
                            fontWeight: 700, 
                            background: cand.source === 'LinkedIn' ? '#EFF6FF' : cand.source === 'Naukri' ? '#F0F9FF' : cand.source === 'Indeed' ? '#EFF6FF' : '#F1F5F9',
                            color: cand.source === 'LinkedIn' ? '#0A66C2' : cand.source === 'Naukri' ? '#0284C7' : cand.source === 'Indeed' ? '#2563EB' : '#334155',
                            border: '1px solid rgba(0,0,0,0.08)'
                          }}>
                            {cand.source === 'LinkedIn' ? <FaLinkedin size={11} /> : cand.source === 'GitHub' ? <FaGithub size={11} /> : <FaGlobe size={10} />}
                            <span>{cand.source || 'Web Profile'}</span>
                          </span>

                          {cand.experience && (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px', 
                              padding: '1px 7px', 
                              borderRadius: '4px', 
                              fontSize: '0.72rem', 
                              fontWeight: 700, 
                              background: '#FEF3C7', 
                              color: '#92400E', 
                              border: '1px solid #FDE68A' 
                            }}>
                              <FaBriefcase size={10} />
                              <span>{cand.experience}</span>
                            </span>
                          )}

                          {cand.is_active_seeker && (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px', 
                              padding: '1px 8px', 
                              borderRadius: '12px', 
                              fontSize: '0.7rem', 
                              fontWeight: 800, 
                              background: '#DCFCE7', 
                              color: '#166534', 
                              border: '1px solid #86EFAC' 
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }} />
                              <span>{cand.active_seeker_badge || 'Active Job Seeker'}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <div 
                          style={{ 
                            padding: '4px 10px', 
                            borderRadius: '20px', 
                            fontSize: '0.76rem', 
                            fontWeight: 700,
                            background: cand.fit_score >= 80 ? 'var(--success-bg)' : 'var(--warning-bg)',
                            color: cand.fit_score >= 80 ? 'var(--success-text)' : 'var(--warning-text)',
                            border: `1px solid ${cand.fit_score >= 80 ? 'var(--success-border)' : 'var(--warning-border)'}`
                          }}
                        >
                          {cand.fit_score}% Match
                        </div>

                        {currentStatus && (
                          <div 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px', 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              fontSize: '0.72rem', 
                              fontWeight: 700, 
                              background: currentStatus === 'Outreach Sent' ? '#EDE9FE' : '#EFF6FF', 
                              color: currentStatus === 'Outreach Sent' ? '#6D28D9' : '#1D4ED8', 
                              border: `1px solid ${currentStatus === 'Outreach Sent' ? '#DDD6FE' : '#BFDBFE'}`, 
                            }}
                          >
                            {currentStatus === 'Outreach Sent' ? <FaPaperPlane size={9} /> : <FaCheck size={9} />}
                            <span>Status: {currentStatus}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', fontWeight: 500, margin: '0 0 10px', lineHeight: '1.4' }}>
                      {cand.headline}
                    </p>

                    {cand.matched_skills && cand.matched_skills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                        {cand.matched_skills.map((sk, idx) => (
                          <span 
                            key={idx}
                            style={{ 
                              background: '#F1F5F9', 
                              color: '#334155', 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '0.74rem', 
                              fontWeight: 600, 
                              border: '1px solid #E2E8F0' 
                            }}
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}

                    {cand.snippet && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.45', margin: '0 0 14px', WebkitLineClamp: 3, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {cand.snippet}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                    {cand.profile_url && (
                      <a
                        href={cand.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ flex: 1, minWidth: '95px', padding: '7px 8px', fontSize: '0.8rem', textDecoration: 'none', justifyContent: 'center', gap: '5px' }}
                      >
                        {cand.source === 'GitHub' ? (
                          <FaGithub size={13} style={{ color: '#24292e' }} />
                        ) : cand.source === 'Naukri' ? (
                          <span style={{ fontWeight: 800, color: '#0284C7', fontSize: '0.75rem' }}>N</span>
                        ) : cand.source === 'Indeed' ? (
                          <span style={{ fontWeight: 800, color: '#2563EB', fontSize: '0.75rem' }}>I</span>
                        ) : (
                          <FaLinkedin size={13} style={{ color: '#0A66C2' }} />
                        )}
                        <span>{cand.source || 'Profile'}</span>
                      </a>
                    )}

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1.1, minWidth: '110px', padding: '7px 8px', fontSize: '0.8rem', justifyContent: 'center', gap: '5px' }}
                      disabled={isSaved || savingId === cand.id}
                      onClick={() => handleSaveCandidate(cand)}
                      title="Save candidate to Google Sheet and Candidate Pipeline with Status: Sourced"
                    >
                      {savingId === cand.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : isSaved ? (
                        <FaCheck size={11} style={{ color: 'var(--success)' }} />
                      ) : (
                        <FaBookmark size={11} style={{ color: 'var(--primary)' }} />
                      )}
                      <span>{isSaved ? 'Sourced in Sheet' : 'Save to Sheet'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1.2, minWidth: '115px', padding: '7px 10px', fontSize: '0.8rem', justifyContent: 'center', gap: '5px' }}
                      onClick={() => setSelectedCandidate(cand)}
                    >
                      <FaPaperPlane size={11} />
                      <span>Reach Out</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : strategy && !isSearching ? (
        <div className="panel-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No profiles found with this specific query. Try relaxing location or skills.
          </p>
          <button 
            type="button"
            className="btn btn-secondary" 
            style={{ marginTop: '10px' }}
            onClick={() => triggerSearch()}
          >
            Retry Search
          </button>
        </div>
      ) : null}

      {/* Outreach Pitch Modal */}
      {selectedCandidate && (
        <OutreachModal
          candidate={selectedCandidate}
          roleTitle={strategy?.job_title || roleTitle}
          jdSummary={strategy?.brief_summary || jdText.slice(0, 200)}
          onClose={() => setSelectedCandidate(null)}
          onStatusUpdated={handleOutreachSuccess}
        />
      )}

      {/* Delete Job Confirmation Modal */}
      {jobToDelete && (
        <div className="modal-overlay" onClick={() => !isDeletingJob && setJobToDelete(null)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '440px', padding: '28px', textAlign: 'center', borderRadius: '16px' }}
          >
            <div 
              style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '50%', 
                background: '#FEE2E2', 
                color: '#DC2626', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 16px',
                fontSize: '1.3rem'
              }}
            >
              <FaTrashAlt />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Delete Job Opening?
            </h3>

            <p style={{ margin: '0 0 24px', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Are you sure you want to delete <strong>"{jobToDelete.title}"</strong> ({jobToDelete.location})? This role will be permanently removed.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '10px 20px', minWidth: '100px', fontWeight: 600 }}
                onClick={() => setJobToDelete(null)}
                disabled={isDeletingJob}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ 
                  padding: '10px 20px',
                  minWidth: '140px', 
                  background: '#DC2626', 
                  color: '#FFFFFF', 
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: isDeletingJob ? 'not-allowed' : 'pointer'
                }}
                onClick={confirmDeleteJob}
                disabled={isDeletingJob}
              >
                {isDeletingJob ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <FaTrashAlt size={13} />
                )}
                <span>{isDeletingJob ? 'Deleting...' : 'Delete Job'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
