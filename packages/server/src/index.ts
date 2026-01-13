import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import { createMediasoupWorker, createRouter } from './mediasoup'
import { createRoom, addPeerToRoom, removePeerFromRoom, listPeers, getRoom } from './rooms'
import { startTranscription, pushAudioChunk, stopTranscription } from './transcription'

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

app.get('/health', (req, res) => res.json({ ok: true }))

// simple room info endpoint
app.get('/rooms/:id', (req, res) => {
  const id = req.params.id
  const room = getRoom(id)
  if (!room) return res.status(404).json({ error: 'Room not found' })
  res.json({ id: room.id, peers: listPeers(id) })
})

// Meetings API
import { createMeeting, getMeeting, listMeetings, getMeetingByToken, persistMeetingToDb } from './meetings'

// Transcript export & summarize
import { getRoom as _getRoom } from './rooms'
import { summarize } from './summarizer'

// In-memory transcript store (roomId -> segments[])
const transcriptStore = new Map()

export function getTranscript(roomId: string) {
  return transcriptStore.get(roomId) || []
}

app.get('/rooms/:id/export', (req, res) => {
  const id = req.params.id
  const format = req.query.format || 'json'
  const segments = transcriptStore.get(id) || []

  if (format === 'txt') {
    const txt = segments.map(s => `[${new Date(s.timestamp).toLocaleTimeString()}] ${s.speakerName || s.speaker}: ${s.text}`).join('\n')
    res.setHeader('Content-Type', 'text/plain')
    return res.send(txt)
  }

  res.json({ segments })
})

// Meetings endpoints
app.post('/meetings', (req, res) => {
  const { title, date, time } = req.body || {}
  const datetime = date && time ? `${date}T${time}` : undefined
  const meeting = createMeeting({ title: title || 'Untitled Meeting', datetime })
  // try to persist
  if (process.env.PERSIST_MEETINGS_DB === '1' && process.env.DATABASE_URL) {
    try { persistMeetingToDb(meeting) } catch (e) { console.error('persist meeting failed', e) }
  }
  res.json({ ok: true, meeting, link: `${req.protocol}://${req.get('host')}/meeting/${meeting.token}` })
})

app.get('/meetings', (req, res) => {
  res.json({ meetings: listMeetings() })
})

app.get('/meeting/:token', (req, res) => {
  const token = req.params.token
  const meeting = getMeetingByToken(token)
  if (!meeting) return res.status(404).send('Meeting not found')
  // in a real app we'd render a meeting page; here return JSON
  res.json({ meeting })
})

app.post('/rooms/:id/summarize', async (req, res) => {
  const id = req.params.id
  const segments = transcriptStore.get(id) || []
  const text = segments.map((s: any) => `${s.speakerName || s.speaker}: ${s.text}`).join('\n')
  try {
    const result = await summarize(text)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/rooms/:id/export', async (req, res) => {
  const id = req.params.id
  const segments = transcriptStore.get(id) || []
  const payload = JSON.stringify({ roomId: id, segments })

  if (process.env.S3_BUCKET) {
    try {
      const key = `transcripts/${id}-${Date.now()}.json`
      const url = await require('./storage').uploadTranscriptToS3(process.env.S3_BUCKET, key, Buffer.from(payload))
      // optionally persist to DB as well
      if (process.env.PERSIST_TRANSCRIPTS_DB === '1' && process.env.DATABASE_URL) {
        const db = require('./db')
        await db.saveTranscriptToDb(id, segments)
      }
      return res.json({ ok: true, url })
    } catch (err: any) {
      console.error('s3 upload failed', err)
      return res.status(500).json({ error: 's3 upload failed' })
    }
  }

  // fallback: persist to DB if configured, otherwise local file
  if (process.env.PERSIST_TRANSCRIPTS_DB === '1' && process.env.DATABASE_URL) {
    try {
      const db = require('./db')
      const rec = await db.saveTranscriptToDb(id, segments)
      return res.json({ ok: true, dbId: rec.id })
    } catch (err: any) {
      console.error('db persist failed', err)
    }
  }

  const file = require('./storage').saveTranscriptLocally(id, { roomId: id, segments })
  res.json({ ok: true, file })
})

// Expose function to append segments from transcription manager
export function appendTranscriptSegment(roomId: string, segment: any) {
  const arr = transcriptStore.get(roomId) || []
  arr.push(segment)
  transcriptStore.set(roomId, arr)
}


// create mediasoup worker on startup
;(async () => {
  try {
    const worker = await createMediasoupWorker()
    // Pre-create a default router for the service (optional)
    // const router = await createRouter(worker)
  } catch (err) {
    console.error('failed to start mediasoup worker', err)
  }
})()

import { attachMediasoupHandlers } from './mediasoupHandlers'

io.on('connection', socket => {
  console.log('client connected', socket.id)

  // initialize data maps for this socket
  socket.data.transports = new Map()
  socket.data.producers = new Map()
  socket.data.consumers = new Map()

  socket.on('createRoom', async ({ roomId }: { roomId: string }, cb: (res: any) => void) => {
    const room = createRoom(roomId)
    console.log('room created', roomId)
    cb({ ok: true, roomId })
  })

  socket.on('joinRoom', ({ roomId, name }: { roomId: string; name?: string }, cb: (res: any) => void) => {
    addPeerToRoom(roomId, { id: socket.id, name })
    socket.join(roomId)
    // notify other participants
    socket.to(roomId).emit('participant-joined', { id: socket.id, name })

    const peers = listPeers(roomId)
    cb({ ok: true, peers })
  })

  socket.on('leaveRoom', ({ roomId }: { roomId: string }) => {
    removePeerFromRoom(roomId, socket.id)
    socket.leave(roomId)
    socket.to(roomId).emit('participant-left', { id: socket.id })
  })

  socket.on('getPeers', ({ roomId }: { roomId: string }, cb: (res: any) => void) => {
    const peers = listPeers(roomId)
    cb({ ok: true, peers })
  })

  socket.on('broadcast', ({ roomId, event, payload }: any) => {
    socket.to(roomId).emit(event, payload)
  })

  // mediasoup-specific handlers
  attachMediasoupHandlers(io, socket as any).catch(err => console.error('attach handlers error', err))

  // transcription events
  socket.on('transcription:start', ({ roomId }: { roomId: string }, cb: Function) => {
    try {
      startTranscription(io, socket.id, roomId)
      cb?.({ ok: true })
    } catch (err: any) {
      cb?.({ error: err.message })
    }
  })

  socket.on('transcription:audio', ({ roomId, data }: { roomId: string; data: string }) => {
    pushAudioChunk(socket.id, roomId, data)
  })

  socket.on('transcription:stop', ({ roomId }: { roomId: string }) => {
    stopTranscription(io, socket.id, roomId)
  })

  socket.on('disconnecting', () => {
    // remove from all rooms
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue
      removePeerFromRoom(roomId, socket.id)
      socket.to(roomId).emit('participant-left', { id: socket.id })

      // stop any ongoing transcription sessions for this socket in the room
      try { stopTranscription(io, socket.id, roomId) } catch (e) { /* ignore */ }
    }
  })

  socket.on('disconnect', () => console.log('client disconnected', socket.id))
})

const PORT = process.env.PORT || 4000
server.listen(PORT, () => console.log(`Server listening on ${PORT}`))
