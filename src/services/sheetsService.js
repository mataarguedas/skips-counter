const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/** Returns true when an API response indicates an expired or invalid token. */
export function isTokenExpiredError(response) {
  return response.status === 401;
}

function authHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

async function throwIfNotOk(res, label) {
  if (!res.ok) {
    throw new Error(`${label}: HTTP ${res.status} ${res.statusText}`);
  }
}

/**
 * Returns true if a row with the same date, time, and username already exists in the tab.
 * Returns false without throwing if the tab does not yet exist (HTTP 400).
 */
export async function checkDuplicateEntry(accessToken, spreadsheetId, tabName, date, time, username) {
  const range = `${encodeURIComponent(tabName)}!A:G`;
  const res = await fetch(`${BASE}/${spreadsheetId}/values/${range}`, {
    headers: authHeaders(accessToken),
  });

  if (res.status === 400) return false;
  await throwIfNotOk(res, 'checkDuplicateEntry');

  const rows = ((await res.json()).values ?? []);
  return rows.some((row) => row[0] === date && row[1] === time && row[3] === username);
}

/**
 * Ensures a tab named `tabName` exists in the spreadsheet.
 * Creates it if it does not exist.
 */
export async function ensureTabExists(accessToken, spreadsheetId, tabName) {
  const res = await fetch(
    `${BASE}/${spreadsheetId}?fields=sheets.properties.title`,
    { headers: authHeaders(accessToken) },
  );
  await throwIfNotOk(res, 'ensureTabExists: get spreadsheet');

  const data = await res.json();
  const titles = (data.sheets ?? []).map((s) => s.properties.title);

  if (titles.includes(tabName)) return;

  const addRes = await fetch(`${BASE}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: tabName } } }],
    }),
  });
  await throwIfNotOk(addRes, 'ensureTabExists: addSheet');
}

/**
 * Ensures row 1 of `tabName` contains the standard header row.
 * Writes it if the row is empty.
 * @returns {boolean} true if the header was just written (tab was brand new), false if it already existed.
 */
export async function ensureHeaderRow(accessToken, spreadsheetId, tabName) {
  const range = `${encodeURIComponent(tabName)}!A1:H1`;
  const res = await fetch(`${BASE}/${spreadsheetId}/values/${range}`, {
    headers: authHeaders(accessToken),
  });
  await throwIfNotOk(res, 'ensureHeaderRow: get row 1');

  const data = await res.json();
  if (data.values && data.values.length > 0) return false;

  const putRes = await fetch(
    `${BASE}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [['Date', 'Time', 'Manager', 'Username', 'Area', 'Utterances', 'Skips', 'Reason']],
      }),
    },
  );
  await throwIfNotOk(putRes, 'ensureHeaderRow: write header');
  return true;
}

/**
 * Applies one-time formatting to a brand-new tab: bold + frozen header row, fixed column widths.
 * Column widths (px): A=90, B=70, C=150, D=130, E=110, F=90, G=150.
 */
export async function formatTabOnFirstUse(accessToken, spreadsheetId, tabName) {
  // Resolve the numeric sheetId — batchUpdate requires it, not the title.
  const metaRes = await fetch(
    `${BASE}/${spreadsheetId}?fields=sheets.properties`,
    { headers: authHeaders(accessToken) },
  );
  await throwIfNotOk(metaRes, 'formatTabOnFirstUse: get sheet list');

  const meta = await metaRes.json();
  const sheet = (meta.sheets ?? []).find((s) => s.properties.title === tabName);
  if (!sheet) throw new Error(`formatTabOnFirstUse: tab "${tabName}" not found`);
  const sheetId = sheet.properties.sheetId;

  const colWidths = [90, 70, 150, 130, 110, 90, 150]; // A–G
  const colRequests = colWidths.map((pixelSize, i) => ({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
      properties: { pixelSize },
      fields: 'pixelSize',
    },
  }));

  const batchRes = await fetch(`${BASE}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: 'userEnteredFormat.textFormat.bold',
          },
        },
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
        ...colRequests,
      ],
    }),
  });
  await throwIfNotOk(batchRes, 'formatTabOnFirstUse: batchUpdate');
}

/**
 * Appends one skip-event row to the tab, always placing it above the TOTAL row.
 *
 * The Sheets `values.append` API appends after the last populated row — which
 * would be the TOTAL row after the first submission, causing double-counting
 * in the SUM formulas. Instead we read column A, detect whether the last row
 * is already a TOTAL row, and overwrite it with new data so that upsertTotalsRow
 * can push TOTAL one row further down.
 *
 * @param {object} rowData - { date, time, managerName, username, area, utterances, skips, reason }
 * @returns {object} The API response JSON.
 */
export async function appendSkipRow(accessToken, spreadsheetId, tabName, rowData) {
  const colRange = `${encodeURIComponent(tabName)}!A:A`;
  const colRes = await fetch(`${BASE}/${spreadsheetId}/values/${colRange}`, {
    headers: authHeaders(accessToken),
  });
  await throwIfNotOk(colRes, 'appendSkipRow: get column A');

  const colData = await colRes.json();
  const rows = colData.values ?? [];
  const lastRow = rows.length;
  const lastCellValue = rows[lastRow - 1]?.[0] ?? '';

  // If a TOTAL row exists at the bottom, overwrite it; otherwise write to the next blank row.
  const writeRow = lastCellValue === 'TOTAL' ? lastRow : lastRow + 1;
  const range = `${encodeURIComponent(tabName)}!A${writeRow}:H${writeRow}`;

  const res = await fetch(
    `${BASE}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [[
          rowData.date,
          rowData.time,
          rowData.managerName,
          rowData.username,
          rowData.area,
          rowData.utterances,
          rowData.skips,
          rowData.reason || '',
        ]],
      }),
    },
  );
  await throwIfNotOk(res, 'appendSkipRow');
  return res.json();
}

/**
 * Writes (or overwrites) a TOTAL row for the given workday at the bottom of the sheet.
 * Each calendar day gets exactly one TOTAL row summarising only that day's submissions.
 *
 * @param {string} todayDate - Date in yyyy-MM-dd format (e.g. "2025-04-21").
 */
export async function upsertTotalsRow(accessToken, spreadsheetId, tabName, todayDate) {
  // 1. Read every row so we can classify them without a parallel structure.
  const fullRange = `${encodeURIComponent(tabName)}!A:H`;
  const res = await fetch(`${BASE}/${spreadsheetId}/values/${fullRange}`, {
    headers: authHeaders(accessToken),
  });
  await throwIfNotOk(res, 'upsertTotalsRow: read all rows');
  const allRows = (await res.json()).values ?? [];

  // 2. Separate today's data rows from existing TOTAL rows for today.
  const todayRows = [];
  const totalRowRanges = [];
  let lastNonTotalIndex = -1;

  allRows.forEach((row, i) => {
    const colA = row[0] ?? '';
    const colB = row[1] ?? '';
    if (colA === 'TOTAL' && colB === todayDate) {
      // Previous TOTAL for today — will be cleared before rewriting.
      totalRowRanges.push(`'${tabName}'!A${i + 1}:H${i + 1}`);
    } else {
      if (colA === todayDate) todayRows.push(row);
      lastNonTotalIndex = i;
    }
  });

  // 3. Clear any stale TOTAL rows for today.
  if (totalRowRanges.length > 0) {
    const clearRes = await fetch(`${BASE}/${spreadsheetId}/values:batchClear`, {
      method: 'POST',
      headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ranges: totalRowRanges }),
    });
    await throwIfNotOk(clearRes, 'upsertTotalsRow: clear stale TOTAL rows');
  }

  // 4. Sum today's utterances (col F, index 5) and skips (col G, index 6).
  const totalUtterances = todayRows.reduce((sum, row) => sum + (Number(row[5]) || 0), 0);
  const totalSkips = todayRows.reduce((sum, row) => sum + (Number(row[6]) || 0), 0);

  // 5. Write the new TOTAL row one position below the last non-total row.
  const totalsRowNum = lastNonTotalIndex + 2; // +1 for 1-indexed sheet, +1 for next row
  const totalsRange = `${encodeURIComponent(tabName)}!A${totalsRowNum}:H${totalsRowNum}`;
  const putRes = await fetch(
    `${BASE}/${spreadsheetId}/values/${totalsRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [['TOTAL', todayDate, '', '', '', totalUtterances, totalSkips, '']],
      }),
    },
  );
  await throwIfNotOk(putRes, 'upsertTotalsRow: write TOTAL row');
}
