import React from 'react'

interface Props { segments?: Array<any> }

export default function TranscriptPanel({ segments = [] }: Props) {
  return (
    <div className="transcript-panel-content">
      {segments.length === 0 ? (
        <div className="empty">No transcription yet</div>
      ) : (
        segments.map((s, i) => (
          <div key={i} className={`segment ${s.partial ? 'partial' : 'final'}`}>
            <div className="meta"><strong>{s.speakerName || s.speaker}</strong> <span className="time">{new Date(s.timestamp).toLocaleTimeString()}</span></div>
            <div className="text">{s.text}</div>
          </div>
        ))
      )}
    </div>
  )
}
