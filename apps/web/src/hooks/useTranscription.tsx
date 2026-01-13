import { useEffect, useRef, useState } from 'react'
import socket from '../lib/socket'

interface TranscriptSegment {
  speaker: string
  speakerName?: string
  text: string
  timestamp: number
  partial?: boolean
  final?: boolean
}

interface UseTranscriptionReturn {
  start: () => Promise<void>
  stop: () => void
  isRecording: boolean
  segments: TranscriptSegment[]
  clear: () => void
}

export default function useTranscription(roomId: string | null): UseTranscriptionReturn {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [segments, setSegments] = useState<TranscriptSegment[]>([])

  useEffect(() => {
    function onSegment(data: TranscriptSegment) {
      setSegments(s => [...s, data])
    }

    function onFinal(data: TranscriptSegment) {
      setSegments(s => [...s, { ...data, final: true }])
    }

    socket.on('transcription:segment', onSegment)
    socket.on('transcription:final', onFinal)

    return () => {
      socket.off('transcription:segment', onSegment)
      socket.off('transcription:final', onFinal)
    }
  }, [])

  async function start(): Promise<void> {
    if (!roomId) return
    try {
      // request mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mr

      mr.ondataavailable = (ev) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const base64 = result.split(',')[1]
          socket.emit('transcription:audio', { roomId, data: base64 })
        }
        reader.readAsDataURL(ev.data)
      }

      mr.onstart = () => setIsRecording(true)
      mr.onstop = () => setIsRecording(false)

      socket.emit('transcription:start', { roomId }, (res: any) => {
        // ignore
      })

      mr.start(1000) // emit every 1s
    } catch (error) {
      console.error('Failed to start transcription:', error)
      setIsRecording(false)
    }
  }

  function stop(): void {
    if (!roomId) return
    mediaRecorderRef.current?.stop()
    socket.emit('transcription:stop', { roomId })
  }

  return { start, stop, isRecording, segments, clear: () => setSegments([]) }
}
