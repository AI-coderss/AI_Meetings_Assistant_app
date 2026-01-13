Mediasoup server scaffold

This package contains the signaling server and initial mediasoup scaffolding.

Environment variables:
- MEDIASOUP_MIN_PORT (default 20000)
- MEDIASOUP_MAX_PORT (default 20100)

Endpoints:
- GET /health
- GET /rooms/:id

Socket.io events:
- createRoom { roomId }
- joinRoom { roomId, name }
- leaveRoom { roomId }
- getPeers { roomId }
- broadcast { roomId, event, payload }

Notes:
- This is a scaffold for mediasoup integration; full transport/probe/produce/consume flows will be added in the next iteration.

Transcription integration:
- Set OPENAI_API_KEY to enable OpenAI calls.
- Set USE_OPENAI_TRANSCRIBE=1 to enable the realtime adapter. The repository now contains a WebSocket-based realtime adapter `openaiRealtimeTranscriber.ts`. Confirm and adapt the WebSocket message/event formats to the official OpenAI Realtime API docs.
- Set AUTO_START_TRANSCRIPTION=1 to auto-start transcription when a producer is created (server-side), improving per-producer diarization.

Diarization & SFU capture:
- Producers are mapped to socket IDs (server-side) so transcription segments can be attributed reliably to participants.
- For server-side capture of SFU audio (advanced use), you can create a PlainTransport and use FFmpeg to pull RTP for a producer; this is non-trivial and requires careful SDP/codec configuration. See `packages/server/src/mediasoupHandlers.ts` produce handlers for hooks where you can add recording/forwarding logic.

Tests:
- Run `npm run test:transcription` to run a socket-based transcription smoke test (uses mock engine by default).
- Run `npm run test:persist` to run a persistence smoke test which starts transcription, stops it, and calls the export/upload endpoint (uses mock engine by default).
- Run `npm run test:sfu:capture` to run the SFU capture test (uses a mock transcriber unless OPENAI_API_KEY is available).
