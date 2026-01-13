import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'

const client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })

export async function uploadTranscriptToS3(bucket: string, key: string, body: Buffer) {
  const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'application/json' })
  await client.send(cmd)
  return `s3://${bucket}/${key}`
}

export function saveTranscriptLocally(roomId: string, data: any) {
  const dir = path.join(process.cwd(), 'data', 'transcripts')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${roomId}-${Date.now()}.json`)
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
  return file
}
