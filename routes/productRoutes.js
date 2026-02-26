// routes/productRoutes.js
const express = require('express')
const router = express.Router()
const Product = require('../models/Product')
const { DeleteObjectCommand } = require('@aws-sdk/client-s3')
const r2Client = require('../config/r2')
const { authenticateAdmin } = require('../middleware/auth')

// Extrait la clé R2 depuis une URL publique
// Ex: https://pub-xxx.r2.dev/lamode28/uuid.webp → lamode28/uuid.webp
function getR2Key(url) {
  try {
    const publicUrl = process.env.R2_PUBLIC_URL
    if (url.startsWith(publicUrl)) {
      return url.slice(publicUrl.length + 1) // +1 pour le "/"
    }
    // fallback : prendre tout ce qui suit le domaine
    const parsed = new URL(url)
    return parsed.pathname.replace(/^\//, '')
  } catch {
    return null
  }
}

// GET tous les produits (public)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query
    const filter = category ? { category } : {}
    const products = await Product.find(filter).sort({ createdAt: -1 })
    res.json(products)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// GET un produit par ID (public)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Produit non trouvé' })
    res.json(product)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST créer un produit (admin uniquement)
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const product = new Product(req.body)
    const newProduct = await product.save()
    res.status(201).json(newProduct)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// PUT modifier un produit (admin uniquement)
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!product) return res.status(404).json({ message: 'Produit non trouvé' })
    res.json(product)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// DELETE supprimer un produit + ses images Cloudinary (admin uniquement)
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Produit non trouvé' })

    // Supprimer les images R2
    if (product.images && product.images.length > 0) {
      const deletePromises = product.images.map((url) => {
        const key = getR2Key(url)
        if (key) {
          return r2Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: key,
            })
          )
        }
        return Promise.resolve()
      })
      await Promise.all(deletePromises)
    }

    await Product.findByIdAndDelete(req.params.id)
    res.json({ message: 'Produit et images supprimés' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router