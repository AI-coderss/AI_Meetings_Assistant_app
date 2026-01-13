import { spawn } from 'child_process'
import ffmpegPath from 'ffmpeg-static'
import { OpenAITranscriber } from './openaiTranscriber'

/**
 * SFU capture scaffolding.
 * This function demonstrates creating an FFmpeg process that reads from an RTP/UDP
 * source (e.g., an IP:port where RTP is available) and forwards PCM data to the
 * OpenAI transcriber by base64-chunking stdout. In production, you'll need to
 * wire mediasoup's PlainTransport / consumer to the selected RTP port so that the
 * producer's audio is forwarded into the UDP port that ffmpeg reads from.
 *
 * Note: This is a scaffold that will work when RTP is forwarded to `udpHost:udpPort`.
 * It does not yet perform the mediasoup -> plain RTP wiring automatically.
 */

export function startSfuCapture({ udpHost = '127.0.0.1', udpPort = 5004, apiKey, roomId, socketId }: any) {
  // spawn ffmpeg to listen to incoming RTP on udpHost:udpPort and output 16kHz PCM s16le
  const args = [
    '-hide_banner', '-loglevel', 'error',
    '-i', `udp://${udpHost}:${udpPort}?overrun_nonfatal=1&fifo_size=5000000`,
    '-f', 's16le', '-acodec', 'pcm_s16le', '-ac', '1', '-ar', '16000', '-'
  ]

  const ff = spawn(ffmpegPath, args)

  ff.stderr.on('data', (d) => { console.log('[ffmpeg]', d.toString()) })

  const useMock = process.env.MOCK_TRANSCRIBER === '1'
  let t: any
  if (useMock) {
    // simple mock transcriber that records received chunks
    t = { receivedChunks: 0, async start() {}, async sendChunk(_s: string) { this.receivedChunks += 1 }, async stop() {} }
  } else {
    if (!apiKey) throw new Error('OPENAI_API_KEY required to start capture')
    t = new OpenAITranscriber(apiKey, roomId, socketId)
    ;(async () => { await t.start() })()
  }

  let chunkIndex = 0
  ff.stdout.on('data', (d: Buffer) => {
    // chunk and send base64 (this is a naive chunker for demo)
    const base64 = d.toString('base64')
    t.sendChunk(base64)
    chunkIndex += 1
  })

  ff.on('close', (code) => {
    console.log('ffmpeg closed', code)
    t.stop()
  })

  return { ff, transcriber: t }
}
