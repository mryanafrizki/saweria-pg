const express = require('express')
const { execFile } = require('child_process')
const app = express()
const PORT = process.env.PORT || 3001
const PROXY_SECRET = process.env.PROXY_SECRET || ''

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'saweria-proxy' })
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

/**
 * Proxy via curl — bypasses TLS fingerprint detection.
 * Node.js fetch() gets 403 from Saweria due to TLS fingerprinting.
 * curl uses OpenSSL which has a browser-like TLS fingerprint.
 */
function curlRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const args = [
      '-s', '-S',                    // silent but show errors
      '-w', '\n%{http_code}',        // append status code
      '-X', method,
      '--max-time', '30',
      '--connect-timeout', '10',
    ]

    // Add headers
    for (const [key, value] of Object.entries(headers)) {
      args.push('-H', `${key}: ${value}`)
    }

    // Add body for POST/PUT/PATCH
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      args.push('-d', typeof body === 'string' ? body : JSON.stringify(body))
    }

    args.push(url)

    execFile('curl', args, { maxBuffer: 10 * 1024 * 1024, timeout: 35000 }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`curl failed: ${stderr || err.message}`))
      }

      // Split response body and status code
      const lines = stdout.split('\n')
      const statusCode = parseInt(lines.pop(), 10) || 0
      const responseBody = lines.join('\n')

      resolve({ statusCode, body: responseBody })
    })
  })
}

// Proxy all other requests to Saweria API
app.all('/*', async (req, res) => {
  // Verify proxy secret
  const secret = req.headers['x-proxy-secret']
  if (PROXY_SECRET && secret !== PROXY_SECRET) {
    return res.status(403).json({ error: 'Invalid proxy secret' })
  }

  const saweriaToken = req.headers['x-saweria-token']
  const path = req.originalUrl

  try {
    const saweriaUrl = `https://backend.saweria.co${path}`
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://saweria.co',
      'Referer': 'https://saweria.co/',
    }

    if (saweriaToken) {
      headers['Authorization'] = `Bearer ${saweriaToken}`
    }

    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) && req.body
      ? JSON.stringify(req.body)
      : null

    const result = await curlRequest(req.method, saweriaUrl, headers, body)

    res.status(result.statusCode)
    res.set('Content-Type', 'application/json')
    res.send(result.body)
  } catch (err) {
    console.error('[proxy] Error:', err.message)
    res.status(502).json({ error: 'Proxy error' })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`saweria-proxy running on port ${PORT} (curl mode)`)
})
