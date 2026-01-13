// Simple OpenAI Realtime connectivity test (requires OPENAI_API_KEY and USE_OPENAI_TRANSCRIBE=1)
const WebSocket = require('ws')

const API_KEY = process.env.OPENAI_API_KEY
if (!API_KEY) {
  console.log('Skipping OpenAI realtime test (OPENAI_API_KEY not set)')
  process.exit(0)
}

(async () => {
  try {
    const url = `wss://api.openai.com/v1/realtime?model=${process.env.OPENAI_REALTIME_MODEL || 'transcribe-4o'}`
    console.log('Connecting to', url)
    const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${API_KEY}` } })

    ws.on('open', () => {
      console.log('OpenAI realtime WS open')
      // Some APIs require an init message; send a no-op or session start if needed
      ws.send(JSON.stringify({ type: 'session.update', session: { metadata: 'test' } }))
      // You can send an 'input_audio_buffer.append' with small base64 audio here
    })

    ws.on('message', (m) => {
      try { console.log('msg', JSON.parse(m.toString())) } catch (e) { console.log('msg', m.toString()) }
    })

    ws.on('error', (err) => { console.error('ws err', err); process.exit(1) })

    // Keep for 10s
    setTimeout(() => { ws.close(); console.log('done'); process.exit(0) }, 10000)
  } catch (err) {
    console.error('test failed', err)
    process.exit(1)
  }
})()
