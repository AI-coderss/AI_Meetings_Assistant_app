import WebSocket, { WebSocketServer } from 'ws'
import { OpenAIRealtimeTranscriber } from '../src/openaiRealtimeTranscriber'

const PORT = 9090
const URL = `ws://localhost:${PORT}`

function waitFor(conditionFn: () => boolean, timeout = 5000) {
  const start = Date.now()
  return new Promise<void>((resolve, reject) => {
    const tick = () => {
      if (conditionFn()) return resolve()
      if (Date.now() - start > timeout) return reject(new Error('timeout'))
      setTimeout(tick, 50)
    }
    tick()
  })
}

async function run() {
  console.log('Starting mock OpenAI WS server on', PORT)

  let server = new WebSocketServer({ port: PORT })

  let sawSessionUpdate = false
  let sawAudioChunk = false

  server.on('connection', (ws) => {
    ws.on('message', (m) => {
      try {
        const parsed = JSON.parse(m.toString())
        if (parsed.type === 'session.update') {
          sawSessionUpdate = true
        }
        if (parsed.type === 'input_audio_buffer.append') {
          sawAudioChunk = true
          // echo a transcript
          ws.send(JSON.stringify({ type: 'transcript', data: { text: 'hello from mock', partial: false } }))
        }
      } catch (e) {}
    })
  })

  const adapter = new OpenAIRealtimeTranscriber('test-api-key', 'room-test', 'socket-test', { url: URL, maxOutstanding: 2, maxRetries: 3, reconnectBaseMs: 100 })

  let gotTranscript = ''
  adapter.onTranscript = (m) => {
    console.log('adapter transcript', m)
    gotTranscript = m.text
  }

  await adapter.start()
  await waitFor(() => sawSessionUpdate, 2000)
  console.log('session.update observed')

  adapter.sendAudio(Buffer.from('abc').toString('base64'))
  await waitFor(() => sawAudioChunk, 2000)
  console.log('audio chunk observed')

  await waitFor(() => gotTranscript === 'hello from mock', 2000)
  console.log('transcript received')

  // Now test reconnect logic: stop server and restart
  await new Promise<void>((res) => server.close(() => res()))
  console.log('mock server closed to trigger reconnect')

  // restart server after a short delay
  await new Promise((res) => setTimeout(res, 500))

  server = new WebSocketServer({ port: PORT })
  server.on('connection', (ws) => {
    ws.on('message', (m) => {
      try {
        const parsed = JSON.parse(m.toString())
        if (parsed.type === 'session.update') {
          // send a new transcript when reconnect finishes
          ws.send(JSON.stringify({ type: 'transcript', data: { text: 'reconnected', partial: false } }))
        }
      } catch (e) {}
    })
  })

  await waitFor(() => gotTranscript === 'reconnected', 10000)
  console.log('reconnect transcript received')

  await adapter.stop()
  await new Promise<void>((res) => server.close(() => res()))
  console.log('test complete')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
