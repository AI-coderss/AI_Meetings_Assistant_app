import React, { useState } from 'react'
import './styles/global.scss'
import BottomBar from './components/BottomBar'
import SchedulePage from './pages/Schedule'
import ParticipantGrid from './components/ParticipantGrid'
import useSocket from './hooks/useSocket'
import useTranscription from './hooks/useTranscription'
import TranscriptPanel from './components/TranscriptPanel'

export default function App() {
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [page, setPage] = useState<'meeting'|'schedule'>('meeting')
  const { connected } = useSocket()
  const roomId = 'demo-room'
  const { start, stop, isRecording, segments, clear } = useTranscription(roomId)

  return (
    <div className={`app ${transcriptOpen ? 'transcript-open' : ''}`}>
      <header className="app-header">
        <h1>AI Meetings Assistant</h1>
        <nav>
          <button onClick={() => setPage('meeting')}>Meeting</button>
          <button onClick={() => setPage('schedule')}>Schedule</button>
        </nav>
        <div className="status">{connected ? 'Connected' : 'Offline'}</div>
      </header>

      {page === 'meeting' ? (
        <main className="meeting-area">
          <div className="participant-grid">
            <ParticipantGrid participants={[{ id: '1', name: 'You', isActive: true }, { id: '2', name: 'Alice' }, { id: '3', name: 'Bob' }]} />
          </div>
          <aside className={`transcript-panel ${transcriptOpen ? 'open' : ''}`}>
            <h3>Transcript</h3>
            <TranscriptPanel segments={segments} />
            <div style={{ marginTop: 8 }}>
              <button onClick={() => (isRecording ? stop() : start())} className="btn">{isRecording ? 'Stop Transcription' : 'Start Transcription'}</button>
              <button onClick={() => clear()} className="btn" style={{ marginLeft: 8 }}>Clear</button>
            </div>
          </aside>
        </main>
      ) : (
        <div className="page-wrapper">
          <SchedulePage />
        </div>
      )}

      <BottomBar onToggleTranscript={() => setTranscriptOpen(s => !s)} />
    </div>
  )
}
