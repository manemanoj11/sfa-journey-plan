const express = require('express');
const JourneyPlan = require('../models/JourneyPlan');
const Visit = require('../models/Visit');
const Customer = require('../models/Customer');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Helper: auto-mark missed visits for plans where delivery window has passed
async function markMissedVisits(userId) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  // 1. Mark all pending visits for PAST plan dates as missed
  const pastPlans = await JourneyPlan.find({
    assignedTo: userId,
    planDate: { $lt: todayStart },
    status: 'active'
  }).lean();

  if (pastPlans.length > 0) {
    const pastPlanIds = pastPlans.map(p => p._id);
    await Visit.updateMany(
      { journeyPlanId: { $in: pastPlanIds }, userId, visitStatus: 'pending' },
      { $set: { visitStatus: 'missed' } }
    );
  }

  // 2. For today's plans with deliveryTimeEnd, mark pending visits as missed if end time has passed
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const todayPlans = await JourneyPlan.find({
    assignedTo: userId,
    planDate: { $gte: todayStart, $lte: todayEnd },
    status: 'active',
    deliveryTimeEnd: { $exists: true, $ne: '' }
  }).lean();

  for (const plan of todayPlans) {
    const [endH, endM] = plan.deliveryTimeEnd.split(':').map(Number);
    const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM, 0);
    if (now > endTime) {
      await Visit.updateMany(
        { journeyPlanId: plan._id, userId, visitStatus: 'pending' },
        { $set: { visitStatus: 'missed' } }
      );
    }
  }

  // 3. For weekly/monthly plans, mark pending visits as missed if today is not a delivery day
  const todayPlansWithFreq = await JourneyPlan.find({
    assignedTo: userId,
    planDate: { $gte: todayStart, $lte: todayEnd },
    status: 'active',
    deliveryFrequency: { $in: ['weekly', 'monthly'] }
  }).lean();

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDayName = dayNames[now.getDay()];
  const todayDate = String(now.getDate());

  for (const plan of todayPlansWithFreq) {
    if (plan.deliveryDays && plan.deliveryDays.length > 0) {
      let isTodayDeliveryDay = false;
      if (plan.deliveryFrequency === 'weekly') {
        isTodayDeliveryDay = plan.deliveryDays.includes(todayDayName);
      } else if (plan.deliveryFrequency === 'monthly') {
        isTodayDeliveryDay = plan.deliveryDays.includes(todayDate);
      }
      if (!isTodayDeliveryDay) {
        await Visit.updateMany(
          { journeyPlanId: plan._id, userId, visitStatus: 'pending' },
          { $set: { visitStatus: 'missed' } }
        );
      }
    }
  }
}

// GET /api/mobile/today-journey-plan
router.get('/today-journey-plan', auth, async (req, res) => {
  try {
    // Auto-mark missed visits before fetching
    await markMissedVisits(req.user._id);

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const plans = await JourneyPlan.find({
      assignedTo: req.user._id,
      planDate: { $gte: start, $lte: end },
      status: 'active'
    })
      .populate('customers', 'customerName customerCode address contactNumber route location')
      .populate('createdBy', 'name')
      .lean();

    // Attach visit details for each plan
    const plansWithVisits = await Promise.all(plans.map(async (plan) => {
      const visits = await Visit.find({ journeyPlanId: plan._id, userId: req.user._id })
        .populate('customerId', 'customerName customerCode address contactNumber route location')
        .lean();
      const completed = visits.filter(v => v.visitStatus === 'completed').length;
      const missed = visits.filter(v => v.visitStatus === 'missed').length;
      const pending = visits.filter(v => v.visitStatus === 'pending').length;
      return {
        ...plan,
        visits,
        visitStats: { total: visits.length, completed, pending, missed }
      };
    }));

    res.json(plansWithVisits);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/mobile/customer-details/:id
router.get('/customer-details/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Get visit history for this customer by this user
    const visits = await Visit.find({
      customerId: req.params.id,
      userId: req.user._id
    }).sort({ createdAt: -1 }).limit(10).lean();

    res.json({ customer, visitHistory: visits });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/mobile/complete-visit
router.post('/complete-visit', auth, async (req, res) => {
  try {
    const { visitId } = req.body;
    if (!visitId) return res.status(400).json({ message: 'visitId is required' });

    const visit = await Visit.findById(visitId);
    if (!visit) return res.status(404).json({ message: 'Visit not found' });

    if (visit.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (visit.visitStatus === 'completed') {
      return res.status(400).json({ message: 'Visit already completed' });
    }

    if (visit.visitStatus === 'missed') {
      return res.status(400).json({ message: 'Visit was missed and cannot be completed' });
    }

    visit.visitStatus = 'completed';
    visit.visitTime = new Date();
    await visit.save();

    const populated = await Visit.findById(visit._id)
      .populate('customerId', 'customerName customerCode address contactNumber route location');

    res.json({ message: 'Visit completed successfully', visit: populated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/mobile/add-visit-notes
router.post('/add-visit-notes', auth, async (req, res) => {
  try {
    const { visitId, visitNotes } = req.body;
    if (!visitId || visitNotes === undefined) {
      return res.status(400).json({ message: 'visitId and visitNotes are required' });
    }

    const visit = await Visit.findById(visitId);
    if (!visit) return res.status(404).json({ message: 'Visit not found' });

    if (visit.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    visit.visitNotes = visitNotes;
    await visit.save();

    const populated = await Visit.findById(visit._id)
      .populate('customerId', 'customerName customerCode address contactNumber route location');

    res.json({ message: 'Notes added successfully', visit: populated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/mobile/record-order
router.post('/record-order', auth, async (req, res) => {
  try {
    const { visitId, salesOrderAmount } = req.body;
    if (!visitId || salesOrderAmount === undefined) {
      return res.status(400).json({ message: 'visitId and salesOrderAmount are required' });
    }

    if (typeof salesOrderAmount !== 'number' || salesOrderAmount < 0) {
      return res.status(400).json({ message: 'salesOrderAmount must be a non-negative number' });
    }

    const visit = await Visit.findById(visitId);
    if (!visit) return res.status(404).json({ message: 'Visit not found' });

    if (visit.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    visit.salesOrderAmount = salesOrderAmount;
    await visit.save();

    const populated = await Visit.findById(visit._id)
      .populate('customerId', 'customerName customerCode address contactNumber route location');

    res.json({ message: 'Order recorded successfully', visit: populated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
