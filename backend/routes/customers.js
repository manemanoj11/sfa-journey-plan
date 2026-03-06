const express = require('express');
const Customer = require('../models/Customer');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/customers
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.route) filter.route = req.query.route;
    if (req.query.search) {
      filter.$or = [
        { customerName: { $regex: req.query.search, $options: 'i' } },
        { customerCode: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ customerName: 1 }).skip(skip).limit(limit).lean(),
      Customer.countDocuments(filter)
    ]);

    res.json({ customers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/customers/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/customers (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Customer code already exists' });
    }
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
