const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
  customerInfo: {
    firstName: { type: String, required: true },
    lastName:  { type: String, required: true },
    phone:     { type: String, required: true },
    wilaya:    { type: String, required: true },
    commune:   { type: String, required: true },
  },
  items: [
    {
      product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name:     { type: String, required: true },
      quantity: { type: Number, required: true },
      price:    { type: Number, required: true },
    },
  ],
  total:       { type: Number, required: true },
  deliveryFee:  { type: Number, default: 0 },
  deliveryType:  { type: String, enum: ['home', 'desk'], default: 'home' },
  deliverySpeed: { type: String, enum: ['express', 'economic'], default: 'express' },
  status: {
    type: String,
    enum: ['en attente', 'confirmé', 'en livraison', 'livré', 'retour', 'annulé'],
    default: 'en attente',
  },
}, { timestamps: true })

module.exports = mongoose.model('Order', orderSchema)