import React from 'react'

interface Props { onToggleTranscript?: () => void }

export default function BottomBar({ onToggleTranscript }: Props) {
  return (
    <div className="bottom-bar">
      <button className="btn">Video</button>
      <button className="btn">Audio</button>
      <button className="btn">Mute</button>
      <button className="btn">Hand</button>
      <button className="btn">Chat</button>
      <button className="btn" onClick={onToggleTranscript}>Transcript</button>
    </div>
  )
}
