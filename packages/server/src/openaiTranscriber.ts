// Lightweight OpenAI Transcriber adapter (optional)
// Usage:
// - Set OPENAI_API_KEY and USE_OPENAI_TRANSCRIBE=1 to enable.
// - This module provides a Transcriber class with start/stop/sendAudioChunk.
// NOTE: the exact streaming protocol depends on OpenAI's SDK / realtime API. This file contains
// a pluggable skeleton and a minimal fetch-based example for batch sending. Replace with the
// official SDK streaming client for low-latency streaming (recommended).

import { OpenAIRealtimeTranscriber } from './openaiRealtimeTranscriber'

export class OpenAITranscriber {
  realtime: OpenAIRealtimeTranscriber | null = null
  constructor(apiKey: string, roomId: string, socketId: string) {
    // select realtime adapter for low-latency streaming
    this.realtime = new OpenAIRealtimeTranscriber(apiKey, roomId, socketId)
  }

  async start() {
    if (!this.realtime) return
    await this.realtime.start()
  }

  async sendChunk(base64Data: string) {
    if (!this.realtime) return
    await this.realtime.sendChunk(base64Data)
  }

  async stop() {
    if (!this.realtime) return
    await this.realtime.stop()
  }
}

