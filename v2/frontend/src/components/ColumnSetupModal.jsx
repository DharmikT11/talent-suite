import React, { useState } from 'react';
import { X, Sliders, Check, Columns, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

const DEFAULT_COLS = [
  "Applicant Name",
  "Email",
  "Phone",
  "Current Title",
  "Years of Experience",
  "Skills"
];

const OPTIONAL_COLS = [
  "Current Company",
  "Location",
  "Highest Education",
  "Notice Period",
  "Expected Salary",
  "LinkedIn URL"
];

const AUTO_COLS = [
  "Date Added",
  "Source File",
  "Status",
  "CV Link"
];

export default function ColumnSetupModal({ isOpen, onClose, onColumnsUpdated }) {
  const [selectedCols, setSelectedCols] = useState([...DEFAULT_COLS, "Current Company", "Location"]);
  const [includeAuto, setIncludeAuto] = useState(true);
  const [customCols, setCustomCols] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const toggleCol = (col) => {
    if (selectedCols.includes(col)) {
      setSelectedCols(selectedCols.filter(c => c !== col));
    } else {
      setSelectedCols([...selectedCols, col]);
    }
  };

  const getFullHeaders = () => {
    const extra = customCols.split(',').map(c => c.trim()).filter(Boolean);
    const combined = [...selectedCols, ...extra, ...(includeAuto ? AUTO_COLS : [])];
    return Array.from(new Set(combined));
  };

  const handleApply = async () => {
    const headers = getFullHeaders();
    if (headers.length === 0) {
      setError('Please select at least one column.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/setup-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to initialize columns');
      }

      setMessage('Columns successfully created in Google Sheet (Row 1 frozen & bolded)!');
      if (onColumnsUpdated) {
        onColumnsUpdated(headers);
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Error updating sheet headers.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const headersPreview = getFullHeaders();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D4ED8' }}>
              <Columns size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', margin: 0, color: '#0F172A' }}>Google Sheet Column Setup</h2>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                Configure the column headers created in Row 1 of your Google Sheet
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '14px' }}>
          {/* Core Columns */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0F172A', display: 'block', marginBottom: '8px' }}>
              Core Candidate Columns (Select details to capture):
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {DEFAULT_COLS.map((col) => {
                const isSelected = selectedCols.includes(col);
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => toggleCol(col)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #2563EB' : '1px solid #CBD5E1',
                      background: isSelected ? '#EFF6FF' : '#FFFFFF',
                      color: isSelected ? '#1D4ED8' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isSelected && <Check size={13} />}
                    <span>{col}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Columns */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0F172A', display: 'block', marginBottom: '8px' }}>
              Additional Professional Fields:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {OPTIONAL_COLS.map((col) => {
                const isSelected = selectedCols.includes(col);
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => toggleCol(col)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #2563EB' : '1px solid #CBD5E1',
                      background: isSelected ? '#EFF6FF' : '#FFFFFF',
                      color: isSelected ? '#1D4ED8' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isSelected && <Check size={13} />}
                    <span>{col}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Columns input */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0F172A', display: 'block', marginBottom: '6px' }}>
              Custom Columns (comma-separated):
            </label>
            <input 
              type="text" 
              className="search-input"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.85rem'
              }}
              placeholder="e.g. Visa Status, Preferred Shift, Referral Source"
              value={customCols}
              onChange={(e) => setCustomCols(e.target.value)}
            />
          </div>

          {/* Auto Columns toggle */}
          <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.825rem', cursor: 'pointer', color: '#0F172A', fontWeight: '600' }}>
              <input 
                type="checkbox"
                checked={includeAuto}
                onChange={(e) => setIncludeAuto(e.target.checked)}
                style={{ accentColor: '#1D4ED8', width: '16px', height: '16px' }}
              />
              <span>Automatically include Tracking Columns (Date Added, Source File, Status, CV Link)</span>
            </label>
            <p style={{ margin: '4px 0 0 26px', fontSize: '0.75rem', color: '#64748B' }}>
              "CV Link" writes a direct Google Drive link with =HYPERLINK formula so you can open resumes with 1 click.
            </p>
          </div>

          {/* Live Preview */}
          <div style={{ background: '#F1F5F9', padding: '10px 14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
              Header Row Preview ({headersPreview.length} Columns):
            </div>
            <div style={{ fontSize: '0.8rem', color: '#1E293B', fontFamily: 'monospace', wordBreak: 'break-word', lineHeight: '1.4' }}>
              {headersPreview.join(' | ')}
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px', background: '#FEE2E2', color: '#B91C1C', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div style={{ padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
              <CheckCircle2 size={16} style={{ color: '#059669', flexShrink: 0 }} />
              <span>{message}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleApply}
              disabled={isSubmitting || headersPreview.length === 0}
            >
              <Sparkles size={16} />
              <span>{isSubmitting ? 'Creating Columns...' : 'Create Columns in Google Sheet'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
