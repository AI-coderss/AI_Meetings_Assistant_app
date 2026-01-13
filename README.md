# AI Meetings Assistant

✅ **Real-time meeting assistant** that provides live transcription, summaries, and meeting capture using mediasoup, OpenAI, and a React front-end.

> A production-ready monorepo application for building real-time collaborative meetings with AI-powered transcription and summarization.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Architecture & Components](#architecture--components)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
  - [Start Everything (dev)](#start-everything-dev)
  - [Web app only](#web-app-only)
  - [Server only](#server-only)
- [API Documentation](#api-documentation)
  - [Socket.IO Events](#socketio-events)
  - [REST Endpoints](#rest-endpoints)
- [Development Workflow](#development-workflow)
- [Code Quality](#code-quality)
- [Testing](#testing)
  - [Server Tests](#server-tests)
  - [Unit Tests](#unit-tests)
- [TypeScript & Type Safety](#typescript--type-safety)
- [Deployment & Production Notes](#deployment--production-notes)
- [Troubleshooting & Known Limitations](#troubleshooting--known-limitations)
- [Contributing](#contributing)
- [Project Structure](#project-structure)
- [License](#license)

---

## Project Overview

AI Meetings Assistant is an experimental app for running real-time meetings with live transcription and summarization. It combines a WebRTC SFU (mediasoup) server and a React front-end. The server optionally integrates with OpenAI Realtime transcription APIs and Chat Completion APIs for summarization.

This repo implements a complete dev experience with mock engines and test suites so you can run locally without external APIs.

### Project Goals

- ✨ Provide a robust foundation for real-time meeting applications
- 🎯 Support both local development and production deployments
- 🔒 Maintain strong type safety with TypeScript
- 📝 Enable AI-powered meeting transcription and summarization
- 🧪 Include comprehensive testing and validation

---

## Key Features

- **Live multi-participant meetings** using mediasoup for WebRTC SFU management
- **Optional OpenAI realtime transcription adapter** with streaming audio support
- **Transcript persistence** to Postgres DB and/or S3 (configurable via env vars)
- **AI summarization** using OpenAI Chat Completions (with mock fallback)
- **React-based web interface** with participant grid, transcript panel, and controls
- **Unit and integration tests** for server components with proper test coverage
- **Full TypeScript support** with strict mode enabled for type safety
- **Socket.IO real-time communication** for seamless peer updates
- **Mock implementations** for local development without external APIs

---

## Architecture & Components 🔧

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser / Web UI                    │
│  (React + Vite + Socket.IO Client + TypeScript)        │
│  ├── Components: ParticipantGrid, TranscriptPanel      │
│  ├── Hooks: useSocket, useTranscription               │
│  └── Styles: SCSS with variables and mixins           │
└────────────────┬────────────────────────────────────────┘
                 │
        Socket.IO + WebRTC (ICE candidates)
                 │
┌────────────────▼────────────────────────────────────────┐
│              Express + Socket.IO Server                 │
│  (Node.js + TypeScript with Strict Mode)               │
│                                                         │
│  ├── mediasoup Integration (WebRTC SFU)               │
│  ├── Transcription Engine (Mock or OpenAI)             │
│  ├── Summarizer (Chat Completions)                    │
│  ├── Persistence Layer (DB, S3, Local)                │
│  └── Room & Peer Management                           │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    [PostgreSQL]          [S3 Storage]       [OpenAI API]
```

### Workspace Structure

- **`apps/web`** — React UI (Vite + TypeScript)
  - **`src/components/`** — Reusable UI components
  - **`src/hooks/`** — Custom React hooks for socket and transcription
  - **`src/lib/`** — Socket.IO client setup
  - **`src/pages/`** — Page components (Meeting, Schedule)
  - **`src/styles/`** — SCSS stylesheets with mixins and variables

- **`packages/server`** — Express + Socket.IO server (Node.js + TypeScript)
  - **`src/mediasoup.ts`** — mediasoup worker & router initialization
  - **`src/mediasoupHandlers.ts`** — Socket.IO handlers for RTC transport management
  - **`src/transcription.ts`** — Transcription orchestration with mock/OpenAI fallback
  - **`src/openaiRealtimeTranscriber.ts`** — OpenAI realtime WebSocket adapter
  - **`src/openaiTranscriber.ts`** — OpenAI transcription client
  - **`src/summarizer.ts`** — Meeting summarization via Chat Completions
  - **`src/db.ts`** — PostgreSQL query helpers
  - **`src/storage.ts`** — S3 and local storage helpers
  - **`src/rooms.ts`** — In-memory room and peer state management
  - **`src/meetings.ts`** — Meeting metadata and access tokens
  - **`src/plainCapture.ts`** — Plain media capture utilities
  - **`src/sfuCapture.ts`** — SFU-based meeting capture
  - **`test/`** — Comprehensive integration and unit tests

### Key Server Modules

| Module | Purpose |
|--------|---------|
| `mediasoup.ts` | WebRTC SFU worker setup, router creation, media codec configuration |
| `mediasoupHandlers.ts` | Socket.IO handlers for peer transports, producers, consumers |
| `transcription.ts` | Coordinates transcription sessions, manages ffmpeg, emits segments |
| `openaiRealtimeTranscriber.ts` | WebSocket adapter for OpenAI realtime transcription API |
| `summarizer.ts` | Generates meeting summaries using OpenAI Chat Completions |
| `db.ts` | PostgreSQL connection pool, query builders, migrations |
| `storage.ts` | Uploads transcripts to S3, saves locally, manages file paths |
| `rooms.ts` | In-memory Map-based room state, peer tracking, router management |

---



## Quick Start

Requirements:
- Node.js (recommended v18+)
- npm (or compatible)
- ffmpeg binary available (for SFU capture/ffmpeg spawn; optional in dev)

1. Install all workspace packages

```bash
npm install
```

2. Copy and edit a `.env` file (see below for variables)

3. Start both server and web app in development

```bash
npm run dev
```

This runs both the web app and the server concurrently (root workspace script).

---

## Environment Variables

Create a `.env` in `packages/server` or set env vars in your environment. Example:

```
# OpenAI
OPENAI_API_KEY=sk-...
USE_OPENAI_TRANSCRIBE=1
OPENAI_REALTIME_MODEL=transcribe-4o

# Persistence
PERSIST_TRANSCRIPTS=1
S3_BUCKET=my-bucket
PERSIST_TRANSCRIPTS_DB=1
DATABASE_URL=postgres://user:pass@host:5432/dbname
PERSIST_MEETINGS_DB=1

# mediasoup
MEDIASOUP_MIN_PORT=20000
MEDIASOUP_MAX_PORT=20100
PUBLIC_IP=203.0.113.4

# Misc
AUTO_START_TRANSCRIPTION=0
AUTO_SFU_CAPTURE=0

# Expose server port
PORT=3000
```

Key flags:
- `USE_OPENAI_TRANSCRIBE=1` + `OPENAI_API_KEY` enables real OpenAI transcription
- `S3_BUCKET`, `PERSIST_TRANSCRIPTS=1` enables uploading transcripts to S3
- `PERSIST_TRANSCRIPTS_DB=1` and `PERSIST_MEETINGS_DB=1` use `DATABASE_URL` to persist records

> Note: The code falls back to mock transcription/summarization when OpenAI keys aren't set, which is useful for local development.

---

## Local Development

### Start Everything (dev)

```bash
npm run dev
```

This runs the server and web app concurrently. The web UI is served by Vite and the server runs with `ts-node-dev`.

**Expected output:**
```
[web] VITE v5.0.0 ready in 500ms
[server] [nodemon] watching: src/**/* test/**/*
[server] Server running on http://localhost:4000
```

Access the web UI at `http://localhost:5173` (Vite default port)

### Web app only

```bash
npm --prefix apps/web install
npm --prefix apps/web run dev
```

Vite will serve the app on `http://localhost:5173`. The app will attempt to connect to a server at `http://localhost:4000` by default.

To use a different server URL, set the `VITE_SERVER_URL` environment variable:

```bash
VITE_SERVER_URL=http://example.com:4000 npm --prefix apps/web run dev
```

### Server only

```bash
npm --prefix packages/server install
npm --prefix packages/server run dev
```

Server will start on port 3000 by default (configurable via `PORT` env var). Health check available at `http://localhost:3000/health`.

### Server endpoints of interest

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/rooms/:id` | GET | Get room info and peer list |
| `/rooms/:id/export` | GET | Export transcript (format: json \| txt) |
| `/rooms/:id/export` | POST | Persist transcript to DB/S3 |

---

## API Documentation

### Socket.IO Events

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `transcription:start` | `{ roomId: string }` | Start transcription for a room |
| `transcription:audio` | `{ roomId: string; data: string (base64) }` | Send audio chunk to transcriber |
| `transcription:stop` | `{ roomId: string }` | Stop transcription session |
| `mediasoup:getRouterRtpCapabilities` | `{ roomId: string }` | Get SFU router capabilities |
| `mediasoup:createTransport` | `{ roomId: string; role: 'send'\|'recv' }` | Create a WebRTC transport |
| `mediasoup:connectTransport` | `{ transportId: string; dtlsParameters: any }` | Connect transport with DTLS |
| `mediasoup:produce` | `{ transportId: string; kind: 'audio'\|'video'; rtpParameters: any }` | Start producing media |
| `mediasoup:consume` | `{ transportId: string; producerId: string; rtpCapabilities: any }` | Start consuming media |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `transcription:segment` | `{ speaker: string; speakerName?: string; text: string; timestamp: number; partial?: boolean }` | Partial transcription segment |
| `transcription:final` | `{ speaker: string; speakerName?: string; text: string; timestamp: number; final: true }` | Final transcription |
| `speaker-activity` | `{ speaker: string }` | Notifies when a peer speaks |
| `mediasoup:rtpCapabilities` | `{ rtpCapabilities: any }` | Router's RTC capabilities |
| `mediasoup:transportCreated` | `{ id: string; iceParameters: any; dtlsParameters: any; ... }` | Transport ready for connection |
| `mediasoup:consumerCreated` | `{ id: string; producerId: string; kind: string; rtpParameters: any; ... }` | New consumer created |
| `connect` | — | Socket.IO connection established |
| `disconnect` | — | Socket.IO connection closed |

### REST Endpoints

#### GET `/health`
Health check endpoint.

**Response:**
```json
{ "ok": true }
```

#### GET `/rooms/:id`
Get room information and list of peers.

**Response:**
```json
{
  "id": "demo-room",
  "peers": [
    { "id": "peer-1", "name": "Alice" },
    { "id": "peer-2", "name": "Bob" }
  ]
}
```

#### GET `/rooms/:id/export?format=json|txt`
Export transcript from a room.

**Parameters:**
- `format` - `json` (default) or `txt`

**Response (JSON):**
```json
{
  "segments": [
    {
      "speaker": "peer-1",
      "speakerName": "Alice",
      "text": "Hello everyone",
      "timestamp": 1705090000000,
      "partial": false
    }
  ]
}
```

#### POST `/rooms/:id/export`
Persist transcript to DB and/or upload to S3 (based on env vars).

**Response:**
```json
{ "success": true, "roomId": "demo-room" }
```

---

## Development Workflow

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd AI_Meetings_Assistant_app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp packages/server/.env.example packages/server/.env
   # Edit with your settings (see Environment Variables section)
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

### Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start both web app and server concurrently |
| `npm run dev:web` | Start web app only (Vite dev server) |
| `npm run dev:server` | Start server only (ts-node-dev watch mode) |
| `npm run lint` | Run ESLint on all TypeScript/JavaScript files |
| `npm run format` | Format code with Prettier |
| `npm test` | Run Jest tests with coverage |

### Adding New Features

1. **For server features:**
   ```bash
   # Add new module in packages/server/src/
   # Add corresponding Socket.IO handlers in index.ts
   # Write tests in packages/server/test/
   npm run lint
   npm test
   ```

2. **For web features:**
   ```bash
   # Add components in apps/web/src/components/
   # Add hooks in apps/web/src/hooks/
   # Update styles in apps/web/src/styles/
   npm run lint
   npm run format
   ```

### Code Structure Guidelines

- **Server code** must be TypeScript with strict mode enabled
- **Web code** must be React + TypeScript with proper hooks
- **All files** must pass linting and formatting checks
- **Tests** should cover critical paths and error cases
- **Types** should be defined at module boundaries (interfaces, types)

---

## Code Quality

### TypeScript Configuration

The project uses **strict TypeScript mode** with:
- ✅ Strict null checks
- ✅ Strict function types
- ✅ No implicit any
- ✅ No implicit this
- ✅ Strict binding of class methods

**Files with `@ts-nocheck`:**
These should be gradually refactored to full type safety. Priority items are in `packages/server/src/`.

### Linting & Formatting

```bash
# Check for linting errors
npm run lint

# Auto-fix formatting issues
npm run format
```

**ESLint Configuration:**
- Based on TypeScript ESLint plugin
- Max warnings: 0 (all warnings treated as errors)

**Prettier Configuration:**
- 2-space indentation
- Single quotes for JS/TS
- No semicolons at end of statements

---

## Testing ✅

### Server Tests

Run server tests:

```bash
# Run specific test helpers similar to repository's test scripts
npm --prefix packages/server run test:openai:adapter
npm --prefix packages/server run smoke
npm --prefix packages/server run test:all
```

Root workspace also has convenience scripts for linting and formatting:

```bash
npm run lint
npm run format
```

### Unit Tests

Jest configuration available for running tests:

```bash
npm test                  # Run all tests with coverage
npm test -- --watch      # Run tests in watch mode
npm test -- <test-file>  # Run specific test file
```

**Test Coverage Goals:**
- Critical paths: ≥80%
- Utility functions: ≥90%
- Error handling: 100%

### Integration Tests

The `packages/server/test/` directory contains integration tests for:
- mediasoup transport creation
- Transcription session management
- Persistence (DB and S3)
- Socket.IO message handling

---

## Deployment & Production Notes

### Prerequisites

- **mediasoup** requires publicly reachable IPs and correct UDP port ranges
- **ffmpeg** must be installed on the host if SFU capture is enabled
- **PostgreSQL** (optional) for transcript and meeting persistence
- **AWS S3 credentials** (optional) for transcript uploads

### Configuration for Production

1. **mediasoup networking:**
   ```env
   PUBLIC_IP=your.public.ip.address
   MEDIASOUP_MIN_PORT=20000
   MEDIASOUP_MAX_PORT=20100
   ```

2. **OpenAI API:**
   ```env
   OPENAI_API_KEY=sk-...
   USE_OPENAI_TRANSCRIBE=1
   ```

3. **Persistence:**
   ```env
   PERSIST_TRANSCRIPTS=1
   PERSIST_TRANSCRIPTS_DB=1
   DATABASE_URL=postgres://user:pass@host:5432/dbname
   S3_BUCKET=your-bucket-name
   ```

4. **Build and deploy:**
   ```bash
   # Build TypeScript to dist/
   npm --prefix packages/server run build
   
   # Start from dist/
   node packages/server/dist/index.js
   ```

5. **Security considerations:**
   - ✅ Use environment variables or secret managers for API keys
   - ✅ Enable CORS only for your domain
   - ✅ Use HTTPS/WSS in production
   - ✅ Implement rate limiting on REST endpoints
   - ✅ Validate all Socket.IO payloads
   - ✅ Set up monitoring and alerting for mediasoup worker health

### Monitoring

```bash
# View logs
tail -f server.log

# Check mediasoup worker health
curl http://localhost:3000/health
```

### Scaling Considerations

- **Multiple workers:** mediasoup runs one worker per CPU core by default
- **Load balancing:** Use a reverse proxy (nginx, HAProxy) with sticky sessions
- **Database:** Ensure PostgreSQL has sufficient connections
- **Storage:** S3 buckets should have lifecycle policies for archival

---

## Troubleshooting & Known Limitations ⚠️

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `mediasoup worker died` | Port range unavailable or OS limits | Check firewall, ensure UDP ports are open, increase ulimit |
| `failed to load audio from getUserMedia` | Missing browser permissions | Check HTTPS in production, grant mic permission |
| `ffmpeg: command not found` | ffmpeg not installed | Install ffmpeg: `apt install ffmpeg` or use `ffmpeg-static` |
| `cannot connect to PostgreSQL` | Invalid connection string or DB down | Verify `DATABASE_URL`, check DB server is running |
| `S3 upload fails` | Invalid credentials or bucket policy | Verify AWS credentials, check bucket exists and is accessible |
| `OpenAI API errors` | Invalid key or rate limit | Check `OPENAI_API_KEY`, verify API quota, implement retry logic |

### Known Limitations

- **OpenAI realtime adapter:** The exact WebSocket streaming protocol may need updates to match OpenAI SDK changes
- **Tests:** Use mocks for OpenAI and SFU capture; real cloud resources are not required for local runs
- **mediasoup:** Sensitive to OS resources and port availability — if you see worker crashes, ensure the port range is free and the machine allows UDP traffic
- **Browser support:** Modern browsers with WebRTC support required (Chrome, Firefox, Safari, Edge)

### Debug Mode

Enable verbose logging:

```bash
# Server-side
DEBUG=mediasoup:* npm --prefix packages/server run dev

# Check mediasoup worker logs
tail -f /tmp/mediasoup-worker.log
```

---

## Contributing 🙌

We welcome contributions! This project follows standard open-source practices.

### Code Contributions

1. **Fork and branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow code standards:**
   - Use TypeScript with strict mode
   - Follow existing code style
   - Write clear commit messages
   - Add tests for new functionality

3. **Testing:**
   ```bash
   npm run lint          # Check linting
   npm run format        # Auto-format code
   npm test              # Run tests
   npm test -- --coverage
   ```

4. **Create a PR:**
   - Write clear PR description
   - Reference any related issues
   - Ensure all tests pass
   - Include example usage for new features

### Areas for Contribution

- 🎯 **Type safety:** Remove `@ts-nocheck` directives and improve type definitions
- 🧪 **Testing:** Increase test coverage, add integration tests
- 📚 **Documentation:** Improve docs, add examples, create guides
- 🐛 **Bug fixes:** Report and fix issues
- ✨ **Features:** New components, hooks, or server modules
- 🎨 **UI/UX:** Design improvements, accessibility fixes

### Development Tips

```bash
# Format before committing
npm run format && npm run lint

# Run tests with coverage
npm test -- --coverage

# Check a specific module
npm test -- packages/server/src/transcription.ts

# Debug server with inspector
node --inspect-brk dist/index.js
```

### Commit Message Convention

```
type(scope): description

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat(transcription): add OpenAI Realtime streaming support

Implement WebSocket adapter for OpenAI Realtime API
with proper error handling and cleanup.

Closes #42
```

---

## Project Structure

### Detailed Directory Layout

```
AI_Meetings_Assistant_app/
├── apps/
│   └── web/                          # React web application
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts (implied)
│       └── src/
│           ├── App.tsx               # Root component
│           ├── main.tsx              # Entry point
│           ├── components/           # UI components
│           │   ├── BottomBar.tsx
│           │   ├── ParticipantCard.tsx
│           │   ├── ParticipantGrid.tsx
│           │   ├── TranscriptPanel.tsx
│           │   └── index.ts          # Component exports
│           ├── hooks/                # Custom React hooks
│           │   ├── useSocket.tsx    # Socket.IO connection management
│           │   ├── useTranscription.tsx  # Transcription logic
│           │   └── index.ts
│           ├── lib/                  # Utilities and config
│           │   └── socket.ts         # Socket.IO client setup
│           ├── pages/                # Page components
│           │   └── Schedule.tsx
│           └── styles/               # SCSS stylesheets
│               ├── global.scss
│               ├── _variables.scss
│               ├── _mixins.scss
│               └── components/
│                   └── _participant.scss
│
├── packages/
│   └── server/                       # Node.js/Express backend
│       ├── package.json
│       ├── tsconfig.json
│       ├── jest.config.js
│       ├── src/
│       │   ├── index.ts              # Express server entry
│       │   ├── mediasoup.ts          # WebRTC SFU setup
│       │   ├── mediasoupHandlers.ts  # Socket.IO WebRTC handlers
│       │   ├── rooms.ts              # Room state management
│       │   ├── meetings.ts           # Meeting metadata
│       │   ├── transcription.ts      # Transcription orchestration
│       │   ├── openaiTranscriber.ts  # OpenAI client
│       │   ├── openaiRealtimeTranscriber.ts  # OpenAI Realtime adapter
│       │   ├── summarizer.ts         # Meeting summarization
│       │   ├── storage.ts            # S3 and local storage
│       │   ├── db.ts                 # PostgreSQL helpers
│       │   ├── sfuCapture.ts         # SFU capture utilities
│       │   └── plainCapture.ts       # Basic capture utilities
│       └── test/
│           ├── meetings.test.js
│           ├── openai_realtime_adapter.test.ts
│           ├── transcription.test.js
│           ├── transcription_socket_test.js
│           ├── sfu_capture_test.js
│           ├── persist_transcript_test.js
│           ├── summarize_test.js
│           ├── plain_transport_test.js
│           ├── smoke.js
│           ├── openai_realtime_test.js
│           └── README.md
│
├── docs/
│   └── OPERATIONS.md                 # Deployment and operations guide
│
├── package.json                      # Root workspace configuration
└── README.md                         # This file
```

### Key Files

| File | Purpose |
|------|---------|
| `apps/web/src/App.tsx` | Root React component, page routing |
| `apps/web/src/hooks/useSocket.tsx` | Socket.IO connection hook with error handling |
| `apps/web/src/hooks/useTranscription.tsx` | Transcription state and audio capture |
| `packages/server/src/index.ts` | Express server setup, Socket.IO handlers |
| `packages/server/src/mediasoup.ts` | mediasoup worker and router initialization |
| `packages/server/src/transcription.ts` | Transcription session management |
| `packages/server/src/db.ts` | PostgreSQL connection and queries |
| `packages/server/src/storage.ts` | S3 and file storage operations |

---

## TypeScript & Type Safety

### Strict Mode

All TypeScript files use strict mode. Key settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true
  }
}
```

### Type Definitions

Key interfaces used throughout the codebase:

**Transcription:**
```typescript
interface TranscriptSegment {
  speaker: string
  speakerName?: string
  text: string
  timestamp: number
  partial?: boolean
  final?: boolean
}
```

**Socket Events:**
```typescript
interface TranscriptionStartPayload {
  roomId: string
}

interface TranscriptionAudioPayload {
  roomId: string
  data: string  // base64-encoded audio
}
```

**Room Management:**
```typescript
interface Peer {
  id: string
  name?: string
}

interface Room {
  id: string
  router?: mediasoup.types.Router
  peers: Map<string, Peer>
}
```

### Improving Type Safety

1. **Remove `@ts-nocheck`:**
   - Files currently using this should be gradually refactored
   - Priority: `packages/server/src/transcription.ts`

2. **Add proper type definitions:**
   ```bash
   # Check for implicit any
   npm run lint
   ```

3. **Use strict interfaces:**
   - Define interfaces for Socket.IO payloads
   - Export types from modules
   - Use discriminated unions for variant types

---

## License

This project is provided under the **MIT License**. 

For details, see the [LICENSE](LICENSE) file. Add or update `LICENSE` file if you prefer a different license.

### MIT License Summary

You are free to:
- ✅ Use commercially
- ✅ Modify the code
- ✅ Distribute
- ✅ Use privately

With the condition:
- ⚠️ Include license and copyright notice

---

## Getting Help

### Questions or Issues

If you have questions or encounter issues:

1. **Check existing issues:** Search GitHub issues for similar problems
2. **Read documentation:** Review [docs/OPERATIONS.md](docs/OPERATIONS.md)
3. **Debug locally:** Run with debug logging enabled:
   ```bash
   DEBUG=* npm run dev
   ```
4. **Create an issue:** Include:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node.js version, etc.)

### Feature Requests

Describe your use case and desired behavior. Pull requests are welcome!

### Contributing Documentation

Improvements to documentation are always appreciated:

- Fix typos and unclear sections
- Add examples and tutorials
- Improve architecture diagrams
- Document edge cases and gotchas

---

## Roadmap

### Completed

- ✅ Core mediasoup integration
- ✅ Mock transcription engine
- ✅ OpenAI Realtime adapter
- ✅ Transcript persistence (DB, S3, local)
- ✅ React UI with real-time updates
- ✅ Socket.IO communication
- ✅ TypeScript strict mode setup

### Planned

- 🔜 Official OpenAI SDK integration
- 🔜 Web-based participant settings
- 🔜 Meeting recordings (HLS/DASH)
- 🔜 Real-time subtitles/closed captions
- 🔜 Analytics dashboard
- 🔜 Speaker diarization
- 🔜 Multi-language support

### In Discussion

- 🤔 Custom audio effects/filters
- 🤔 Recording to multiple formats
- 🤔 Meeting notifications
- 🤔 User authentication system

---

## Related Projects

- [mediasoup](https://mediasoup.org/) - WebRTC SFU and router
- [Socket.IO](https://socket.io/) - Real-time communication library
- [OpenAI API](https://openai.com/api/) - AI transcription and chat
- [React](https://react.dev/) - UI library
- [Vite](https://vitejs.dev/) - Frontend build tool

---

## Performance Considerations

### Recommended Specs

**Development:**
- 4+ GB RAM
- 2+ CPU cores
- 200+ Mbps network bandwidth

**Production:**
- 8+ GB RAM
- 4+ CPU cores
- Dedicated network interface
- SSD for database

### Optimization Tips

1. **Database:** Use connection pooling, optimize queries
2. **Network:** Enable UDP offloading, consider CDN for assets
3. **mediasoup:** Monitor port availability, tune worker settings
4. **Storage:** Enable S3 lifecycle policies, compress transcripts
5. **API:** Implement caching, rate limiting, request batching

---

## Security Best Practices

1. **API Keys:**
   - ✅ Never commit `.env` files
   - ✅ Use secret managers in production
   - ✅ Rotate keys regularly
   - ✅ Use separate keys for dev/test/prod

2. **Database:**
   - ✅ Use connection encryption
   - ✅ Enable authentication
   - ✅ Regular backups
   - ✅ Principle of least privilege

3. **WebRTC:**
   - ✅ Validate DTLS parameters
   - ✅ Use SRTP for media encryption
   - ✅ Implement ICE candidate filtering
   - ✅ Monitor for suspicious activity

4. **Socket.IO:**
   - ✅ Validate all incoming data
   - ✅ Implement rate limiting
   - ✅ Use namespaces for isolation
   - ✅ Enable CORS carefully

5. **S3:**
   - ✅ Use IAM policies for least privilege
   - ✅ Enable bucket versioning
   - ✅ Enable encryption at rest
   - ✅ Consider server-side encryption

---

Made with ❤️ for hackable realtime meetings.
