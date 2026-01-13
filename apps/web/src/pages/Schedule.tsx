import React, { useState } from 'react'

export default function SchedulePage() {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [link, setLink] = useState('')

  function createMeeting(e: React.FormEvent) {
    e.preventDefault()
    // server-side creation will go here; for now generate a placeholder link
    const token = Math.random().toString(36).slice(2, 10)
    setLink(`${window.location.origin}/meeting/${token}`)
  }

  return (
    <div className="schedule-page">
      <h2>Schedule a Meeting</h2>
      <form onSubmit={createMeeting} className="schedule-form">
        <label>
          Title
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Project sync" />
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </label>
        <label>
          Time
          <input type="time" value={time} onChange={e => setTime(e.target.value)} />
        </label>
        <button type="submit">Create</button>
      </form>

      {link && (
        <div className="meeting-link">
          <h4>Meeting Link</h4>
          <pre>{link}</pre>
        </div>
      )}
    </div>
  )
}
