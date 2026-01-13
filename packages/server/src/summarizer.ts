import fetch from 'node-fetch'

export async function summarize(transcript: string) {
  // If OPENAI key is present, call chat completions to summarize; otherwise return a mock summary
  if (!process.env.OPENAI_API_KEY) {
    return { summary: `Mock summary (no API key). Transcript length: ${transcript.length}` }
  }

  // Basic wrapper using Chat Completions (replace with official SDK as desired)
  const prompt = `Summarize the following meeting transcript into: key points, action items, and decisions.\n\n${transcript}`
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 512 })
  })
  const json = await res.json()
  const summary = json?.choices?.[0]?.message?.content || 'No summary generated'
  return { summary }
}
