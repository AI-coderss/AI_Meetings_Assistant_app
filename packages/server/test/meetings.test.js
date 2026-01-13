const request = require('supertest')

describe('meetings API', () => {
  test('create and list meeting', async () => {
    const res = await request('http://localhost:4000').post('/meetings').send({ title: 'Test', date: '2026-01-20', time: '12:00' })
    expect(res.statusCode).toBe(200)
    expect(res.body.ok).toBe(true)
    const list = await request('http://localhost:4000').get('/meetings')
    expect(list.statusCode).toBe(200)
    expect(Array.isArray(list.body.meetings)).toBe(true)
  })
})
