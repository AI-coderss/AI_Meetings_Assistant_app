import { useEffect, useState } from 'react'
import socket from '../lib/socket'

export default function useSocket() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    function onConnect() {
      setConnected(true)
      console.log('socket connected')
    }

    function onDisconnect() {
      setConnected(false)
      console.log('socket disconnected')
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    // connect on mount
    if (!socket.connected) socket.connect()

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.disconnect()
    }
  }, [])

  return { socket, connected }
}
