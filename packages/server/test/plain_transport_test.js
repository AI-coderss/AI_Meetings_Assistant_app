const ioClient = require('socket.io-client')

async function run() {
  const socket = ioClient('http://localhost:4000')
  socket.on('connect', () => {
    socket.emit('createRoom', { roomId: 'pt-room' }, (r) => {
      socket.emit('joinRoom', { roomId: 'pt-room', name: 'PTTester' }, async (res) => {
        console.log('joined')
        socket.emit('createRoom', { roomId: 'pt-room' }, () => {})
        // ask server to create plain transport
        socket.emit('createPlainTransport', { roomId: 'pt-room' }, (resp) => {
          console.log('plainTransport tuple', resp)
          if (!resp || resp.error) {
            console.error('failed to create plain transport', resp)
            process.exit(1)
          }

          // We won't send RTP here; just ensure server returned a tuple
          process.exit(0)
        })
      })
    })
  })
}

run()
