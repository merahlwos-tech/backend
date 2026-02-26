const mongoose = require('mongoose')

const productSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    brand:    { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['Skincare', 'Makeup', 'Body Care', 'Hair Care', 'Accessoires'],
    },
    price:         { type: Number, required: true, min: 0 },
    stock:         { type: Number, required: true, min: 0, default: 0 },
    purchaseCount: { type: Number, default: 0, min: 0 },
    description: {
      fr: { type: String, default: '' },
      ar: { type: String, default: '' },
      en: { type: String, default: '' },
    },
    images:        [{ type: String }],
    sizes: [
      {
        size:  { type: String, required: true },
        stock: { type: Number, required: true, min: 0, default: 0 },
      },
    ],
    tags: [{ type: String }],
  },
  { timestamps: true }
)

module.exports = mongoose.model('Product', productSchema)