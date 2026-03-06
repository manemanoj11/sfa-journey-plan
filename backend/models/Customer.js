const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerName: { type: String, required: true, trim: true },
  customerCode: { type: String, required: true, unique: true, trim: true },
  address: { type: String, trim: true },
  contactNumber: { type: String, trim: true },
  route: { type: String, trim: true },
  location: { type: String, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

customerSchema.index({ route: 1 });
customerSchema.index({ customerName: 'text', customerCode: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
