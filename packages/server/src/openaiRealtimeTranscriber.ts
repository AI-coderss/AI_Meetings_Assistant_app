// Real-time OpenAI Transcriber adapter (WebSocket-based)
// Implements a resilient WS client with simple queueing, backpressure control,
// and exponential backoff reconnects. The adapter is intentionally conservative
// in what it sends so it can be aligned precisely to the official Realtime API
// message shapes when configured with a live API key.

import WebSocket from 'ws'

export type RealtimeOptions = {
  model?: string
  url?: string
  maxOutstanding?: number
  maxRetries?: number
  reconnectBaseMs?: number
}

export class OpenAIRealtimeTranscriber {
  apiKey: string
  model: string
  roomId: string
  socketId: string
  ws?: WebSocket
  onTranscript?: (msg: { text: string; partial?: boolean; raw?: any }) => void
  onOpen?: () => void
  onClose?: () => void

  private queue: string[] = []
  private inFlight = 0
  private stopped = false
  private retries = 0
  private options: RealtimeOptions

  constructor(apiKey: string, roomId: string, socketId: string, options: RealtimeOptions = {}) {
    this.apiKey = apiKey
    this.roomId = roomId
    this.socketId = socketId
    this.options = options
    this.model = options.model || process.env.OPENAI_REALTIME_MODEL || 'transcribe-4o'
  }

  private getUrl() {
    return this.options.url || `wss://api.openai.com/v1/realtime?model=${this.model}`
  }

  async start(): Promise<void> {
    this.stopped = false
    this.retries = 0
    await this.connect()
  }

  private async connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.stopped) return reject(new Error('stopped'))
      const url = this.getUrl()
      const headers: any = { Authorization: `Bearer ${this.apiKey}` }
      const ws = new WebSocket(url, { headers })
      this.ws = ws

      ws.on('open', () => {
        this.retries = 0
        this.onOpen?.()
        // Send a conservative session.init/update message so the server can bind metadata.
        try {
          ws.send(JSON.stringify({ type: 'session.update', session: { client: 'ai-meetings-assistant', roomId: this.roomId, socketId: this.socketId } }))
        } catch (e) {
          // ignore send errors here
        }
        this.drain()
        resolve()
      })

      ws.on('message', (data) => this.handleMessage(data))

      ws.on('error', (err) => {
        // Treat error as a signal to attempt reconnect; do not reject permanently here.
        console.warn('OpenAIRealtimeTranscriber ws error', err && err.message)
      })

      ws.on('close', () => {
        this.onClose?.()
        if (!this.stopped) this.scheduleReconnect()
      })
    })
  }

  private scheduleReconnect() {
    const maxRetries = this.options.maxRetries ?? 10
    if (this.retries >= maxRetries) return
    const base = this.options.reconnectBaseMs ?? 500
    const delay = Math.min(30_000, base * Math.pow(2, this.retries))
    this.retries += 1
    setTimeout(() => {
      if (!this.stopped) this.connect().catch(() => {
        // swallow; scheduleReconnect will be triggered again on close
      })
    }, delay)
  }

  private handleMessage(data: WebSocket.Data) {
    try {
      const parsed = JSON.parse(data.toString())
      // Conservative parsing to support multiple possible shapes from the Realtime API.
      if (parsed.type === 'transcript' || parsed.type === 'response.transcript' || parsed.type === 'transcript.partial') {
        const payload = parsed.data || parsed
        const text = payload.text || payload.transcript || payload.result?.text || ''
        const partial = payload.partial ?? payload.is_partial ?? false
        this.onTranscript?.({ text, partial, raw: parsed })
      } else if (parsed.type === 'response.create' && parsed.response?.type === 'transcript') {
        const items = parsed.response?.items || []
        for (const it of items) {
          const text = it.text || it.payload?.text || ''
          const partial = it.is_partial ?? false
          this.onTranscript?.({ text, partial, raw: it })
        }
      }
    } catch (err) {
      // Ignore non-JSON or unexpected messages.
    }
  }

  sendAudio(base64Data: string) {
    // enqueue and attempt to drain
    if (!base64Data) return
    this.queue.push(base64Data)
    this.drain()
  }

  private drain() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const maxOutstanding = this.options.maxOutstanding ?? 8
    while (this.queue.length > 0 && this.inFlight < maxOutstanding) {
      const chunk = this.queue.shift()!
      const msg = { type: 'input_audio_buffer.append', audio: chunk }
      this.inFlight += 1
      try {
        this.ws.send(JSON.stringify(msg), (err) => {
          this.inFlight = Math.max(0, this.inFlight - 1)
          if (err) {
            // On send error, re-enqueue and attempt reconnect
            this.queue.unshift(chunk)
            try { this.ws?.close() } catch (e) {}
          } else {
            // continue draining
            setImmediate(() => this.drain())
          }
        })
      } catch (e) {
        this.inFlight = Math.max(0, this.inFlight - 1)
        this.queue.unshift(chunk)
        try { this.ws?.close() } catch (e) {}
      }
    }
  }

  async flush() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    // commit the buffer; exact message depends on the Realtime API
    const msg = { type: 'input_audio_buffer.commit' }
    const ws = this.ws
    return new Promise<void>((resolve) => {
      try {
        ws.send(JSON.stringify(msg), () => resolve())
      } catch (e) { resolve() }
    })
  }

  async stop() {
    this.stopped = true
    try {
      await this.flush()
    } catch (e) {
      // ignore
    }
    try { this.ws?.close() } catch (e) {}
  }
}
