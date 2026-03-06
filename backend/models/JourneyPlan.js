const mongoose = require('mongoose');

const journeyPlanSchema = new mongoose.Schema({
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  planDate: { type: Date, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }],
  deliveryFrequency: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  deliveryDays: [{ type: String }],
  deliveryTimeStart: { type: String },
  deliveryTimeEnd: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'inactive' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

journeyPlanSchema.index({ assignedTo: 1, planDate: 1 });
journeyPlanSchema.index({ planDate: 1 });
journeyPlanSchema.index({ status: 1 });

module.exports = mongoose.model('JourneyPlan', journeyPlanSchema);
