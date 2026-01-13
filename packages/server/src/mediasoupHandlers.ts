// @ts-nocheck
import { Server } from 'socket.io'
import { createMediasoupWorker, createRouter } from './mediasoup'
import { getRoom, setRoomRouter } from './rooms'
import { startTranscription, stopTranscription } from './transcription'

// map producerId -> socketId for server-side diarization mapping
const producerToSocket = new Map<string, string>()

// simple per-socket maps stored in socket.data

export async function attachMediasoupHandlers(io: Server, socket: any) {
  // helpers
  async function ensureRouter(roomId: string) {
    const room = getRoom(roomId)
    if (!room) throw new Error('Room not found')
    if (!room.router) {
      // create router on the worker and store it
      const worker = await createMediasoupWorker()
      const router = await createRouter(worker)
      setRoomRouter(roomId, router)
      return router
    }
    return room.router
  }
  // create a plain RTP transport to forward RTP to external receiver (stub)
  socket.on('createPlainTransport', async ({ roomId }: { roomId: string }, cb: Function) => {
    try {
      const router = await ensureRouter(roomId)
      const transport = await router.createPlainTransport({
        listenIp: { ip: '127.0.0.1', announcedIp: process.env.PUBLIC_IP || undefined },
        rtcpMux: true,
        comedia: false
      })

      // Return the ip/port the server listens on so an external sender can rotate
      cb({ ok: true, ip: transport.tuple.localIp, port: transport.tuple.localPort, rtcpPort: transport.rtcpTuple?.localPort })
    } catch (err: any) {
      cb({ error: err.message })
    }
  })
  socket.on('getRouterRtpCapabilities', async ({ roomId }: { roomId: string }, cb: Function) => {
    try {
      const router = await ensureRouter(roomId)
      cb({ rtpCapabilities: router.rtpCapabilities })
    } catch (err: any) {
      cb({ error: err.message })
    }
  })

  socket.on('createWebRtcTransport', async ({ roomId }: { roomId: string }, cb: Function) => {
    try {
      const router = await ensureRouter(roomId)
      const transport = await router.createWebRtcTransport({
        listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.PUBLIC_IP || undefined }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1000000
      })

      // store transport id in socket.data
      const transportParams = {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      }

      // attach close handler
      transport.on('close', () => {
        // nothing for now
      })

      // keep transport in socket.data
      const transports = socket.data.transports || new Map()
      transports.set(transport.id, transport)
      socket.data.transports = transports

      cb({ ok: true, transportParams })
    } catch (err: any) {
      console.error('createWebRtcTransport err', err)
      cb({ error: err.message })
    }
  })

  socket.on('connectTransport', async ({ transportId, dtlsParameters }: any, cb: Function) => {
    try {
      const transports: Map<string, any> = socket.data.transports
      const transport = transports?.get(transportId)
      if (!transport) return cb({ error: 'Transport not found' })
      await transport.connect({ dtlsParameters })
      cb({ ok: true })
    } catch (err: any) {
      cb({ error: err.message })
    }
  })

  socket.on('produce', async ({ transportId, kind, rtpParameters }: any, cb: Function) => {
    try {
      const transports: Map<string, any> = socket.data.transports
      const transport = transports?.get(transportId)
      if (!transport) return cb({ error: 'Transport not found' })

      const producer = await transport.produce({ kind, rtpParameters })

      // store producer
      const producers = socket.data.producers || new Map()
      producers.set(producer.id, producer)
      socket.data.producers = producers

      // bookkeeping for diarization: map producer -> socket
      producerToSocket.set(producer.id, socket.id)

      const roomId = Array.from(socket.rooms).find(r => r !== socket.id)

      // optionally auto-start transcription for this participant
      if (process.env.AUTO_START_TRANSCRIPTION === '1' && roomId) {
        try { startTranscription(io, socket.id, roomId) } catch (e) { /* ignore */ }
      }

      if (roomId) socket.to(roomId).emit('newProducer', { producerId: producer.id, socketId: socket.id, kind })

      // announce speaker activity briefly
      if (roomId) socket.to(roomId).emit('speaker-activity', { speaker: socket.id })

      // cleanup hook: when producer closes, remove mapping and stop transcription
      producer.on('transportclose', () => {
        producerToSocket.delete(producer.id)
      })

      producer.on('close', () => {
        producerToSocket.delete(producer.id)
        if (roomId) stopTranscription(io, socket.id, roomId)
      })

      // Optionally auto-capture SFU audio server-side (creates a PlainTransport and tries to consume producer)
      if (process.env.AUTO_SFU_CAPTURE === '1' && roomId) {
        try {
          const { createPlainCaptureForProducer } = require('./plainCapture')
          const room = getRoom(roomId)
          if (room && room.router) {
            const { transport, consumer } = await createPlainCaptureForProducer(room.router, producer)
            console.log('created plain transport for producer', producer.id, 'tuple', transport.tuple)

            // spawn ffmpeg to pull from plain transport port if available
            if (transport.tuple && transport.tuple.localPort) {
              const udpPort = transport.tuple.localPort
              const { startSfuCapture } = require('./sfuCapture')
              startSfuCapture({ udpHost: transport.tuple.localIp || '127.0.0.1', udpPort, apiKey: process.env.OPENAI_API_KEY, roomId, socketId: socket.id })
              console.log('started SFU capture (ffmpeg) for producer', producer.id)
            }
          }
        } catch (err) { console.error('start SFU capture failed', err) }
      }

      cb({ ok: true, id: producer.id })
    } catch (err: any) {
      console.error('produce err', err)
      cb({ error: err.message })
    }
  })

  socket.on('consume', async ({ roomId, transportId, producerId, rtpCapabilities }: any, cb: Function) => {
    try {
      const room = getRoom(roomId)
      if (!room || !room.router) return cb({ error: 'Room or router not found' })
      const router = room.router
      const canConsume = router.canConsume({ producerId, rtpCapabilities })
      if (!canConsume) return cb({ error: 'Cannot consume' })

      const transports: Map<string, any> = socket.data.transports
      const transport = transports?.get(transportId)
      if (!transport) return cb({ error: 'Transport not found' })

      const consumer = await transport.consume({ producerId, rtpCapabilities, paused: false })

      // store consumer
      const consumers = socket.data.consumers || new Map()
      consumers.set(consumer.id, consumer)
      socket.data.consumers = consumers

      cb({ ok: true, id: consumer.id, producerId: consumer.producerId, kind: consumer.kind, rtpParameters: consumer.rtpParameters })
    } catch (err: any) {
      console.error('consume err', err)
      cb({ error: err.message })
    }
  })

  socket.on('resumeConsumer', async ({ consumerId }: any, cb: Function) => {
    try {
      const consumers: Map<string, any> = socket.data.consumers
      const consumer = consumers?.get(consumerId)
      if (!consumer) return cb({ error: 'Consumer not found' })
      await consumer.resume()
      cb({ ok: true })
    } catch (err: any) {
      cb({ error: err.message })
    }
  })
}