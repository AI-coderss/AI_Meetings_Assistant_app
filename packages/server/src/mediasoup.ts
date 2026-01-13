import mediasoup from 'mediasoup'

let worker: mediasoup.types.Worker | null = null

export async function createMediasoupWorker() {
  if (worker) return worker

  worker = await mediasoup.createWorker({
    rtcMinPort: Number(process.env.MEDIASOUP_MIN_PORT) || 20000,
    rtcMaxPort: Number(process.env.MEDIASOUP_MAX_PORT) || 20100,
    logLevel: 'warn'
  })

  worker.on('died', () => {
    console.error('mediasoup worker died, exiting in 2 seconds...')
    setTimeout(() => process.exit(1), 2000)
  })

  console.log('mediasoup worker created')
  return worker
}

export async function createRouter(worker: mediasoup.types.Worker) {
  return await worker.createRouter({
    mediaCodecs: [
      // Opus for audio
      { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
      // VP8 for video (add H264 if needed/licensing)
      { kind: 'video', mimeType: 'video/VP8', clockRate: 90000 }
    ]
  })
}
