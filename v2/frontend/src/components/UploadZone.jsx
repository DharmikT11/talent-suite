import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, X, Sparkles, CheckCircle2, AlertCircle, RefreshCw, 
  Briefcase, ArrowRight, ShieldCheck, Check, Bot, Code, Users, BarChart3, 
  SkipForward, AlertTriangle, PlusCircle, FileEdit 
} from 'lucide-react';

const SAMPLE_JDS = [
  {
    id: "aiml",
    role: "AI / ML Engineer",
    icon: Bot,
    jd: "Seeking an AI/ML Engineer with experience in Python, Machine Learning, NLP, LLMs/Generative AI, and backend API integration (FastAPI). Experience fine-tuning models, building RAG systems, and working with modern AI frameworks required."
  },
  {
    id: "fullstack",
    role: "Fullstack Developer",
    icon: Code,
    jd: "Looking for a Senior Fullstack Engineer with experience in React, Node.js, and TypeScript. Experience building responsive UI dashboards, REST APIs, and database engineering (PostgreSQL/MongoDB). Strong communication and problem-solving skills required."
  },
  {
    id: "hr",
    role: "HR & Talent Acquisition",
    icon: Users,
    jd: "Seeking an experienced Talent Acquisition Specialist with background in tech hiring, candidate sourcing on LinkedIn and job portals, screening resumes, interview coordination, and maintaining Google Sheets/ATS pipelines."
  },
  {
    id: "data",
    role: "Data Analyst / BI",
    icon: BarChart3,
    jd: "We need a Data Analyst with experience in SQL, Python, Excel/Google Sheets, and PowerBI or Tableau. Able to clean messy datasets, build KPI dashboards, and deliver actionable business insights to leadership."
  },
  {
    id: "custom",
    role: "Custom JD",
    icon: FileEdit,
    jd: ""
  }
];

export default function UploadZone({ onScreenComplete, isConnected, hasAiKey, onOpenKeyModal }) {
  const [files, setFiles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(SAMPLE_JDS[0].id);
  const [jd, setJd] = useState(SAMPLE_JDS[0].jd);
  const [duplicateMode, setDuplicateMode] = useState('update');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles) => {
    const pdfs = newFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length < newFiles.length) {
      setError('Only PDF resumes are supported.');
    } else {
      setError('');
    }
    setFiles(prev => [...prev, ...pdfs]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectRole = (sample) => {
    setSelectedRoleId(sample.id);
    setJd(sample.jd);
  };

  const handleRunScreening = async () => {
    if (files.length === 0) {
      setError('Please select at least one PDF resume in Step 1 to screen.');
      return;
    }
    if (!hasAiKey) {
      setError('Please configure your AI API key first.');
      if (onOpenKeyModal) onOpenKeyModal();
      return;
    }
    if (!isConnected) {
      setError('Please connect your Google Sheet first in the top navigation bar.');
      return;
    }

    setError('');
    setIsProcessing(true);
    setProgressText(`Processing ${files.length} resume(s) with AI...`);

    const formData = new FormData();
    files.forEach(f => {
      formData.append('files', f);
    });
    if (jd.trim()) {
      formData.append('jd', jd.trim());
    }
    formData.append('duplicate_mode', duplicateMode);

    try {
      const res = await fetch('/api/screen', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Screening failed');
      }

      setResults(data);
      setFiles([]);
      if (onScreenComplete) {
        onScreenComplete(data);
      }
    } catch (err) {
      setError(err.message || 'Error occurred while screening resumes.');
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 3-Step Guided Header Banner */}
      <div className="panel-card" style={{ padding: '16px 20px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', margin: 0, color: '#0F172A', fontWeight: '700' }}>AI Screening Workflow</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>Follow these 3 easy steps to screen, match, and sync candidates to Google Sheets</p>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="stepper-indicator-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: files.length > 0 ? '#10B981' : '#1D4ED8', background: files.length > 0 ? '#ECFDF5' : '#EFF6FF', padding: '6px 12px', borderRadius: '20px', border: files.length > 0 ? '1px solid #A7F3D0' : '1px solid #BFDBFE' }}>
              <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: files.length > 0 ? '#10B981' : '#1D4ED8', color: '#fff', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {files.length > 0 ? <Check size={11} strokeWidth={3} /> : '1'}
              </span>
              <span>Upload Resumes ({files.length})</span>
            </div>

            <ArrowRight size={14} color="#94A3B8" />

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1D4ED8', background: '#EFF6FF', padding: '6px 12px', borderRadius: '20px', border: '1px solid #BFDBFE' }}>
              <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#1D4ED8', color: '#fff', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                2
              </span>
              <span>Role / JD Match</span>
            </div>

            <ArrowRight size={14} color="#94A3B8" />

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', background: '#F1F5F9', padding: '6px 12px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
              <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#64748B', color: '#fff', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                3
              </span>
              <span>Screen & Sync</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Screening Layout */}
      <div className="screen-layout">
        {/* Step 1: Upload Candidate Resumes */}
        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="panel-header">
              <h3>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1D4ED8', color: '#fff', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '6px' }}>1</div>
                <span>Step 1: Upload Resumes (PDF)</span>
              </h3>
              <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: '#EFF6FF', color: '#1D4ED8', fontWeight: '600' }}>
                {files.length} Selected
              </span>
            </div>

            <p style={{ fontSize: '0.825rem', color: '#64748B', marginBottom: '14px' }}>
              Upload one or more candidate CVs in PDF format. Text, contact details, skills, and experience will be automatically extracted.
            </p>

            <div 
              className={`dropzone ${isDragging ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                multiple 
                accept=".pdf" 
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <div className="dropzone-icon">
                <Upload size={26} />
              </div>
              <h4 style={{ fontSize: '1rem', marginBottom: '6px', color: '#0F172A' }}>
                Click to upload or drag & drop CVs
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Bulk upload supported (1 to 50 resumes at once)
              </p>
            </div>

            {files.length > 0 && (
              <div className="file-preview-list" style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                  Resumes ready for screening ({files.length}):
                </div>
                {files.map((file, i) => (
                  <div key={i} className="file-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} style={{ color: '#1D4ED8' }} />
                      <span style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}>
                        {file.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="close-btn"
                      title="Remove file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step 2 & Step 3: Match with Job Role & Duplicate Options */}
        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="panel-header">
              <h3>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1D4ED8', color: '#fff', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '6px' }}>2</div>
                <span>Step 2: Target Role & Requirements</span>
              </h3>
            </div>

            <p style={{ fontSize: '0.825rem', color: '#64748B', marginBottom: '10px' }}>
              Select a target role or enter requirements to automatically calculate <strong>Fit Score (0–100%)</strong>, <strong>Top Strengths</strong>, and <strong>Missing Skills</strong>.
            </p>

            {/* Quick 1-Click Role Presets */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
              {SAMPLE_JDS.map((sample) => {
                const IconComp = sample.icon;
                const isActive = selectedRoleId === sample.id;
                return (
                  <button 
                    key={sample.id}
                    type="button"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      border: isActive ? '1px solid #1D4ED8' : '1px solid #CBD5E1',
                      background: isActive ? '#EFF6FF' : '#FFFFFF',
                      color: isActive ? '#1D4ED8' : '#475569',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => handleSelectRole(sample)}
                  >
                    <IconComp size={14} style={{ color: isActive ? '#1D4ED8' : '#64748B' }} />
                    <span>{sample.role}</span>
                  </button>
                );
              })}
            </div>

            <textarea 
              className="jd-textarea"
              placeholder="Paste custom Job Description or edit requirements above..."
              value={jd}
              onChange={(e) => {
                setJd(e.target.value);
                setSelectedRoleId('custom');
              }}
              style={{ minHeight: '90px' }}
            />

            {/* Step 3: Duplicate Handling Options */}
            <div style={{ marginTop: '16px', padding: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '10px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#1D4ED8', color: '#fff', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</div>
                <span>Step 3: If candidate already exists in Google Sheet:</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  fontSize: '0.825rem', 
                  cursor: 'pointer', 
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: duplicateMode === 'update' ? '#EFF6FF' : 'transparent',
                  border: duplicateMode === 'update' ? '1px solid #BFDBFE' : '1px solid transparent',
                  color: duplicateMode === 'update' ? '#0F172A' : '#475569',
                  transition: 'all 0.15s ease'
                }}>
                  <input 
                    type="radio" 
                    name="dupMode" 
                    value="update" 
                    checked={duplicateMode === 'update'} 
                    onChange={() => setDuplicateMode('update')}
                    style={{ accentColor: '#1D4ED8', width: '16px', height: '16px' }}
                  />
                  <RefreshCw size={15} style={{ color: '#1D4ED8', flexShrink: 0 }} />
                  <span><strong style={{ color: '#1D4ED8' }}>Update Profile (Recommended)</strong> — Refresh details, CV link & new fit score</span>
                </label>

                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  fontSize: '0.825rem', 
                  cursor: 'pointer', 
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: duplicateMode === 'append' ? '#EFF6FF' : 'transparent',
                  border: duplicateMode === 'append' ? '1px solid #BFDBFE' : '1px solid transparent',
                  color: duplicateMode === 'append' ? '#0F172A' : '#475569',
                  transition: 'all 0.15s ease'
                }}>
                  <input 
                    type="radio" 
                    name="dupMode" 
                    value="append" 
                    checked={duplicateMode === 'append'} 
                    onChange={() => setDuplicateMode('append')}
                    style={{ accentColor: '#1D4ED8', width: '16px', height: '16px' }}
                  />
                  <PlusCircle size={15} style={{ color: '#0F172A', flexShrink: 0 }} />
                  <span><strong style={{ color: '#0F172A' }}>Add as New Entry</strong> — Keep history and append duplicate row</span>
                </label>

                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  fontSize: '0.825rem', 
                  cursor: 'pointer', 
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: duplicateMode === 'skip' ? '#EFF6FF' : 'transparent',
                  border: duplicateMode === 'skip' ? '1px solid #BFDBFE' : '1px solid transparent',
                  color: duplicateMode === 'skip' ? '#0F172A' : '#475569',
                  transition: 'all 0.15s ease'
                }}>
                  <input 
                    type="radio" 
                    name="dupMode" 
                    value="skip" 
                    checked={duplicateMode === 'skip'} 
                    onChange={() => setDuplicateMode('skip')}
                    style={{ accentColor: '#1D4ED8', width: '16px', height: '16px' }}
                  />
                  <SkipForward size={15} style={{ color: '#64748B', flexShrink: 0 }} />
                  <span><strong style={{ color: '#0F172A' }}>Skip Duplicates</strong> — Do not process if email exists in sheet</span>
                </label>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            {!hasAiKey && (
              <div style={{ padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FDE68A', color: '#B45309', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} style={{ color: '#D97706', flexShrink: 0 }} />
                  <span>AI Engine requires an API key to screen resumes.</span>
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: '#F59E0B', color: '#B45309' }}
                  onClick={onOpenKeyModal}
                >
                  Add Key
                </button>
              </div>
            )}

            {error && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {results && (
              <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ padding: '12px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: '8px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                  <CheckCircle2 size={18} style={{ color: '#059669' }} />
                  <span>
                    Screening Complete! {results.new || 0} candidate(s) added, {results.updated || 0} updated in Google Sheets!
                  </span>
                </div>
                {results.skipped > 0 && (
                  <div style={{ padding: '8px 12px', background: '#FEF3C7', border: '1px solid #FDE68A', color: '#B45309', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={14} />
                    <span>{results.skipped} candidate(s) skipped as duplicate. (Select "Update Profile" above to overwrite).</span>
                  </div>
                )}
                {results.results && results.results.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                    {results.results.map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontWeight: '500' }}>{r.filename}</span>
                        <span className={`match-badge ${r.status === 'updated' ? 'medium' : r.status === 'success' ? 'high' : 'low'}`} style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {r.status === 'updated' ? (
                            <>
                              <RefreshCw size={11} />
                              <span>Profile Updated</span>
                            </>
                          ) : r.status === 'success' ? (
                            <>
                              <CheckCircle2 size={11} />
                              <span>Added</span>
                            </>
                          ) : r.status === 'duplicate' ? (
                            <>
                              <SkipForward size={11} />
                              <span>Skipped Duplicate</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle size={11} />
                              <span>Failed</span>
                            </>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button 
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: '700' }}
              disabled={isProcessing || files.length === 0}
              onClick={handleRunScreening}
            >
              <Sparkles size={18} />
              <span>{isProcessing ? progressText : files.length === 0 ? "Step 1: Upload CVs to Start Screening" : `Start AI Screening & Scoring (${files.length} CVs)`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
