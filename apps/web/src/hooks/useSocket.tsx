import { useEffect, useState } from 'react'
import socket, { Socket } from '../lib/socket'

interface UseSocketReturn {
  socket: Socket
  connected: boolean
  error: Error | null
}

export default function useSocket(): UseSocketReturn {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    function onConnect() {
      setConnected(true)
      setError(null)
      console.log('socket connected')
    }

    function onDisconnect() {
      setConnected(false)
      console.log('socket disconnected')
    }

    function onError(err: Error) {
      setError(err)
      console.error('socket error:', err)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('error', onError)

    // connect on mount
    if (!socket.connected) {
      socket.connect()
    }

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('error', onError)
      socket.disconnect()
    }
  }, [])

  return { socket, connected, error }
}
