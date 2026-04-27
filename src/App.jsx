import { useState } from 'react'
import Header from './components/Header/Header'
import SkipForm from './components/SkipForm/SkipForm'
import SessionSummary from './components/SessionSummary/SessionSummary'

function App() {
  const [sessionEntries, setSessionEntries] = useState([])

  function handleSessionEntry(entry) {
    setSessionEntries((prev) => [entry, ...prev])
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
