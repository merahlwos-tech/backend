const express = require('express')
const router = express.Router()
const Order = require('../models/Order')
const Product = require('../models/Product')
const { authenticateAdmin } = require('../middleware/auth')

// POST /api/orders — Créer une commande ET décrémenter le stock
router.post('/', async (req, res) => {
  try {
    const { customerInfo, items, total, deliveryFee, deliveryType, deliverySpeed } = req.body
    if (!customerInfo || !items || !total) {
      return res.status(400).json({ message: 'Données incomplètes' })
    }

    // Vérifier le stock disponible
    for (const item of items) {
      const product = await Product.findById(item.product)
      if (!product) {
        return res.status(404).json({ message: `Produit introuvable : ${item.name}` })
      }
      const available = product.stock ?? 0
      if (available < item.quantity) {
        return res.status(400).json({ message: `Stock insuffisant pour ${item.name}` })
      }
    }

    // Décrémenter le stock ET incrémenter purchaseCount
    for (const item of items) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: -item.quantity, purchaseCount: item.quantity } }
      )
    }

    // Créer la commande (sans size)
    const orderItems = items.map(item => ({
      product:  item.product,
      name:     item.name,
      quantity: item.quantity,
      price:    item.price,
    }))

    const order = new Order({ customerInfo, items: orderItems, total, deliveryFee: deliveryFee || 0, deliveryType: deliveryType || 'home', deliverySpeed: deliverySpeed || 'express', status: 'en attente' })
    await order.save()
    res.status(201).json(order)

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message })
  }
})

// GET /api/orders
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('items.product', 'name brand images')
      .sort({ createdAt: -1 })
    res.json(orders)
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message })
  }
})

// GET /api/orders/:id
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name brand images')
    if (!order) return res.status(404).json({ message: 'Commande introuvable' })
    res.json(order)
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message })
  }
})


// PATCH /api/orders/:id/cancel — Annulation publique (dans les 5 min après création)
router.patch('/:id/cancel', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Commande introuvable' })

    // Sécurité : annulation possible seulement si la commande date de moins de 5 minutes
    const age = Date.now() - new Date(order.createdAt).getTime()
    if (age > 5 * 60 * 1000) {
      return res.status(403).json({ message: 'Délai d\'annulation dépassé' })
    }

    if (order.status === 'annulé') {
      return res.status(400).json({ message: 'Commande déjà annulée' })
    }

    // Remettre le stock
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity, purchaseCount: -item.quantity } }
      )
    }

    order.status = 'annulé'
    await order.save()
    res.json({ message: 'Commande annulée', order })

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message })
  }
})

// PUT /api/orders/:id — Mise à jour statut + remise en stock si annulé
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body
    const validStatuses = ['en attente', 'confirmé', 'en livraison', 'livré', 'retour', 'annulé']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Statut invalide' })
    }

    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Commande introuvable' })

    // Remettre le stock si annulation
    if (status === 'annulé' && order.status !== 'annulé') {
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity, purchaseCount: -item.quantity } }
        )
      }
    }

    order.status = status
    await order.save()
    res.json(order)

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message })
  }
})


// DELETE /api/orders/:id/cancel — Suppression publique dans les 2 minutes après création
router.delete('/:id/cancel', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Commande introuvable' })

    const age = Date.now() - new Date(order.createdAt).getTime()
    if (age > 2 * 60 * 1000) {
      return res.status(403).json({ message: 'Délai d\'annulation dépassé' })
    }

    // Remettre le stock
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity, purchaseCount: -item.quantity } }
      )
    }

    await Order.findByIdAndDelete(req.params.id)
    res.json({ message: 'Commande supprimée' })
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message })
  }
})

// DELETE /api/orders/:id
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id)
    if (!order) return res.status(404).json({ message: 'Commande introuvable' })
    res.json({ message: 'Commande supprimée' })
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message })
  }
})

module.exports = router