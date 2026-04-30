const express = require('express')
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
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Origin': 'https://saweria.co',
      'Referer': 'https://saweria.co/',
    }

    if (saweriaToken) {
      headers['Authorization'] = `Bearer ${saweriaToken}`
    }

    const fetchOptions = {
      method: req.method,
      headers,
    }

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body)
    }

    const response = await fetch(saweriaUrl, fetchOptions)
    const data = await response.text()

    // Forward status and headers
    res.status(response.status)
    res.set('Content-Type', response.headers.get('content-type') || 'application/json')
    res.send(data)
  } catch (err) {
    console.error('[proxy] Error:', err.message)
    res.status(502).json({ error: 'Proxy error', message: err.message })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`saweria-proxy running on port ${PORT}`)
})
