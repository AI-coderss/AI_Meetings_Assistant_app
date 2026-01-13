const { startSfuCapture } = require('../src/sfuCapture')
const { spawn } = require('child_process')
const ffmpegPath = require('ffmpeg-static')

async function run() {
  const udpPort = 5006
  const { ff, transcriber } = startSfuCapture({ udpHost: '127.0.0.1', udpPort, apiKey: process.env.OPENAI_API_KEY, roomId: 'capture-room', socketId: 'server' })

  console.log('Started sfu capture, transcriber mock?', !!transcriber.receivedChunks)

  // spawn a sender ffmpeg that generates a sine wave and sends to udp port
  const sendArgs = ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=6', '-c:a', 'libopus', '-f', 'rtp', `rtp://127.0.0.1:${udpPort}`]
  const sender = spawn(ffmpegPath, sendArgs)

  sender.stderr.on('data', (d) => { console.log('[sender ffmpeg]', d.toString()) })

  // wait up to 6s for transcriber to get chunks
  let waited = 0
  while (waited < 7000) {
    if (transcriber.receivedChunks && transcriber.receivedChunks > 0) {
      console.log('receivedChunks', transcriber.receivedChunks)
      sender.kill('SIGINT')
      ff.kill('SIGINT')
      process.exit(0)
    }
    await new Promise(r => setTimeout(r, 200))
    waited += 200
  }

  console.error('No chunks received')
  sender.kill('SIGINT')
  ff.kill('SIGINT')
  process.exit(1)
}

run()
