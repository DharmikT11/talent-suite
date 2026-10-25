import React from 'react';
import { Users, Award, Briefcase, Cpu } from 'lucide-react';

export default function MetricsBar({ candidates = [], status }) {
  const total = candidates.length;
  
  // Calculate average experience
  let totalExp = 0;
  let expCount = 0;
  let highMatches = 0;

  candidates.forEach(c => {
    // Check experience column
    const expKey = Object.keys(c).find(k => k.toLowerCase().includes('exp') || k.toLowerCase().includes('year'));
    if (expKey) {
      const val = parseFloat(String(c[expKey]).replace(/[^0-9.]/g, ''));
      if (!isNaN(val)) {
        totalExp += val;
        expCount++;
      }
    }

    // Check fit score
    const fitKey = Object.keys(c).find(k => k.toLowerCase().includes('fit') || k.toLowerCase().includes('score'));
    if (fitKey) {
      const score = parseInt(String(c[fitKey]).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(score) && score >= 80) {
        highMatches++;
      }
    }
  });

  const avgExp = expCount > 0 ? (totalExp / expCount).toFixed(1) : '—';
  const providerName = status?.provider === 'gemini' 
    ? 'Gemini 2.5 Flash' 
    : status?.provider === 'anthropic' 
    ? 'Claude 3.5' 
    : status?.provider === 'openai' 
    ? 'GPT-4o Mini' 
    : 'AI Active';

  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="metric-icon-box" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818CF8' }}>
          <Users size={22} />
        </div>
        <div className="metric-info">
          <div className="metric-label">Total Pipeline</div>
          <div className="metric-value">{total} Candidates</div>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34D399' }}>
          <Award size={22} />
        </div>
        <div className="metric-info">
          <div className="metric-label">Top Fit Matches</div>
          <div className="metric-value">{highMatches > 0 ? `${highMatches} Candidates` : 'Screening Ready'}</div>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon-box" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24' }}>
          <Briefcase size={22} />
        </div>
        <div className="metric-info">
          <div className="metric-label">Avg. Experience</div>
          <div className="metric-value">{avgExp !== '—' ? `${avgExp} Yrs` : 'N/A'}</div>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon-box" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22D3EE' }}>
          <Cpu size={22} />
        </div>
        <div className="metric-info">
          <div className="metric-label">AI Engine</div>
          <div className="metric-value" style={{ fontSize: '1.25rem' }}>{providerName}</div>
        </div>
      </div>
    </div>
  );
}
