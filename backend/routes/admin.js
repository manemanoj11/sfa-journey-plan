const express = require('express');
const JourneyPlan = require('../models/JourneyPlan');
const Visit = require('../models/Visit');
const Customer = require('../models/Customer');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// POST /api/admin/create-journey-plan
router.post('/create-journey-plan', auth, adminOnly, async (req, res) => {
  try {
    const { planDate, assignedTo, route, customers, deliveryFrequency, deliveryDays, deliveryTimeStart, deliveryTimeEnd } = req.body;

    if (!planDate || !assignedTo || !deliveryFrequency) {
      return res.status(400).json({ message: 'planDate, assignedTo and deliveryFrequency are required' });
    }

    // Check if a plan already exists for the same user on the same date
    const dayStart = new Date(planDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(planDate);
    dayEnd.setHours(23, 59, 59, 999);

    const existingPlan = await JourneyPlan.findOne({
      assignedTo,
      planDate: { $gte: dayStart, $lte: dayEnd }
    });

    let plan;
    let isAppended = false;

    if (existingPlan) {
      // Append new customers to the existing plan (avoid duplicates)
      const existingIds = existingPlan.customers.map(c => c.toString());
      const newCustomerIds = (customers || []).filter(id => !existingIds.includes(id));

      if (newCustomerIds.length > 0) {
        existingPlan.customers.push(...newCustomerIds);
        await existingPlan.save();

        // Create visit records only for new customers
        const visits = newCustomerIds.map(customerId => ({
          customerId,
          userId: assignedTo,
          journeyPlanId: existingPlan._id,
          visitStatus: 'pending'
        }));
        await Visit.insertMany(visits);
      }

      // Update schedule fields if provided
      existingPlan.deliveryFrequency = deliveryFrequency;
      existingPlan.deliveryDays = deliveryDays || existingPlan.deliveryDays;
      existingPlan.deliveryTimeStart = deliveryTimeStart || existingPlan.deliveryTimeStart;
      existingPlan.deliveryTimeEnd = deliveryTimeEnd || existingPlan.deliveryTimeEnd;
      if (route) existingPlan.route = route;
      await existingPlan.save();

      plan = existingPlan;
      isAppended = true;
    } else {
      // Create a new plan for a different date
      plan = await JourneyPlan.create({
        planDate,
        assignedTo,
        route: route || undefined,
        customers: customers || [],
        deliveryFrequency,
        deliveryDays: deliveryDays || [],
        deliveryTimeStart: deliveryTimeStart || '',
        deliveryTimeEnd: deliveryTimeEnd || '',
        status: 'active',
        createdBy: req.user._id
      });

      // Create visit records for each customer
      if (customers && customers.length > 0) {
        const visits = customers.map(customerId => ({
          customerId,
          userId: assignedTo,
          journeyPlanId: plan._id,
          visitStatus: 'pending'
        }));
        await Visit.insertMany(visits);
      }
    }

    const populated = await JourneyPlan.findById(plan._id)
      .populate('assignedTo', 'name username mobileNumber')
      .populate('customers', 'customerName customerCode address contactNumber route location')
      .populate('createdBy', 'name');

    const msg = isAppended
      ? 'Customers added to existing plan for this date'
      : 'Journey plan created successfully';

    res.status(isAppended ? 200 : 201).json({ message: msg, plan: populated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/admin/add-customers-to-plan
router.post('/add-customers-to-plan', auth, adminOnly, async (req, res) => {
  try {
    const { journeyPlanId, customerIds } = req.body;

    if (!journeyPlanId || !customerIds || !customerIds.length) {
      return res.status(400).json({ message: 'journeyPlanId and customerIds are required' });
    }

    const plan = await JourneyPlan.findById(journeyPlanId);
    if (!plan) return res.status(404).json({ message: 'Journey plan not found' });

    // Add new customers (avoid duplicates)
    const existingIds = plan.customers.map(c => c.toString());
    const newCustomerIds = customerIds.filter(id => !existingIds.includes(id));

    if (newCustomerIds.length === 0) {
      return res.status(400).json({ message: 'All customers already exist in the plan' });
    }

    plan.customers.push(...newCustomerIds);
    await plan.save();

    // Create visit records for new customers
    const visits = newCustomerIds.map(customerId => ({
      customerId,
      userId: plan.assignedTo,
      journeyPlanId: plan._id,
      visitStatus: 'pending'
    }));
    await Visit.insertMany(visits);

    const populated = await JourneyPlan.findById(plan._id)
      .populate('assignedTo', 'name username mobileNumber')
      .populate('customers', 'customerName customerCode address contactNumber route location')
      .populate('createdBy', 'name');

    res.json({ message: `${newCustomerIds.length} customer(s) added to plan`, plan: populated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/admin/assign-plan
router.post('/assign-plan', auth, adminOnly, async (req, res) => {
  try {
    const { journeyPlanId, assignedTo, status } = req.body;

    if (!journeyPlanId) {
      return res.status(400).json({ message: 'journeyPlanId is required' });
    }

    const plan = await JourneyPlan.findById(journeyPlanId);
    if (!plan) return res.status(404).json({ message: 'Journey plan not found' });

    if (assignedTo) {
      plan.assignedTo = assignedTo;
      // Update visits to reflect new user
      await Visit.updateMany(
        { journeyPlanId: plan._id },
        { userId: assignedTo }
      );
    }

    if (status) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ message: 'Status must be active or inactive' });
      }
      plan.status = status;
    }

    await plan.save();

    const populated = await JourneyPlan.findById(plan._id)
      .populate('assignedTo', 'name username mobileNumber')
      .populate('customers', 'customerName customerCode address contactNumber route location')
      .populate('createdBy', 'name');

    res.json({ message: 'Plan updated successfully', plan: populated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/admin/journey-plans
router.get('/journey-plans', auth, adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.date) {
      const day = new Date(req.query.date);
      filter.planDate = {
        $gte: new Date(day.setHours(0, 0, 0, 0)),
        $lte: new Date(day.setHours(23, 59, 59, 999))
      };
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [plans, total] = await Promise.all([
      JourneyPlan.find(filter)
        .populate('assignedTo', 'name username mobileNumber')
        .populate('customers', 'customerName customerCode address contactNumber route location')
        .populate('createdBy', 'name')
        .sort({ planDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      JourneyPlan.countDocuments(filter)
    ]);

    // Attach visit stats for each plan
    const plansWithVisits = await Promise.all(plans.map(async (plan) => {
      const visits = await Visit.find({ journeyPlanId: plan._id })
        .populate('customerId', 'customerName customerCode location')
        .lean();
      const completed = visits.filter(v => v.visitStatus === 'completed').length;
      const missed = visits.filter(v => v.visitStatus === 'missed').length;
      const pending = visits.filter(v => v.visitStatus === 'pending').length;
      return { ...plan, visits, visitStats: { total: visits.length, completed, pending, missed } };
    }));

    res.json({
      plans: plansWithVisits,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
