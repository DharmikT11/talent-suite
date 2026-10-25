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
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
      if (!data.has_ai_key) {
        setIsKeyModalOpen(true);
      }
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
        emailConfig={emailConfig}
        onOpenSheetModal={() => setIsSheetModalOpen(true)}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        onOpenColumnModal={() => setIsColumnModalOpen(true)}
        onOpenEmailModal={() => setIsEmailModalOpen(true)}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div className="search-bar" style={{ width: '400px', marginBottom: 0 }}>
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
              className="btn btn-secondary"
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
        />
      )}

      {/* Floating AI Pipeline Assistant */}
      <AIChatDrawer candidateCount={candidates.length} />

      {/* Modals */}
      {selectedCandidate && (
        <InterviewKitModal 
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}

      {isSheetModalOpen && (
        <SheetModal 
          status={status}
          onClose={() => setIsSheetModalOpen(false)}
          onConnected={() => handleRefresh()}
        />
      )}

      {isKeyModalOpen && (
        <ApiKeyModal 
          currentProvider={status?.provider || 'gemini'}
          maskedKey={status?.masked_key || ''}
          onClose={() => setIsKeyModalOpen(false)}
          onKeySaved={() => handleRefresh()}
        />
      )}

      {isColumnModalOpen && (
        <ColumnSetupModal 
          isOpen={isColumnModalOpen}
          onClose={() => setIsColumnModalOpen(false)}
          onColumnsUpdated={() => handleRefresh()}
        />
      )}

      {isEmailModalOpen && (
        <EmailSettingsModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          onSaved={(newCfg) => {
            setEmailConfig(newCfg);
            fetchStatus();
          }}
        />
      )}
    </div>
  );
}
