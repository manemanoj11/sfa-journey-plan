const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  journeyPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'JourneyPlan', required: true },
  visitStatus: { type: String, enum: ['pending', 'completed', 'missed'], default: 'pending' },
  visitNotes: { type: String, trim: true, default: '' },
  salesOrderAmount: { type: Number, default: 0 },
  visitTime: { type: Date }
}, { timestamps: true });

visitSchema.index({ journeyPlanId: 1 });
visitSchema.index({ userId: 1 });
visitSchema.index({ customerId: 1 });

module.exports = mongoose.model('Visit', visitSchema);
