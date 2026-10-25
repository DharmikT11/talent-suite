/**
 * Talent Suite – Google Sheet connector with Google Drive CV Storage
 *
 * Paste this whole file into your Google Sheet:
 *   Extensions → Apps Script → replace everything in Code.gs → Save
 *   Deploy → Manage deployments → Edit → Version: New version → Deploy
 *   (Or: Deploy → New deployment → Web app, Execute as: Me, Who has access: Anyone)
 *   Authorize access → copy the Web app URL (ends with /exec)
 *
 * Paste that URL into the Talent Suite sidebar. Treat it like a password:
 * anyone holding it can read and add rows to this sheet.
 */

// Leave blank to use the first tab of the spreadsheet.
const SHEET_NAME = '';

// Optional extra protection. If you set a value here, enter the same value
// in the app's "Access key" field.
const ACCESS_KEY = '';

function doGet(e) {
  return handle_(e && e.parameter ? e.parameter : {});
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'Request body is not valid JSON.' });
  }
  return handle_(Object.assign({}, e && e.parameter, body));
}

function handle_(params) {
  try {
    if (ACCESS_KEY && params.key !== ACCESS_KEY) {
      return json_({ ok: false, error: 'Access key is missing or incorrect.' });
    }
    const tabName = params.sheet || params.tab || '';
    const action = params.action || 'read';
    if (action === 'read') return json_(read_(tabName));
    if (action === 'setHeaders') return json_(setHeaders_(params.headers, tabName));
    if (action === 'append') return json_(append_(params.rows, tabName));
    if (action === 'updateOrAppend') return json_(updateOrAppend_(params.rows, tabName));
    return json_({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function sheet_(tabName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = tabName || SHEET_NAME;
  if (!name) return ss.getSheets()[0];
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    // Auto-initialize standard headers for the new tab
    if (/sourced/i.test(name)) {
      const defaultSourcedHeaders = [
        "Candidate Name", "Role / Title", "Location", "Matched Skills",
        "Platform", "Profile URL", "Fit Score", "Outreach Status", "Last Contacted", "Date Sourced"
      ];
      sh.getRange(1, 1, 1, defaultSourcedHeaders.length).setValues([defaultSourcedHeaders]).setFontWeight('bold');
      sh.setFrozenRows(1);
    } else if (/applicant/i.test(name)) {
      const defaultApplicantHeaders = [
        "Applicant Name", "Email", "Phone", "Current Title", "Years of Experience",
        "Skills", "Current Company", "Highest Education", "Location", "Notice Period",
        "Expected Salary", "CV Link", "Date Added", "Status"
      ];
      sh.getRange(1, 1, 1, defaultApplicantHeaders.length).setValues([defaultApplicantHeaders]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

function headers_(sh) {
  const lastCol = sh.getLastColumn();
  if (lastCol === 0) return [];
  return sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function (h) {
    return String(h).trim();
  });
}

function read_(tabName) {
  const sh = sheet_(tabName);
  const headers = headers_(sh);
  const lastRow = sh.getLastRow();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (lastRow <= 1 || !headers.length) {
    return {
      ok: true,
      spreadsheet: ss.getName(),
      spreadsheet_url: ss.getUrl(),
      sheet: sh.getName(),
      headers: headers,
      rows: [],
    };
  }

  const range = sh.getRange(2, 1, lastRow - 1, headers.length);
  const displayValues = range.getDisplayValues();
  const formulas = range.getFormulas();

  // If a cell contains a HYPERLINK formula, extract the actual link URL so the app can link directly to it
  for (let r = 0; r < displayValues.length; r++) {
    for (let c = 0; c < headers.length; c++) {
      const formula = formulas[r][c];
      if (formula && typeof formula === 'string' && formula.toUpperCase().startsWith('=HYPERLINK(')) {
        const match = formula.match(/=HYPERLINK\(\s*"([^"]+)"/i);
        if (match && match[1]) {
          displayValues[r][c] = match[1];
        }
      }
    }
  }

  return {
    ok: true,
    spreadsheet: ss.getName(),
    spreadsheet_url: ss.getUrl(),
    sheet: sh.getName(),
    headers: headers,
    rows: displayValues,
  };
}

function setHeaders_(headers, tabName) {
  if (!Array.isArray(headers) || !headers.length) {
    throw new Error('headers must be a non-empty list.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(tabName);
    if (headers_(sh).some(function (h) { return h; })) {
      throw new Error('This sheet already has a header row; it was left unchanged.');
    }
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
    return { ok: true, headers: headers };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Gets or creates a 'Talent Suite Resumes' folder in Google Drive.
 */
function getOrCreateResumeFolder_() {
  const folderName = 'Talent Suite Resumes';
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  const folder = DriveApp.createFolder(folderName);
  try {
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    Logger.log('Could not set public folder sharing: ' + err);
  }
  return folder;
}

/**
 * Uploads a base64-encoded PDF to the Google Drive folder and returns the file's view URL.
 */
function uploadResumeToDrive_(fileName, base64Data) {
  if (!base64Data) return '';
  const folder = getOrCreateResumeFolder_();
  const bytes = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(bytes, 'application/pdf', fileName);
  const file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    Logger.log('Could not set public file sharing: ' + err);
  }
  return file.getUrl();
}

function append_(rows, tabName) {
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error('rows must be a non-empty list.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = sheet_(tabName);
    let headers = headers_(sh);
    if (!headers.some(function (h) { return h; })) {
      throw new Error('The sheet has no header row yet.');
    }

    // Check if a CV Link / Resume Link column exists
    let cvLinkIndex = headers.findIndex(function (h) {
      const lower = h.toLowerCase().trim();
      return lower === 'cv link' || lower === 'resume link' || lower === 'cv url' || lower === 'resume url';
    });

    const hasFiles = rows.some(function (r) { return r._file_base64; });

    // If CV Link column doesn't exist and we have files to upload, add it automatically
    if (cvLinkIndex === -1 && hasFiles) {
      const newCol = headers.length + 1;
      sh.getRange(1, newCol).setValue('CV Link').setFontWeight('bold');
      headers.push('CV Link');
      cvLinkIndex = headers.length - 1;
    }

    // Upload CV files to Google Drive and set the clickable link
    rows.forEach(function (row) {
      if (row._file_base64 && cvLinkIndex !== -1) {
        try {
          const cvUrl = uploadResumeToDrive_(row._file_name || 'Candidate_CV.pdf', row._file_base64);
          if (cvUrl) {
            const colName = headers[cvLinkIndex];
            row[colName] = '=HYPERLINK("' + cvUrl + '", "View CV")';
          }
        } catch (uploadErr) {
          Logger.log('Drive upload failed: ' + uploadErr);
        }
      }
    });

    const values = rows.map(function (row) {
      return headers.map(function (h) {
        return h && row[h] !== undefined && row[h] !== null ? safeCell_(row[h]) : '';
      });
    });

    const start = sh.getLastRow() + 1;
    sh.getRange(start, 1, values.length, headers.length).setValues(values);
    return { ok: true, appended: values.length, firstRow: start };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Updates an existing candidate's row in-place if their email matches, or appends if new.
 */
function updateOrAppend_(rows, tabName) {
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error('rows must be a non-empty list.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = sheet_(tabName);
    let headers = headers_(sh);
    if (!headers.some(function (h) { return h; })) {
      throw new Error('The sheet has no header row yet.');
    }

    // Find email column index
    const emailColIndex = headers.findIndex(function (h) {
      return /email|mail/i.test(h);
    });

    // Check if a CV Link / Resume Link column exists
    let cvLinkIndex = headers.findIndex(function (h) {
      const lower = h.toLowerCase().trim();
      return lower === 'cv link' || lower === 'resume link' || lower === 'cv url' || lower === 'resume url';
    });

    const hasFiles = rows.some(function (r) { return r._file_base64; });
    if (cvLinkIndex === -1 && hasFiles) {
      const newCol = headers.length + 1;
      sh.getRange(1, newCol).setValue('CV Link').setFontWeight('bold');
      headers.push('CV Link');
      cvLinkIndex = headers.length - 1;
    }

    // Upload CV files to Google Drive and set the clickable link
    rows.forEach(function (row) {
      if (row._file_base64 && cvLinkIndex !== -1) {
        try {
          const cvUrl = uploadResumeToDrive_(row._file_name || 'Candidate_CV.pdf', row._file_base64);
          if (cvUrl) {
            const colName = headers[cvLinkIndex];
            row[colName] = '=HYPERLINK("' + cvUrl + '", "View CV")';
          }
        } catch (uploadErr) {
          Logger.log('Drive upload failed: ' + uploadErr);
        }
      }
    });

    const lastRow = sh.getLastRow();
    let existingEmails = [];
    let existingNames = [];

    // Find name column index
    const nameColIndex = headers.findIndex(function (h) {
      return /name|applicant/i.test(h);
    });

    if (lastRow > 1) {
      if (emailColIndex !== -1) {
        const emailVals = sh.getRange(2, emailColIndex + 1, lastRow - 1, 1).getDisplayValues();
        existingEmails = emailVals.map(function (r) { return String(r[0] || '').trim().toLowerCase(); });
      }
      if (nameColIndex !== -1) {
        const nameVals = sh.getRange(2, nameColIndex + 1, lastRow - 1, 1).getDisplayValues();
        existingNames = nameVals.map(function (r) { return String(r[0] || '').trim().toLowerCase(); });
      }
    }

    let updatedCount = 0;
    const appendedRows = [];

    rows.forEach(function (row) {
      let email = '';
      if (emailColIndex !== -1 && headers[emailColIndex]) {
        email = String(row[headers[emailColIndex]] || '').trim().toLowerCase();
      }
      let name = '';
      if (nameColIndex !== -1 && headers[nameColIndex]) {
        name = String(row[headers[nameColIndex]] || '').trim().toLowerCase();
      }

      // Match first by email (must contain @ to be a valid email); if no email match, match by applicant name
      let matchIndex = (email && email.indexOf('@') !== -1) ? existingEmails.lastIndexOf(email) : -1;
      if (matchIndex === -1 && name) {
        matchIndex = existingNames.lastIndexOf(name);
      }

      if (matchIndex !== -1) {
        const targetRow = matchIndex + 2;
        const existingRowVals = sh.getRange(targetRow, 1, 1, headers.length).getValues()[0];
        const rowVals = headers.map(function (h, colIdx) {
          if (row[h] !== undefined && row[h] !== null && String(row[h]).trim() !== '') {
            return safeCell_(row[h]);
          }
          return existingRowVals[colIdx] !== undefined ? existingRowVals[colIdx] : '';
        });
        sh.getRange(targetRow, 1, 1, headers.length).setValues([rowVals]);
        updatedCount++;
      } else {
        appendedRows.push(row);
      }
    });

    if (appendedRows.length > 0) {
      const values = appendedRows.map(function (row) {
        return headers.map(function (h) {
          return h && row[h] !== undefined && row[h] !== null ? safeCell_(row[h]) : '';
        });
      });
      const start = sh.getLastRow() + 1;
      sh.getRange(start, 1, values.length, headers.length).setValues(values);
    }

    return { ok: true, updated: updatedCount, appended: appendedRows.length };
  } finally {
    lock.releaseLock();
  }
}

// Text from a CV must never be evaluated as a formula, unless it's a safe HYPERLINK formula.
function safeCell_(value) {
  if (typeof value !== 'string') return value;
  if (/^=HYPERLINK\(/i.test(value)) return value;
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
