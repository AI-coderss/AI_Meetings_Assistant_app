# AI Meetings Assistant

✅ **Real-time meeting assistant** that provides live transcription, summaries, and meeting capture using mediasoup, OpenAI, and a React front-end.

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
- [Testing](#testing)
- [Deployment & Production Notes](#deployment--production-notes)
- [Troubleshooting & Known Limitations](#troubleshooting--known-limitations)
- [Contributing](#contributing)
- [Project Structure](#project-structure)
- [License](#license)

---

## Project Overview

AI Meetings Assistant is an experimental app for running real-time meetings with live transcription and summarization. It combines a WebRTC SFU (mediasoup) server and a React front-end. The server optionally integrates with OpenAI Realtime transcription APIs and Chat Completion APIs for summarization.

This repo implements a complete dev experience with mock engines and test suites so you can run locally without external APIs.

---

## Key Features

- Live multi-participant meetings using mediasoup
- Optional OpenAI realtime transcription adapter
- Transcript persistence (DB and/or S3) configurable with env vars
- Summarization using OpenAI Chat Completions (if API key provided)
- React-based web interface with participant grid and transcript panel
- Unit and integration tests for server components

---

## Architecture & Components 🔧

- `apps/web` — React UI (Vite + TypeScript)
- `packages/server` — Express + Socket.IO, mediasoup integration, transcription/summarizer adapters, storage helpers
- Tests live under `packages/server/test`

Important server modules:
- `src/mediasoup.ts` — mediasoup worker & router setup
- `src/mediasoupHandlers.ts` — socket handlers for transports/producing/consuming
- `src/transcription.ts` — transcription orchestration (mock or OpenAI)
- `src/openaiRealtimeTranscriber.ts` — Realtime adapter (WS) for OpenAI
- `src/summarizer.ts` — summarization via OpenAI Chat Completions or mock fallback
- `src/db.ts` — Postgres helpers
- `src/storage.ts` — S3 helper for uploading transcripts

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

### Web app only

```bash
npm --prefix apps/web install
npm --prefix apps/web run dev
```

### Server only

```bash
npm --prefix packages/server install
npm --prefix packages/server run dev
```

Server endpoints of interest:
- `GET /rooms/:id/export` — export raw transcript or summary
- `POST /rooms/:id/export` — upload transcript to S3 and/or persist to DB (depending on env)

---

## Testing ✅

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

---

## Deployment & Production Notes

- mediasoup requires publicly reachable IPs and correct UDP port ranges. Configure `PUBLIC_IP`, `MEDIASOUP_MIN_PORT`, `MEDIASOUP_MAX_PORT` accordingly.
- Ensure `ffmpeg` is installed on the host if SFU capture is enabled.
- Secure your OpenAI API key and S3 credentials via your environment/secret manager.
- Add a build step for the server (e.g., `tsc` compile to `dist/`) if you prefer running the compiled node bundle in production.

---

## Troubleshooting & Known Limitations ⚠️

- The OpenAI realtime transcript adapter is implemented but the exact streaming protocol may need updates to match OpenAI SDK changes.
- Tests use mocks for OpenAI and SFU capture; real cloud resources are not required for local runs.
- Mediasoup can be sensitive to OS resources and port availability — if you see worker crashes, ensure the port range is free and the machine allows UDP traffic.

If you hit a specific issue, run the server in debug and view logs from the `mediasoup` worker to identify port/permission issues.

---

## Contributing 🙌

We welcome contributions!

- Fork the repo and create a feature branch
- Follow coding conventions (TypeScript, linting, Prettier)
- Run tests and ensure they pass
- Open a PR with a clear description and testing steps

Helpful commands:

```bash
# lint & format
npm run lint
npm run format

# run unit tests
npm test
```

---

## Project Structure

```
/ (workspace root)
├─ apps/web/                # React UI (Vite + TS)
├─ packages/server/         # Server: mediasoup, transcription, storage, summarizer
├─ docs/                    # Documentation and operating notes
```

Files of interest:
- `apps/web/src` — components and hooks used by the UI
- `packages/server/src` — server implementation and adapters
- `packages/server/test` — integration and unit tests

---

## License

This project is provided under the **MIT License**. Add or update `LICENSE` file if you prefer a different license.

---

## Questions or Feedback

If you'd like changes to the README (more sections, examples, or a getting-started video guide), open an issue or send a PR with your suggested edits.

---

Made with ❤️ for hackable realtime meetings.