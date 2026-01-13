const ioClient = require('socket.io-client')

async function run() {
  const socket = ioClient('http://localhost:4000')

  socket.on('connect', () => {
    console.log('connected', socket.id)
    // join a test room
    socket.emit('createRoom', { roomId: 'test-room' }, (res) => {
      socket.emit('joinRoom', { roomId: 'test-room', name: 'Tester' }, (res) => {
        console.log('joined room', res.peers.length)
        // start transcription
        socket.emit('transcription:start', { roomId: 'test-room' }, (r) => console.log('transcription start', r))

        // send a few audio chunks (fake base64)
        const fake = Buffer.from('fakedata').toString('base64')
        let sent = 0
        const interval = setInterval(() => {
          socket.emit('transcription:audio', { roomId: 'test-room', data: fake })
          sent += 1
          if (sent >= 3) {
            clearInterval(interval)
          }
        }, 200)
      })
    })
  })

  let received = 0
  const done = () => {
    socket.disconnect()
    console.log('test success')
    process.exit(0)
  }

  socket.on('transcription:segment', (data) => {
    console.log('segment', data)
    received += 1
    if (received >= 2) done()
  })

  socket.on('transcription:final', (data) => {
    console.log('final', data)
    done()
  })

  socket.on('connect_error', (err) => {
    console.error('connect error', err)
    process.exit(1)
  })
}

run()
