const { startTranscription, stopTranscription, pushAudioChunk } = require('../src/transcription')

describe('transcription unit', () => {
  test('start/stop does not throw', async () => {
    const io = { to: () => ({ emit: () => {} }) }
    await startTranscription(io, 'socket1', 'room1')
    pushAudioChunk('socket1', 'room1', Buffer.from('abc').toString('base64'))
    await stopTranscription(io, 'socket1', 'room1')
  })
})
