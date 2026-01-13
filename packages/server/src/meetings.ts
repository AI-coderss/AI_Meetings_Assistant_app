// Meetings manager with DB fallback
import { v4 as uuidv4 } from 'uuid'
import { saveTranscriptToDb } from './db' // keep import for types

interface Meeting {
  id: string
  title: string
  datetime?: string
  token: string
  createdAt: number
}

const meetings = new Map<string, Meeting>()

export function createMeeting({ title, datetime }: { title: string; datetime?: string }) {
  const id = uuidv4()
  const token = Math.random().toString(36).slice(2, 10)
  const m: Meeting = { id, title, datetime, token, createdAt: Date.now() }
  meetings.set(id, m)
  return m
}

export function getMeeting(id: string) {
  return meetings.get(id)
}

export function getMeetingByToken(token: string) {
  for (const m of meetings.values()) if (m.token === token) return m
  return undefined
}

export function listMeetings() {
  return Array.from(meetings.values())
}

// DB persistence helper (optional)
export async function persistMeetingToDb(meeting: Meeting) {
  if (!process.env.PERSIST_MEETINGS_DB || !process.env.DATABASE_URL) return null
  try {
    const db = require('./db')
    await db.ensureSchema()
    await db.pool.query('CREATE TABLE IF NOT EXISTS meetings (id TEXT PRIMARY KEY, title TEXT, datetime TEXT, token TEXT, created_at TIMESTAMPTZ)')
    await db.pool.query('INSERT INTO meetings (id,title,datetime,token,created_at) VALUES ($1,$2,$3,$4,now())', [meeting.id, meeting.title, meeting.datetime || null, meeting.token])
    return true
  } catch (err) {
    console.error('persist meeting failed', err)
    return null
  }
}
