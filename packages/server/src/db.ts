import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transcripts (
      id SERIAL PRIMARY KEY,
      room_id TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      segments JSONB NOT NULL
    );
  `)
}

export async function saveTranscriptToDb(roomId: string, segments: any[]) {
  await ensureSchema()
  const q = 'INSERT INTO transcripts (room_id, segments) VALUES ($1, $2) RETURNING id'
  const res = await pool.query(q, [roomId, JSON.stringify(segments)])
  return res.rows[0]
}

export async function getTranscripts(roomId: string) {
  await ensureSchema()
  const res = await pool.query('SELECT * FROM transcripts WHERE room_id = $1 ORDER BY created_at DESC', [roomId])
  return res.rows
}

export default pool
