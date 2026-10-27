import React, { useState } from 'react';
import { X, Key, Check, Eye, EyeOff, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';

export default function ApiKeyModal({ currentProvider, maskedKey, onClose, onKeySaved }) {
  const [provider, setProvider] = useState(currentProvider !== 'none' ? currentProvider : 'gemini');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Please paste your API key.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/settings/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, api_key: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to save API key');
      }

      setSuccess(data.message || 'API key saved successfully!');
      setTimeout(() => {
        if (onKeySaved) onKeySaved(provider);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Error saving API key.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Key size={20} />
            </div>
            <div>
              <h2>AI Provider Settings</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Configure your AI model for resume screening & JD matching
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              Select AI Engine
            </label>
            <div className="provider-grid">
              {[
                { id: 'gemini', label: 'Google Gemini', sub: 'Fast & Free' },
                { id: 'anthropic', label: 'Claude', sub: '3.5 Haiku' },
                { id: 'openai', label: 'OpenAI', sub: 'GPT-4o Mini' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`btn ${provider === p.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flexDirection: 'column', padding: '10px 8px', textAlign: 'center', gap: '2px' }}
                  onClick={() => setProvider(p.id)}
                >
                  <span style={{ fontSize: '0.825rem', fontWeight: '700' }}>{p.label}</span>
                  <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>{p.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                {provider === 'gemini' ? 'Google AI Studio Key' : provider === 'anthropic' ? 'Anthropic API Key' : 'OpenAI API Key'}
              </label>
              {maskedKey && (
                <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
                  Active: {maskedKey}
                </span>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <input 
                type={showKey ? 'text' : 'password'}
                className="search-input"
                style={{ 
                  background: 'var(--bg-elevated)', 
                  border: '1px solid var(--border-medium)', 
                  borderRadius: '8px', 
                  padding: '10px 42px 10px 14px', 
                  fontSize: '0.875rem' 
                }}
                placeholder={provider === 'gemini' ? 'AIzaSy...' : provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {provider === 'gemini' && (
              <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Don't have a key?{' '}
                <a 
                  href="https://aistudio.google.com/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                >
                  <span>Get a free Gemini API key</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            )}
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: '#DC2626', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={{ padding: '10px 14px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: '#059669', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={16} />
              <span>{success}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button 
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={isSubmitting || !apiKey.trim()}
            >
              <Sparkles size={16} />
              <span>{isSubmitting ? 'Saving...' : 'Save & Activate Key'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
