import React, { useState, useEffect } from 'react';
import { X, Sparkles, Copy, Check, HelpCircle, Loader2 } from 'lucide-react';

export default function InterviewKitModal({ candidate, onClose }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!candidate) return;
    loadQuestions();
  }, [candidate]);

  const loadQuestions = async () => {
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch('/api/interview-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      if (data.ok && data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        setError('Could not generate questions for this candidate.');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError(err.message || 'Error generating questions.');
      }
    } finally {
      setLoading(false);
    }
  };

  const candidateName = candidate?.name || candidate?.['Applicant Name'] || 'Candidate';
  const candidateRole = candidate?.title || candidate?.['Current Title'] || 'Role';

  const copyAll = () => {
    if (!questions.length) return;
    const text = questions
      .map((q, i) => `${i + 1}. [${q.category}] ${q.question}\n-> Look for: ${q.what_to_look_for}`)
      .join('\n\n');
    navigator.clipboard.writeText(`Interview Kit for ${candidateName} (${candidateRole}):\n\n${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} style={{ color: '#818CF8' }} />
              <h2>AI Interview Kit</h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Tailored evaluation questions for <strong>{candidateName}</strong> ({candidateRole})
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '52px 20px', color: 'var(--text-secondary)' }}>
            <Loader2 size={38} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--primary)' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
              Generating Targeted Interview Questions...
            </h4>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Analyzing {candidateName}'s core skills and experience with AI engine.
            </p>
          </div>
        ) : error ? (
          <div style={{ padding: '24px 20px', textAlign: 'center' }}>
            <div style={{ padding: '14px', background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px' }}>
              {error}
            </div>
            <button className="btn btn-primary" onClick={loadQuestions} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              Try Again
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={copyAll}
              >
                {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy All Questions'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {questions.map((q, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    padding: '18px 20px', 
                    background: '#FFFFFF', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span 
                      style={{ 
                        fontSize: '0.725rem', 
                        fontWeight: '700', 
                        textTransform: 'uppercase', 
                        color: '#1D4ED8', 
                        background: '#EFF6FF', 
                        border: '1px solid #BFDBFE',
                        padding: '3px 9px', 
                        borderRadius: '6px' 
                      }}
                    >
                      {q.category}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-muted)' }}>Question #{idx + 1}</span>
                  </div>

                  <h4 style={{ fontSize: '0.975rem', fontWeight: '600', color: '#0F172A', marginBottom: '12px', lineHeight: '1.5' }}>
                    {q.question}
                  </h4>

                  <div style={{ fontSize: '0.825rem', color: '#334155', display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 14px', borderRadius: '8px', lineHeight: '1.5' }}>
                    <HelpCircle size={15} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
                    <span><strong style={{ color: '#0F172A' }}>What to look for:</strong> {q.what_to_look_for}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
