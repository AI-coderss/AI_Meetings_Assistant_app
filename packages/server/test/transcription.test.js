const request = require('supertest')
const { spawn } = require('child_process')

// Basic integration: start server in background and hit /health
describe('server', () => {
  let serverProcess
  beforeAll((done) => {
    serverProcess = spawn('npm', ['run', 'dev'], { cwd: process.cwd(), env: process.env, stdio: 'inherit' })
    // wait for server
    setTimeout(done, 1200)
  }, 20000)

  afterAll(() => {
    if (serverProcess) serverProcess.kill('SIGINT')
  })

  test('health endpoint responds', async () => {
    const res = await request('http://localhost:4000').get('/health')
    expect(res.statusCode).toBe(200)
    expect(res.body.ok).toBe(true)
  })
}, 30000)
