import './SessionSummary.css'

const MAX_VISIBLE = 5

/**
 * SessionSummary — shows the DA a running in-memory tally of this session's submissions.
 *
 * @param {{ time: string, utterances: number, skips: number, reason: string }[]} entries
 *   Array in reverse-chronological order (newest first).
 */
export default function SessionSummary({ entries }) {
  const totalSubmissions = entries.length
  const totalUtterances = entries.reduce((s, e) => s + e.utterances, 0)

  const visible = entries.slice(0, MAX_VISIBLE)
  const overflow = entries.length - MAX_VISIBLE

  return (
    <div className="session-summary">
      <h2 className="session-summary__heading">Today's session</h2>
      <hr className="session-summary__divider" />

      {entries.length === 0 ? (
        <p className="session-summary__empty">No skips logged yet this session.</p>
      ) : (
        <>
          <div className="session-summary__stats">
            <div className="session-summary__stat">
              <span className="session-summary__stat-value">{totalSubmissions}</span>
              <span className="session-summary__stat-label">Skips</span>
            </div>
            <div className="session-summary__stat">
              <span className="session-summary__stat-value">{totalUtterances}</span>
              <span className="session-summary__stat-label">Utterances</span>
            </div>
          </div>

          <hr className="session-summary__divider" />

          <ul className="session-summary__log">
            {visible.map((entry, i) => (
              <li key={i} className="session-summary__log-entry">
                {entry.time} — {entry.utterances} utterances, {entry.skips} skip{entry.skips !== 1 ? 's' : ''}
                {entry.reason ? ` [${entry.reason}]` : ''}
              </li>
            ))}
          </ul>

          {overflow > 0 && (
            <p className="session-summary__overflow">
              …and {overflow} more earlier submission{overflow !== 1 ? 's' : ''}
            </p>
          )}
        </>
      )}
    </div>
  )
}
