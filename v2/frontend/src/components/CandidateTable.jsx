import React, { useState } from 'react';
import { ExternalLink, Sparkles, Search, ArrowUpDown, FileText } from 'lucide-react';

export default function CandidateTable({ candidates = [], onOpenInterviewKit }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  const getField = (candidate, ...keys) => {
    for (const key of keys) {
      const match = Object.keys(candidate).find(k => k.toLowerCase().includes(key.toLowerCase()));
      if (match && candidate[match]) return String(candidate[match]).trim();
    }
    return '';
  };

  const filtered = candidates.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const name = getField(c, 'name', 'applicant').toLowerCase();
    const role = getField(c, 'title', 'role', 'designation').toLowerCase();
    const skills = getField(c, 'skill').toLowerCase();
    const loc = getField(c, 'location', 'city').toLowerCase();
    return name.includes(term) || role.includes(term) || skills.includes(term) || loc.includes(term);
  });

  return (
    <div className="panel-card" style={{ padding: '20px' }}>
      <div className="search-bar">
        <Search size={18} style={{ color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          className="search-input"
          placeholder="Filter by candidate name, job title, skills, or city..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {filtered.length} of {candidates.length}
          </span>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-medium)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 14px', fontWeight: '600' }}>Candidate</th>
              <th style={{ padding: '12px 14px', fontWeight: '600' }}>Role & Experience</th>
              <th style={{ padding: '12px 14px', fontWeight: '600' }}>Core Skills</th>
              <th style={{ padding: '12px 14px', fontWeight: '600' }}>Location</th>
              <th style={{ padding: '12px 14px', fontWeight: '600' }}>Fit Score</th>
              <th style={{ padding: '12px 14px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No candidates found matching your search.
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => {
                const name = getField(c, 'name', 'applicant') || `Candidate #${i + 1}`;
                const title = getField(c, 'title', 'role', 'designation') || '—';
                const exp = getField(c, 'exp', 'year') || '—';
                const skills = getField(c, 'skill');
                const loc = getField(c, 'location', 'city') || '—';
                const cvLink = getField(c, 'cv link', 'resume link', 'link', 'drive');
                const fitScoreStr = getField(c, 'fit', 'score');

                let fitScore = null;
                if (fitScoreStr) {
                  const parsed = parseInt(fitScoreStr.replace(/[^0-9]/g, ''), 10);
                  if (!isNaN(parsed)) fitScore = parsed;
                }

                return (
                  <tr 
                    key={i} 
                    style={{ 
                      borderBottom: '1px solid var(--border-subtle)', 
                      transition: 'background 0.15s ease' 
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>{name}</span>
                        {getField(c, 'status') && (
                          <span 
                            style={{ 
                              fontSize: '0.65rem', 
                              padding: '1px 6px', 
                              borderRadius: '4px',
                              fontWeight: 700,
                              background: getField(c, 'status').toLowerCase().includes('screened') || getField(c, 'status').toLowerCase().includes('received')
                                ? 'var(--success-bg)'
                                : getField(c, 'status').toLowerCase().includes('outreach')
                                ? '#EDE9FE'
                                : '#EFF6FF',
                              color: getField(c, 'status').toLowerCase().includes('screened') || getField(c, 'status').toLowerCase().includes('received')
                                ? 'var(--success-text)'
                                : getField(c, 'status').toLowerCase().includes('outreach')
                                ? '#6D28D9'
                                : '#1D4ED8',
                              border: `1px solid ${
                                getField(c, 'status').toLowerCase().includes('screened') || getField(c, 'status').toLowerCase().includes('received')
                                  ? 'var(--success-border)'
                                  : getField(c, 'status').toLowerCase().includes('outreach')
                                  ? '#DDD6FE'
                                  : '#BFDBFE'
                              }`,
                            }}
                          >
                            {getField(c, 'status')}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400' }}>
                        {getField(c, 'email', 'mail')}
                      </div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ color: 'var(--primary)', fontWeight: '500' }}>{title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{exp} {exp !== '—' && !String(exp).includes('yr') ? 'yrs' : ''}</div>
                    </td>
                    <td style={{ padding: '14px', maxWidth: '240px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {skills ? skills.split(',').slice(0, 3).map((s, idx) => (
                          <span key={idx} className="skill-tag" style={{ fontSize: '0.7rem' }}>{s.trim()}</span>
                        )) : '—'}
                      </div>
                    </td>
                    <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>
                      {loc}
                    </td>
                    <td style={{ padding: '14px' }}>
                      {fitScore !== null ? (
                        <span className={`match-badge ${fitScore >= 80 ? 'high' : fitScore >= 60 ? 'medium' : 'low'}`}>
                          {fitScore}%
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unscored</span>
                      )}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {cvLink ? (
                          <a 
                            href={cvLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-secondary" 
                            style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          >
                            <FileText size={12} />
                            <span>Resume</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : null}
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                          onClick={() => onOpenInterviewKit(c)}
                        >
                          <Sparkles size={12} />
                          <span>Questions</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
