const express = require('express');
const Route = require('../models/Route');
const Customer = require('../models/Customer');
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/routes - List all routes
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.company) filter.company = req.query.company;

    const routes = await Route.find(filter)
      .populate('primaryEmployee', 'name username')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ routes });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/routes/config - Get companies, warehouses, vehicles for dropdowns
router.get('/config', auth, async (req, res) => {
  try {
    const companies = [
      { id: 'hul', name: 'Hindustan Unilever', warehouses: ['WH-HUL-01', 'WH-HUL-02', 'WH-HUL-03'], vehicles: ['VH-001', 'VH-002', 'VH-003'] },
      { id: 'itc', name: 'ITC Limited', warehouses: ['WH-ITC-01', 'WH-ITC-02'], vehicles: ['VH-004', 'VH-005', 'VH-006'] },
      { id: 'nestle', name: 'Nestle India', warehouses: ['WH-NES-01', 'WH-NES-02'], vehicles: ['VH-007', 'VH-008'] },
      { id: 'pg', name: 'Procter & Gamble', warehouses: ['WH-PG-01', 'WH-PG-02'], vehicles: ['VH-009', 'VH-010'] },
      { id: 'britannia', name: 'Britannia Industries', warehouses: ['WH-BRI-01', 'WH-BRI-02'], vehicles: ['VH-011', 'VH-012'] },
      { id: 'dabur', name: 'Dabur India', warehouses: ['WH-DAB-01', 'WH-DAB-02'], vehicles: ['VH-013', 'VH-014'] },
      { id: 'marico', name: 'Marico Limited', warehouses: ['WH-MAR-01'], vehicles: ['VH-015', 'VH-016'] },
      { id: 'godrej', name: 'Godrej Consumer Products', warehouses: ['WH-GOD-01', 'WH-GOD-02'], vehicles: ['VH-017', 'VH-018'] },
      { id: 'colgate', name: 'Colgate-Palmolive', warehouses: ['WH-COL-01'], vehicles: ['VH-019', 'VH-020'] },
      { id: 'parle', name: 'Parle Products', warehouses: ['WH-PAR-01', 'WH-PAR-02'], vehicles: ['VH-021', 'VH-022'] },
      { id: 'amul', name: 'Amul (GCMMF)', warehouses: ['WH-AMU-01', 'WH-AMU-02', 'WH-AMU-03'], vehicles: ['VH-023', 'VH-024'] },
      { id: 'emami', name: 'Emami Limited', warehouses: ['WH-EMA-01'], vehicles: ['VH-025', 'VH-026'] },
      { id: 'pepsi', name: 'PepsiCo India', warehouses: ['WH-PEP-01', 'WH-PEP-02'], vehicles: ['VH-027', 'VH-028'] },
      { id: 'coca', name: 'Coca-Cola India', warehouses: ['WH-COC-01', 'WH-COC-02'], vehicles: ['VH-029', 'VH-030'] },
      { id: 'mondelez', name: 'Mondelez India', warehouses: ['WH-MON-01'], vehicles: ['VH-031', 'VH-032'] }
    ];
    const roles = ['Sales Executive', 'Merchandiser', 'Delivery Driver', 'Supervisor'];
    const customerRoutes = await Customer.distinct('route');
    const savedRoutes = await Route.find({}, 'routeName').lean();
    const savedRouteNames = savedRoutes.map(r => r.routeName);
    const routeNames = [...new Set([...savedRouteNames, ...customerRoutes.filter(Boolean)])];
    res.json({ companies, roles, routeNames });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/routes - Create a new route
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { routeName, routeCode, status, validFrom, validTo, company, warehouse, vehicle, role, primaryEmployee } = req.body;

    if (!routeName || !routeCode || !validFrom || !validTo || !company || !role) {
      return res.status(400).json({ message: 'Required fields: routeName, routeCode, validFrom, validTo, company, role' });
    }

    const existing = await Route.findOne({ routeCode });
    if (existing) {
      return res.status(400).json({ message: 'Route code already exists' });
    }

    const route = await Route.create({
      routeName, routeCode, status: status || 'active',
      validFrom, validTo, company, warehouse, vehicle,
      role, primaryEmployee: primaryEmployee || undefined,
      createdBy: req.user._id
    });

    const populated = await Route.findById(route._id)
      .populate('primaryEmployee', 'name username')
      .populate('createdBy', 'name');

    res.status(201).json({ message: 'Route created successfully', route: populated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/routes/:id - Get single route
router.get('/:id', auth, async (req, res) => {
  try {
    const route = await Route.findById(req.params.id)
      .populate('primaryEmployee', 'name username')
      .populate('createdBy', 'name');
    if (!route) return res.status(404).json({ message: 'Route not found' });
    res.json({ route });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/routes/:id - Update route
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const route = await Route.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('primaryEmployee', 'name username')
      .populate('createdBy', 'name');
    if (!route) return res.status(404).json({ message: 'Route not found' });
    res.json({ message: 'Route updated', route });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
