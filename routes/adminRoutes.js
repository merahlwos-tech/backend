// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { authenticateAdmin } = require('../middleware/auth');

// GET statistiques
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    // Commandes livrées
    const deliveredOrders = await Order.find({ status: 'livré' });
    
    // Commandes retournées
    const returnedOrders = await Order.find({ status: 'retour' });
    
    // Calcul des gains (commandes livrées uniquement)
    const totalRevenue = deliveredOrders.reduce((sum, order) => sum + order.total, 0);
    
    // Nombre de produits livrés
    const productsDelivered = deliveredOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
    
    // Nombre de retours
    const returnsCount = returnedOrders.length;

    res.json({
      totalRevenue,
      productsDelivered,
      returnsCount,
      deliveredOrdersCount: deliveredOrders.length,
      totalOrders: await Order.countDocuments()
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST reset des statistiques (optionnel - supprime toutes les commandes livrées/retournées)
router.post('/stats/reset', authenticateAdmin, async (req, res) => {
  try {
    const result = await Order.deleteMany({ 
      status: { $in: ['livré', 'retour'] } 
    });
    
    res.json({ 
      message: 'Statistiques réinitialisées', 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
