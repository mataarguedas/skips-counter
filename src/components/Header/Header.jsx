import { useAuth } from '../../context/AuthContext'
import './Header.css'

/**
 * Two-tier sticky header following the Amazon UI design system.
 *
 * Top bar   — navy background, brand name left, user identity + sign-out right.
 * Bottom bar — navy-light background, centered descriptor text.
 */
export default function Header() {
  const { isAuthenticated, userInfo, logout } = useAuth()

  return (
    <header className="header">
      <div className="header__top">
        <span className="header__logo">
          <span className="header__logo-agi">AGI</span>
          <span className="header__logo-suffix"> Data Services</span>
        </span>

        {isAuthenticated && (
          <div className="header__user">
            <span className="header__user-name">{userInfo?.name}</span>
            <span className="header__user-divider" />
            <button className="header__signout" onClick={logout}>
              Sign out
            </button>
          </div>
        )}
      </div>

      <div className="header__sub">
        <span className="header__sub-label">
          AGI Transcriptions Workflow — Skip Event Reporter
        </span>
      </div>
    </header>
  )
}
