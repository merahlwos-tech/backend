// routes/uploadRoutes.js
const express = require('express')
const router = express.Router()
const multer = require('multer')
const sharp = require('sharp')
const { PutObjectCommand } = require('@aws-sdk/client-s3')
const r2Client = require('../config/r2')
const { v4: uuidv4 } = require('uuid')
const { authenticateAdmin } = require('../middleware/auth')

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Seules les images sont autorisées'), false)
  },
})

router.post('/', authenticateAdmin, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Aucune image fournie' })
    }

    const uploadPromises = req.files.map(async (file) => {
      // Optimisation avec Sharp : redimensionner + convertir en WebP
      const optimizedBuffer = await sharp(file.buffer)
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()

      const key = `lamode28/${uuidv4()}.webp`

      await r2Client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
          Body: optimizedBuffer,
          ContentType: 'image/webp',
        })
      )

      return `${process.env.R2_PUBLIC_URL}/${key}`
    })

    const imageUrls = await Promise.all(uploadPromises)
    res.json({ message: 'Images uploadées avec succès', urls: imageUrls })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router