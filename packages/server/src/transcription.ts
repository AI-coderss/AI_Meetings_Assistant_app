import { Server } from 'socket.io'
import { ChildProcess } from 'child_process'
import { spawn } from 'child_process'
import { OpenAITranscriber } from './openaiTranscriber'
import { getRoom } from './rooms'

interface TranscriptSegment {
  speaker: string
  speakerName?: string
  text: string
  timestamp: number
  partial?: boolean
  final?: boolean
}

interface Session {
  roomId: string
  socketId: string
  buffer: Buffer[]
  interval?: NodeJS.Timer
  startTime: number
  transcriber?: OpenAITranscriber
  ffmpeg?: ChildProcess
}

const sessions = new Map<string, Session>()

// Mock transcription engine: in real implementation, forward audio to OpenAI Transcribe-4o streaming API
function mockTranscriptionEngine(session: Session, io: Server): void {
  // every 1s emit a partial segment based on buffer length
  let count = 0
  session.interval = setInterval(() => {
    count += 1
    const text = `Simulated transcript segment ${count}`
    const timestamp = Date.now()

    // Try to attach speaker name from room if available
    const r = getRoom(session.roomId)
    const speakerName = r?.peers.get(session.socketId)?.name || session.socketId

    const seg: TranscriptSegment = { speaker: session.socketId, speakerName, text, timestamp, partial: true }
    io.to(session.roomId).emit('transcription:segment', seg)
    try {
      const indexModule = require('./index') as { appendTranscriptSegment?: (roomId: string, seg: TranscriptSegment) => void }
      indexModule.appendTranscriptSegment?.(session.roomId, seg)
    } catch (e) {
      // ignore
    }

    // also notify speaker activity
    io.to(session.roomId).emit('speaker-activity', { speaker: session.socketId })

    // emit final every 5 segments
    if (count % 5 === 0) {
      io.to(session.roomId).emit('transcription:segment', {
        speaker: session.socketId,
        speakerName,
        text: `Finalized: ${text}`,
        timestamp,
        partial: false
      } as TranscriptSegment)
    }
  }, 1000)
}

export async function startTranscription(io: Server, socketId: string, roomId: string): Promise<void> {
  const key = `${roomId}:${socketId}`
  if (sessions.has(key)) return
  const session: Session = { socketId, roomId, buffer: [], startTime: Date.now() }
  sessions.set(key, session)

  // If OPENAI is enabled, create a realtime transcriber; otherwise start mock engine
  if (process.env.USE_OPENAI_TRANSCRIBE === '1' && process.env.OPENAI_API_KEY) {
    try {
      const t = new OpenAITranscriber(process.env.OPENAI_API_KEY, roomId, socketId)
      session.transcriber = t

      // start a per-session ffmpeg that will accept media container data (e.g., WebM from MediaRecorder)
      // and output 16kHz mono PCM so we can forward to the realtime adapter in base64 chunks.
      const ffmpegPath = require('ffmpeg-static') as string
      const ff = spawn(ffmpegPath, [
        '-hide_banner',
        '-loglevel', 'error',
        '-i', 'pipe:0',
        '-f', 's16le',
        '-acodec', 'pcm_s16le',
        '-ac', '1',
        '-ar', '16000',
        'pipe:1'
      ])

      ff.on('error', (e: Error) => {
        console.error('ffmpeg error', e)
      })

      if (ff.stdout) {
        ff.stdout.on('data', (d: Buffer) => {
          // forward PCM-sized chunks to OpenAI realtime adapter
          const base64 = d.toString('base64')
          try {
            session.transcriber?.sendChunk(base64)
          } catch (e) {
            // ignore
          }
        })
      }

      ff.on('close', () => {
        // ignore
      })

      session.ffmpeg = ff

      const transcriber = t as any
      if (transcriber.realtime) {
        transcriber.realtime.onTranscript = (parsed: { text: string; partial: boolean }) => {
          const ts = Date.now()
          const r = getRoom(roomId)
          const speakerName = r?.peers.get(session.socketId)?.name || session.socketId
          const seg: TranscriptSegment = {
            speaker: session.socketId,
            speakerName,
            text: parsed.text,
            timestamp: ts,
            partial: parsed.partial
          }
          io.to(roomId).emit('transcription:segment', seg)
          try {
            const indexModule = require('./index') as { appendTranscriptSegment?: (roomId: string, seg: TranscriptSegment) => void }
            indexModule.appendTranscriptSegment?.(roomId, seg)
          } catch (e) {
            // ignore
          }

          io.to(roomId).emit('speaker-activity', { speaker: session.socketId })
        }
      }

      await t.start()
      return
    } catch (err) {
      console.error('openai transcriber failed to start, falling back to mock', err)
    }
  }

  mockTranscriptionEngine(session, io)
}

export function pushAudioChunk(socketId: string, roomId: string, data: string): void {
  const key = `${roomId}:${socketId}`
  const session = sessions.get(key)
  if (!session) return

  // If we have a per-session ffmpeg process, write decoded data to its stdin for transcoding
  if (session.ffmpeg && session.ffmpeg.stdin && !session.ffmpeg.stdin.destroyed) {
    try {
      const raw = Buffer.from(data, 'base64')
      session.ffmpeg.stdin.write(raw)
      return
    } catch (err) {
      // ignore
    }
  }

  // If we have a transcriber without ffmpeg, forward directly
  if (session.transcriber) {
    try {
      session.transcriber.sendChunk(data)
    } catch (e) {
      // ignore
    }
    return
  }

  // For mock: append to buffer
  try {
    const raw = Buffer.from(data, 'base64')
    session.buffer.push(raw)
  } catch (err) {
    // ignore
  }
}

export async function stopTranscription(io: Server, socketId: string, roomId: string): Promise<void> {
  const key = `${roomId}:${socketId}`
  const session = sessions.get(key)
  if (!session) return

  if (session.interval) clearInterval(session.interval)

  if (session.transcriber) {
    // if ffmpeg present, close stdin and kill
    if (session.ffmpeg && session.ffmpeg.stdin && !session.ffmpeg.killed) {
      try {
        session.ffmpeg.stdin.end()
      } catch (e) {
        // ignore
      }
    }

    await session.transcriber.stop()
    // Optionally emit final text if you have it
    io.to(roomId).emit('transcription:final', {
      speaker: socketId,
      text: `Finalized transcript for ${socketId}`,
      timestamp: Date.now()
    } as TranscriptSegment)

    // persist transcript if requested
    try {
      if (process.env.PERSIST_TRANSCRIPTS === '1') {
        const indexModule = require('./index') as { getTranscript?: (roomId: string) => TranscriptSegment[] }
        const segments = indexModule.getTranscript?.(roomId) || []
        if (process.env.S3_BUCKET) {
          const key = `transcripts/${roomId}-${Date.now()}.json`
          const storageModule = require('./storage') as { uploadTranscriptToS3?: (bucket: string, key: string, data: Buffer) => Promise<void> }
          await storageModule.uploadTranscriptToS3?.(
            process.env.S3_BUCKET,
            key,
            Buffer.from(JSON.stringify({ roomId, segments }))
          )
        } else {
          const storageModule = require('./storage') as { saveTranscriptLocally?: (roomId: string, data: any) => void }
          storageModule.saveTranscriptLocally?.(roomId, { roomId, segments })
        }
      }
    } catch (e) {
      console.error('persist transcript failed', e)
    }
  } else {
    // emit final combined transcript (mock)
    const finalText = `Transcription ended for ${socketId} (mock)`
    const r = getRoom(roomId)
    const speakerName = r?.peers.get(session.socketId)?.name || session.socketId
    io.to(roomId).emit('transcription:final', {
      speaker: socketId,
      speakerName,
      text: finalText,
      timestamp: Date.now()
    } as TranscriptSegment)
  }

  sessions.delete(key)
}
// TODO: Replace mockTranscriptionEngine with real OpenAI Transcribe-4o streaming integration.
// Example approach:
// - On startTranscription, create a streaming session to OpenAI, keep its connection per session
// - On pushAudioChunk, forward decoded PCM/Opus frames to OpenAI stream
// - Listen to streaming responses and emit 'transcription:segment' events to the room
// - On stopTranscription, close the OpenAI stream and emit final transcript
