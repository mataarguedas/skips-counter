/**
 * Submits a skip event to the manager's Apps Script Web App endpoint.
 *
 * `mode: 'no-cors'` is required because Apps Script Web Apps redirect the
 * POST to a script.googleusercontent.com domain that does not return CORS
 * headers. The resulting opaque response (status 0, no readable body) is
 * treated as success — a thrown network error is the only failure signal
 * available in this mode.
 *
 * `Content-Type: text/plain` avoids a preflight OPTIONS request that Apps
 * Script cannot respond to. The body is still valid JSON; only the declared
 * MIME type changes to bypass the preflight trigger.
 *
 * @param {string} scriptUrl  The Web App exec URL from the manager config.
 * @param {{
 *   date: string,
 *   time: string,
 *   managerName: string,
 *   username: string,
 *   utterances: number,
 *   skips: number,
 *   reason: string,
 * }} payload
 */
export async function submitSkipEvent(scriptUrl, payload) {
  try {
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Network error — check your connection and try again.');
  }
}

/**
 * Checks the in-memory session entries for a duplicate skip event.
 *
 * Server-side duplicate detection is unavailable with opaque `no-cors`
 * responses, so this guard runs client-side against the current session's
 * submitted entries.
 *
 * @param {Array}  sessionEntries  Entries recorded during the current session.
 * @param {string} date            Skip event date (yyyy-MM-dd).
 * @param {string} time            Skip event time (HH:mm).
 * @param {string} username        DA login username.
 * @returns {boolean} true if a matching entry already exists in this session.
 */
export function checkDuplicateLocally(sessionEntries, date, time, username) {
  return sessionEntries.some(
    (entry) =>
      entry.date === date &&
      entry.time === time &&
      entry.username === username,
  );
}
