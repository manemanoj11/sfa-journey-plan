const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  routeName: { type: String, required: true, trim: true },
  routeCode: { type: String, required: true, unique: true, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  validFrom: { type: Date, required: true },
  validTo: { type: Date, required: true },
  company: { type: String, required: true, trim: true },
  warehouse: { type: String, trim: true },
  vehicle: { type: String, trim: true },
  role: { type: String, required: true, trim: true },
  primaryEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

routeSchema.index({ routeCode: 1 });
routeSchema.index({ company: 1 });

module.exports = mongoose.model('Route', routeSchema);
