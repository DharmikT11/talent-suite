import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MetricsBar from './components/MetricsBar';
import UploadZone from './components/UploadZone';
import CandidateCard from './components/CandidateCard';
import CandidateTable from './components/CandidateTable';
import InterviewKitModal from './components/InterviewKitModal';
import SheetModal from './components/SheetModal';
import ApiKeyModal from './components/ApiKeyModal';
import ColumnSetupModal from './components/ColumnSetupModal';
import EmailSettingsModal from './components/EmailSettingsModal';
import SecretAdminModal from './components/SecretAdminModal';
import OutreachModal from './components/OutreachModal';
import AIChatDrawer from './components/AIChatDrawer';
import TalentSourcer from './components/TalentSourcer';
import CandidateApplyPortal from './components/CandidateApplyPortal';
import { LayoutGrid, Table as TableIcon, UploadCloud, Search, Sparkles, Key, Columns, Compass } from 'lucide-react';

export default function App() {
  const isApplyPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/apply');

  if (isApplyPage) {
    return <CandidateApplyPortal />;
  }

  const [activeTab, setActiveTab] = useState('source');
  const [status, setStatus] = useState(null);
  const [emailConfig, setEmailConfig] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSecretAdminOpen, setIsSecretAdminOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [outreachCandidate, setOutreachCandidate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  const fetchEmailConfig = async () => {
    try {
      const res = await fetch('/api/email/settings');
      const data = await res.json();
      if (data.ok) {
        setEmailConfig(data);
      }
    } catch (err) {
      console.error('Failed to fetch email settings:', err);
    }
  };

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/candidates');
      const data = await res.json();
      if (data.ok && data.candidates) {
        setCandidates(data.candidates);
      }
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchEmailConfig();
    fetchCandidates();

    // Secret Admin Console Shortcut: Ctrl + Shift + K or Ctrl + Shift + S
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'K' || e.key === 'k' || e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        setIsSecretAdminOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRefresh = async () => {
    await fetchStatus();
    await fetchEmailConfig();
    await fetchCandidates();
  };

  const handleScreenComplete = (screenResult) => {
    handleRefresh();
    setActiveTab('directory');
  };

  // Helper to extract fields
  const getField = (candidate, ...keys) => {
    for (const key of keys) {
      const match = Object.keys(candidate).find(k => k.toLowerCase().includes(key.toLowerCase()));
      if (match && candidate[match]) return String(candidate[match]).trim();
    }
    return '';
  };

  const filteredCandidates = candidates.filter(c => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = getField(c, 'name', 'applicant').toLowerCase();
    const role = getField(c, 'title', 'role', 'designation').toLowerCase();
    const skills = getField(c, 'skill').toLowerCase();
    const loc = getField(c, 'location', 'city').toLowerCase();
    return name.includes(term) || role.includes(term) || skills.includes(term) || loc.includes(term);
  });

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Header 
        status={status} 
        onOpenSecretAdmin={() => setIsSecretAdminOpen(true)}
        onRefresh={handleRefresh}
        loading={loading}
      />

      {/* Analytics Summary */}
      <MetricsBar candidates={candidates} status={status} />

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'source' ? 'active' : ''}`}
          onClick={() => setActiveTab('source')}
        >
          <Compass size={17} />
          <span>1. Job Roles & Sourcing</span>
        </button>

        <button 
          className={`tab-btn ${activeTab === 'screen' ? 'active' : ''}`}
          onClick={() => setActiveTab('screen')}
        >
          <UploadCloud size={17} />
          <span>2. AI CV Screening</span>
        </button>

        <button 
          className={`tab-btn ${activeTab === 'directory' ? 'active' : ''}`}
          onClick={() => setActiveTab('directory')}
        >
          <LayoutGrid size={17} />
          <span>3. Candidate Pipeline ({candidates.length})</span>
        </button>

        <button 
          className={`tab-btn ${activeTab === 'table' ? 'active' : ''}`}
          onClick={() => setActiveTab('table')}
        >
          <TableIcon size={17} />
          <span>4. Spreadsheet View</span>
        </button>
      </div>

      {/* Active Tab Content */}
      {activeTab === 'screen' && (
        <UploadZone 
          onScreenComplete={handleScreenComplete}
          isConnected={Boolean(status?.sheet_connected)}
          hasAiKey={Boolean(status?.has_ai_key)}
          onOpenKeyModal={() => setIsKeyModalOpen(true)}
        />
      )}

      {activeTab === 'source' && (
        <TalentSourcer onCandidateUpdated={handleRefresh} />
      )}

      {activeTab === 'directory' && (
        <div>
          <div className="pipeline-header-bar">
            <div className="search-bar pipeline-search-box">
              <Search size={18} style={{ color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="search-input"
                placeholder="Search candidate name, role, skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              className="btn btn-secondary pipeline-screen-btn"
              onClick={() => setActiveTab('screen')}
            >
              <UploadCloud size={16} />
              <span>+ Screen New Resumes</span>
            </button>
          </div>

          {filteredCandidates.length === 0 ? (
            <div className="panel-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Sparkles size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No candidates found</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto 20px', fontSize: '0.9rem' }}>
                {candidates.length === 0 
                  ? "Your Google Sheet is connected but has no candidates yet. Drop some candidate CVs in the screening tab to parse them."
                  : "No candidates match your current search filter."}
              </p>
              {candidates.length === 0 && (
                <button className="btn btn-primary" onClick={() => setActiveTab('screen')}>
                  <UploadCloud size={18} />
                  <span>Upload & Screen Resumes Now</span>
                </button>
              )}
            </div>
          ) : (
            <div className="candidate-grid">
              {filteredCandidates.map((candidate, i) => (
                <CandidateCard 
                  key={candidate.id || i}
                  candidate={candidate}
                  onOpenInterviewKit={(cand) => setSelectedCandidate(cand)}
                  onOpenOutreach={(cand) => setOutreachCandidate(cand)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'table' && (
        <CandidateTable 
          candidates={candidates}
          onOpenInterviewKit={(cand) => setSelectedCandidate(cand)}
          onOpenOutreach={(cand) => setOutreachCandidate(cand)}
        />
      )}

      {/* Floating AI Pipeline Assistant */}
      <AIChatDrawer candidateCount={candidates.length} />

      {/* Modals */}
      {outreachCandidate && (
        <OutreachModal 
          candidate={outreachCandidate}
          jobTitle={getField(outreachCandidate, 'title', 'role', 'designation') || 'Engineering Position'}
          jdSummary="Key technical position at our company."
          onClose={() => setOutreachCandidate(null)}
          onStatusUpdated={() => handleRefresh()}
        />
      )}

      {selectedCandidate && (
        <InterviewKitModal 
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}

      {/* Secret Enterprise Admin Console (Shortcut: Ctrl + Shift + K) */}
      {isSecretAdminOpen && (
        <SecretAdminModal
          isOpen={isSecretAdminOpen}
          onClose={() => setIsSecretAdminOpen(false)}
          status={status}
          emailConfig={emailConfig}
          onKeySaved={() => handleRefresh()}
          onSheetConnected={() => handleRefresh()}
          onEmailSaved={(newCfg) => {
            setEmailConfig(newCfg);
            fetchStatus();
          }}
          onColumnsUpdated={() => handleRefresh()}
        />
      )}
    </div>
  );
}
