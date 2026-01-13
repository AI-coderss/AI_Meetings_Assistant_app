const http = require('http')

function checkHealth() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:4000/health', res => {
      if (res.statusCode === 200) resolve(true)
      else reject(new Error('health check failed: ' + res.statusCode))
    }).on('error', reject)
  })
}

async function run() {
  try {
    await checkHealth()
    console.log('health OK')
    process.exit(0)
  } catch (err) {
    console.error('smoke test failed', err)
    process.exit(1)
  }
}

run()
