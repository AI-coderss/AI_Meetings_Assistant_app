import React from 'react'
import '../styles/components/_participant.scss'

export interface Participant {
  id: string
  name: string
  isActive?: boolean
}

export default function ParticipantCard({ name, isActive = false }: Partial<Participant>) {
  return (
    <div className={`participant-card ${isActive ? 'active' : ''}`}>
      <div className="avatar" />
      <div className="meta">
        <div className="name">{name || 'Guest'}</div>
      </div>
    </div>
  )
}
