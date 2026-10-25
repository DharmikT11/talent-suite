import React, { useState } from 'react';
import { X, Database, Check, Copy, ExternalLink, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

const APPS_SCRIPT_CODE = `/**
 * Talent Suite – Google Sheet connector with Google Drive CV Storage
 * Paste this whole file into your Google Sheet:
 *   Extensions → Apps Script → replace everything in Code.gs → Save
 *   Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone)
 *   Authorize access → copy the Web app URL (ends with /exec)
 */
const SHEET_NAME = '';
const ACCESS_KEY = '';

function doGet(e) { return handle_(e && e.parameter ? e.parameter : {}); }
function doPost(e) {
  let body;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json_({ ok: false, error: 'Invalid JSON.' }); }
  return handle_(Object.assign({}, e && e.parameter, body));
}

function handle_(params) {
  try {
    if (ACCESS_KEY && params.key !== ACCESS_KEY) return json_({ ok: false, error: 'Invalid key.' });
    const action = params.action || 'read';
    if (action === 'read') return json_(read_());
    if (action === 'setHeaders') return json_(setHeaders_(params.headers));
    if (action === 'append') return json_(append_(params.rows));
    return json_({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
}

function headers_(sh) {
  const lastCol = sh.getLastColumn();
  if (lastCol === 0) return [];
  return sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(h => String(h).trim());
}

function read_() {
  const sh = sheet_();
  const headers = headers_(sh);
  const lastRow = sh.getLastRow();
  if (lastRow <= 1 || !headers.length) {
    return { ok: true, spreadsheet: SpreadsheetApp.getActiveSpreadsheet().getName(), sheet: sh.getName(), headers: headers, rows: [] };
  }
  const range = sh.getRange(2, 1, lastRow - 1, headers.length);
  const displayValues = range.getDisplayValues();
  const formulas = range.getFormulas();
  for (let r = 0; r < displayValues.length; r++) {
    for (let c = 0; c < headers.length; c++) {
      const f = formulas[r][c];
      if (f && typeof f === 'string' && f.toUpperCase().startsWith('=HYPERLINK(')) {
        const m = f.match(/=HYPERLINK\\(\\s*"([^"]+)"/i);
        if (m && m[1]) displayValues[r][c] = m[1];
      }
    }
  }
  return { ok: true, spreadsheet: SpreadsheetApp.getActiveSpreadsheet().getName(), sheet: sh.getName(), headers: headers, rows: displayValues };
}

function setHeaders_(headers) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_();
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
    return { ok: true, headers: headers };
  } finally { lock.releaseLock(); }
}

function getOrCreateResumeFolder_() {
  const name = 'Talent Suite Resumes';
  const folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  const folder = DriveApp.createFolder(name);
  try { folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  return folder;
}

function uploadResumeToDrive_(fileName, base64Data) {
  if (!base64Data) return '';
  const folder = getOrCreateResumeFolder_();
  const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'application/pdf', fileName);
  const file = folder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  return file.getUrl();
}

function append_(rows) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = sheet_();
    let headers = headers_(sh);
    let cvLinkIndex = headers.findIndex(h => {
      const l = h.toLowerCase().trim();
      return l === 'cv link' || l === 'resume link' || l === 'cv url';
    });
    if (cvLinkIndex === -1 && rows.some(r => r._file_base64)) {
      sh.getRange(1, headers.length + 1).setValue('CV Link').setFontWeight('bold');
      headers.push('CV Link');
      cvLinkIndex = headers.length - 1;
    }
    rows.forEach(row => {
      if (row._file_base64 && cvLinkIndex !== -1) {
        try {
          const url = uploadResumeToDrive_(row._file_name || 'Candidate_CV.pdf', row._file_base64);
          if (url) row[headers[cvLinkIndex]] = '=HYPERLINK("' + url + '", "View CV")';
        } catch (e) {}
      }
    });
    const values = rows.map(r => headers.map(h => h && r[h] !== undefined ? safeCell_(r[h]) : ''));
    const start = sh.getLastRow() + 1;
    sh.getRange(start, 1, values.length, headers.length).setValues(values);
    return { ok: true, appended: values.length, firstRow: start };
  } finally { lock.releaseLock(); }
}

function safeCell_(val) {
  if (typeof val !== 'string') return val;
  if (/^=HYPERLINK\\(/i.test(val)) return val;
  return /^[=+\\-@]/.test(val) ? "'" + val : val;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}`;

export default function SheetModal({ status, onClose, onConnected }) {
  const [url, setUrl] = useState(status?.sheet_url || '');
  const [accessKey, setAccessKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scriptCode, setScriptCode] = useState(APPS_SCRIPT_CODE);

  React.useEffect(() => {
    fetch('/api/apps-script-code')
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.code) {
          setScriptCode(data.code);
        }
      })
      .catch(() => {});
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter your Google Apps Script Web App URL.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), access_key: accessKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Connection failed');
      }

      if (onConnected) onConnected(data);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not connect to Google Sheet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={22} style={{ color: '#818CF8' }} />
            <div>
              <h2>Google Sheet Connector</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Live two-way sync with Google Sheets & Google Drive
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Apps Script Web App URL (ends with /exec)
            </label>
            <input 
              type="text" 
              className="search-input"
              style={{ 
                background: 'var(--bg-elevated)', 
                border: '1px solid var(--border-medium)', 
                borderRadius: '8px', 
                padding: '10px 14px', 
                fontSize: '0.875rem' 
              }}
              placeholder="https://script.google.com/macros/s/.../exec"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Access Key (Optional)
            </label>
            <input 
              type="password" 
              className="search-input"
              style={{ 
                background: 'var(--bg-elevated)', 
                border: '1px solid var(--border-medium)', 
                borderRadius: '8px', 
                padding: '10px 14px', 
                fontSize: '0.875rem' 
              }}
              placeholder="Leave blank if not set in Code.gs"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
            />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'var(--danger-bg)', color: '#FCA5A5', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '6px' }}
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Verifying Connection...' : 'Connect to Google Sheet'}</span>
          </button>
        </form>

        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <button 
            type="button" 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#818CF8', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '0.85rem', 
              fontWeight: '600' 
            }}
            onClick={() => setShowCode(!showCode)}
          >
            <span>How to setup in Google Sheets (2 minutes)</span>
            {showCode ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showCode && (
            <div style={{ marginTop: '14px', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '10px', fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <ol style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Open your Google Sheet → click <strong>Extensions → Apps Script</strong>.</li>
                <li>Delete existing code and paste the connector script below.</li>
                <li>Click <strong>Save</strong> icon.</li>
                <li>Click <strong>Deploy → New deployment → Web app</strong> (Execute as: <code>Me</code>, Who has access: <code>Anyone</code>).</li>
                <li>Click <strong>Deploy</strong> → <strong>Authorize access</strong>.
                  <div style={{ color: '#FBBF24', fontSize: '0.78rem', marginTop: '4px' }}>
                    *Tip: When Google shows "Google hasn't verified this app", click <strong>Advanced → Go to (unsafe) → Allow</strong>.
                  </div>
                </li>
                <li>Copy the Web app URL (ends with <code>/exec</code>) and paste it above!</li>
              </ol>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', marginBottom: '8px' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                  onClick={copyScript}
                >
                  {copied ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
                  <span>{copied ? 'Script Copied!' : 'Copy Code.gs Script'}</span>
                </button>
              </div>

              <pre style={{ maxHeight: '180px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', fontSize: '0.72rem', color: '#CBD5E1', fontFamily: 'monospace' }}>
                {APPS_SCRIPT_CODE}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
