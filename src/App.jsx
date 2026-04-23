import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import Header from './components/Header/Header'
import SkipForm from './components/SkipForm/SkipForm'
import SignIn from './components/SignIn/SignIn'
import SessionSummary from './components/SessionSummary/SessionSummary'

function App() {
  const { isAuthenticated, authError } = useAuth()
  const [sessionEntries, setSessionEntries] = useState([])

  function handleSessionEntry(entry) {
    setSessionEntries((prev) => [entry, ...prev])
  }

  if (!isAuthenticated) {
    return (
      <>
        <Header />
        <SignIn errorMessage={authError} />
      </>
    )
  }

  return (
    <>
      <Header />
      <main
        style={{
          maxWidth: 'var(--amz-max-width)',
          margin: '0 auto',
        }}
      >
        <div className="form-wrapper">
          <SkipForm onSessionEntry={handleSessionEntry} />
          <SessionSummary entries={sessionEntries} />
        </div>
      </main>
    </>
  )
}

export default App
