const fetch = require('node-fetch')

async function run() {
  // post a mock transcript to summarize endpoint
  const res = await fetch('http://localhost:4000/rooms/test-room/summarize', { method: 'POST' })
  const json = await res.json()
  console.log('summarize result:', json)
  process.exit(0)
}

run()
