const express = require('express')
const router = express.Router()
const https = require('https')

const GUEPEX_API_ID    = process.env.GUEPEX_API_ID
const GUEPEX_API_TOKEN = process.env.GUEPEX_API_TOKEN
const FROM_WILAYA_ID   = process.env.FROM_WILAYA_ID || '16' // Ta wilaya d'expédition (ex: 16 = Alger)

function guepexGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.guepex.app',
      path: `/v1${path}`,
      method: 'GET',
      headers: {
        'X-API-ID': GUEPEX_API_ID,
        'X-API-TOKEN': GUEPEX_API_TOKEN,
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { reject(new Error('Invalid JSON from Guepex')) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

// GET /api/delivery/wilayas — liste des wilayas Guepex avec leurs IDs
router.get('/wilayas', async (req, res) => {
  try {
    const data = await guepexGet('/wilayas/?page_size=100')
    res.json(data.data || [])
  } catch (err) {
    res.status(500).json({ message: 'Erreur Guepex', error: err.message })
  }
})

// GET /api/delivery/communes/:wilayaId — communes d'une wilaya
router.get('/communes/:wilayaId', async (req, res) => {
  try {
    const data = await guepexGet(`/communes/?wilaya_id=${req.params.wilayaId}&page_size=1000`)
    res.json(data.data || [])
  } catch (err) {
    res.status(500).json({ message: 'Erreur Guepex', error: err.message })
  }
})

// GET /api/delivery/fees/:toWilayaId — frais de livraison vers une wilaya
router.get('/fees/:toWilayaId', async (req, res) => {
  try {
    const data = await guepexGet(`/fees/?from_wilaya_id=${FROM_WILAYA_ID}&to_wilaya_id=${req.params.toWilayaId}`)
    res.json(data)
  } catch (err) {
    res.status(500).json({ message: 'Erreur Guepex', error: err.message })
  }
})

module.exports = router