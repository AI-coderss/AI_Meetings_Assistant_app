# Operations & Deployment Guide

## Overview
This document covers deploying the AI Meetings Assistant and running E2E validations.

## Required environment variables
- `OPENAI_API_KEY` — key for OpenAI APIs
- `USE_OPENAI_TRANSCRIBE` — set to `1` to enable realtime transcription
- `AUTO_SFU_CAPTURE` — set to `1` to enable automatic SFU capture
- `PERSIST_TRANSCRIPTS=1` — persist transcripts after meeting ends
- `PERSIST_TRANSCRIPTS_DB=1` — persist to Postgres (requires `DATABASE_URL`)
- `S3_BUCKET` — optional S3 bucket name for uploads
- `DATABASE_URL` — Postgres URL if using DB persistence

## Running locally
1. Install deps: `npm install`
2. Start server: `npm --prefix packages/server run dev`
3. Start web: `npm --prefix apps/web run dev`

## Tests
- Unit & integration: `npm --prefix packages/server test`
- SFU capture test (requires ffmpeg): `npm --prefix packages/server run test:sfu:capture`
- Persistence test: `npm --prefix packages/server run test:persist`

## OpenAI realtime
- Ensure `OPENAI_API_KEY` is set. The realtime adapter uses a WebSocket to forward audio chunks.
- For production, replace the adapter with the official OpenAI SDK and verify message formats.

## Monitoring & Logs
- Server logs to stdout. For production, collect logs and metrics via Prometheus/Grafana and centralized logging.

## Troubleshooting
- If ffmpeg fails, ensure `ffmpeg` is installed and available in PATH or use the `ffmpeg-static` binary included.
- If PlainTransport create fails on certain mediasoup versions, check router compatibility and `rtpCapabilities`.

