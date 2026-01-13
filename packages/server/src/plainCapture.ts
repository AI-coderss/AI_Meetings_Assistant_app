// Helper to create a PlainTransport and attach a server-side consumer for a producer
import type mediasoup from 'mediasoup'
import { getRoom, setRoomRouter } from './rooms'

export async function createPlainCaptureForProducer(router: mediasoup.types.Router, producer: any) {
  // create plain transport
  const transport = await router.createPlainTransport({
    listenIp: { ip: '127.0.0.1', announcedIp: process.env.PUBLIC_IP || undefined },
    rtcpMux: true,
    comedia: false
  })

  // create a consumer attached to this transport for the given producer
  // NOTE: In many deployments you may want to create the consumer on a separate router/transport and
  // then forward RTP to an external endpoint. This is a basic server-side consumer to get media.
  const rtpCapabilities = router.rtpCapabilities
  let consumer: any = null
  try {
    consumer = await transport.consume({ producerId: producer.id, rtpCapabilities, paused: false })
  } catch (err) {
    // some routers may not allow consuming directly on PlainTransport; ignore errors
    console.warn('plain transport consume failed', err.message)
  }

  return { transport, consumer }
}
