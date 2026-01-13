import React from 'react'
import ParticipantCard, { Participant } from './ParticipantCard'

interface Props { participants?: Participant[] }

export default function ParticipantGrid({ participants = [] }: Props) {
  // simple layout that would be replaced with responsive logic later
  return (
    <div className="participant-grid-list">
      {participants.length === 0 ? (
        <div className="empty-state">No participants yet</div>
      ) : (
        participants.map(p => (
          <ParticipantCard key={p.id} id={p.id} name={p.name} isActive={p.isActive} />
        ))
      )}
    </div>
  )
}
