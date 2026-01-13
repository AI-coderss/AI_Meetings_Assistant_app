const ioClient = require('socket.io-client')
const fetch = require('node-fetch')

async function run() {
  const socket = ioClient('http://localhost:4000')

  socket.on('connect', () => {
    console.log('connected', socket.id)
    socket.emit('createRoom', { roomId: 'persist-room' }, (res) => {
      socket.emit('joinRoom', { roomId: 'persist-room', name: 'PersistUser' }, async (res) => {
        console.log('joined room')
        socket.emit('transcription:start', { roomId: 'persist-room' }, (r) => console.log('transcription start', r))
        const fake = Buffer.from('fakedata').toString('base64')
        socket.emit('transcription:audio', { roomId: 'persist-room', data: fake })

        // wait 2s for mock segments to appear
        setTimeout(async () => {
          socket.emit('transcription:stop', { roomId: 'persist-room' })
          // call export upload
          const res = await fetch('http://localhost:4000/rooms/persist-room/export/upload', { method: 'POST' })
          const json = await res.json()
          console.log('export upload result:', json)
          socket.disconnect()
          process.exit(0)
        }, 2500)
      })
    })
  })

  socket.on('connect_error', (err) => { console.error('connect error', err); process.exit(1) })
}

run()
