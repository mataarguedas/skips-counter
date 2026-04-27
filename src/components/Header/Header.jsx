import './Header.css'

/**
 * Two-tier sticky header following the Amazon UI design system.
 *
 * Top bar   — navy background, brand name left, right side intentionally blank.
 * Bottom bar — navy-light background, centered descriptor text.
 */
export default function Header() {
  return (
    <header className="header">
      <div className="header__top">
        <span className="header__logo">
          <span className="header__logo-agi">AGI</span>
          <span className="header__logo-suffix"> Data Services</span>
        </span>
      </div>

      <div className="header__sub">
        <span className="header__sub-label">
          AGI DS Transcriptions Workflow — Skip Event Reporter
        </span>
      </div>
    </header>
  )
}
