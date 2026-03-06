require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Customer = require('../models/Customer');
const JourneyPlan = require('../models/JourneyPlan');
const Visit = require('../models/Visit');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({});
  await Customer.deleteMany({});
  await JourneyPlan.deleteMany({});
  await Visit.deleteMany({});

  // Create users
  const admin = await User.create({
    name: 'Admin User',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    mobileNumber: '+971501000001'
  });

  const vanUser1 = await User.create({
    name: 'Rajesh Kumar',
    username: 'rajesh',
    password: 'vansales123',
    role: 'vansales',
    mobileNumber: '+971501000002'
  });

  const vanUser2 = await User.create({
    name: 'Amit Sharma',
    username: 'amit',
    password: 'vansales123',
    role: 'vansales',
    mobileNumber: '+971501000003'
  });

  const vanUser3 = await User.create({
    name: 'Priya Patel',
    username: 'priya',
    password: 'vansales123',
    role: 'vansales',
    mobileNumber: '+971501000004'
  });

  // Create 10 customers
  const customers = await Customer.insertMany([
    {
      customerName: 'Al Madina Grocery',
      customerCode: 'CUST001',
      address: '123 Main St, Downtown Dubai',
      contactNumber: '+971501234567',
      route: 'Route A - Downtown',
      location: 'Downtown Dubai'
    },
    {
      customerName: 'City Supermarket',
      customerCode: 'CUST002',
      address: '456 Market Ave, Business Bay',
      contactNumber: '+971501234568',
      route: 'Route A - Downtown',
      location: 'Business Bay'
    },
    {
      customerName: 'Fresh Foods Store',
      customerCode: 'CUST003',
      address: '789 Park Rd, Jumeirah',
      contactNumber: '+971501234569',
      route: 'Route B - Coastal',
      location: 'Jumeirah'
    },
    {
      customerName: 'Quick Mart',
      customerCode: 'CUST004',
      address: '321 Lake View, Dubai Marina',
      contactNumber: '+971501234570',
      route: 'Route B - Coastal',
      location: 'Dubai Marina'
    },
    {
      customerName: 'Family Store',
      customerCode: 'CUST005',
      address: '654 Palm St, Deira',
      contactNumber: '+971501234571',
      route: 'Route C - Deira',
      location: 'Deira'
    },
    {
      customerName: 'Express Mini Mart',
      customerCode: 'CUST006',
      address: '111 Creek Rd, Bur Dubai',
      contactNumber: '+971501234572',
      route: 'Route C - Deira',
      location: 'Bur Dubai'
    },
    {
      customerName: 'Royal Supermarket',
      customerCode: 'CUST007',
      address: '222 Sheikh Zayed Rd, Al Barsha',
      contactNumber: '+971501234573',
      route: 'Route D - West',
      location: 'Al Barsha'
    },
    {
      customerName: 'Corner Shop',
      customerCode: 'CUST008',
      address: '333 Al Wasl Rd, Al Safa',
      contactNumber: '+971501234574',
      route: 'Route D - West',
      location: 'Al Safa'
    },
    {
      customerName: 'Golden Grocery',
      customerCode: 'CUST009',
      address: '444 Hessa St, Al Quoz',
      contactNumber: '+971501234575',
      route: 'Route E - Industrial',
      location: 'Al Quoz'
    },
    {
      customerName: 'Star Provisions',
      customerCode: 'CUST010',
      address: '555 Emirates Rd, Silicon Oasis',
      contactNumber: '+971501234576',
      route: 'Route E - Industrial',
      location: 'Dubai Silicon Oasis'
    }
  ]);

  // Create journey plan for today with 5 customers
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const plan1 = await JourneyPlan.create({
    planDate: today,
    assignedTo: vanUser1._id,
    customers: [customers[0]._id, customers[1]._id, customers[2]._id, customers[3]._id, customers[4]._id],
    status: 'active',
    deliveryFrequency: 'daily',
    createdBy: admin._id
  });

  // Create visits for plan1
  await Visit.insertMany([
    { customerId: customers[0]._id, userId: vanUser1._id, journeyPlanId: plan1._id, visitStatus: 'pending' },
    { customerId: customers[1]._id, userId: vanUser1._id, journeyPlanId: plan1._id, visitStatus: 'pending' },
    { customerId: customers[2]._id, userId: vanUser1._id, journeyPlanId: plan1._id, visitStatus: 'pending' },
    { customerId: customers[3]._id, userId: vanUser1._id, journeyPlanId: plan1._id, visitStatus: 'pending' },
    { customerId: customers[4]._id, userId: vanUser1._id, journeyPlanId: plan1._id, visitStatus: 'pending' }
  ]);

  // Create second plan for today (vanUser2)
  const plan2 = await JourneyPlan.create({
    planDate: today,
    assignedTo: vanUser2._id,
    customers: [customers[5]._id, customers[6]._id, customers[7]._id, customers[8]._id, customers[9]._id],
    status: 'active',
    deliveryFrequency: 'weekly',
    deliveryDays: ['Mon', 'Wed', 'Fri'],
    createdBy: admin._id
  });

  await Visit.insertMany([
    { customerId: customers[5]._id, userId: vanUser2._id, journeyPlanId: plan2._id, visitStatus: 'pending' },
    { customerId: customers[6]._id, userId: vanUser2._id, journeyPlanId: plan2._id, visitStatus: 'pending' },
    { customerId: customers[7]._id, userId: vanUser2._id, journeyPlanId: plan2._id, visitStatus: 'pending' },
    { customerId: customers[8]._id, userId: vanUser2._id, journeyPlanId: plan2._id, visitStatus: 'pending' },
    { customerId: customers[9]._id, userId: vanUser2._id, journeyPlanId: plan2._id, visitStatus: 'pending' }
  ]);

  // Create a future plan (should NOT appear in today's view)
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const plan3 = await JourneyPlan.create({
    planDate: tomorrow,
    assignedTo: vanUser1._id,
    customers: [customers[6]._id, customers[7]._id, customers[8]._id],
    status: 'inactive',
    deliveryFrequency: 'daily',
    createdBy: admin._id
  });

  await Visit.insertMany([
    { customerId: customers[6]._id, userId: vanUser1._id, journeyPlanId: plan3._id, visitStatus: 'pending' },
    { customerId: customers[7]._id, userId: vanUser1._id, journeyPlanId: plan3._id, visitStatus: 'pending' },
    { customerId: customers[8]._id, userId: vanUser1._id, journeyPlanId: plan3._id, visitStatus: 'pending' }
  ]);

  // Create an empty plan (no customers) for testing TS-006
  await JourneyPlan.create({
    planDate: today,
    assignedTo: vanUser1._id,
    customers: [],
    status: 'inactive',
    deliveryFrequency: 'daily',
    createdBy: admin._id
  });

  console.log('Seed data created successfully!');
  console.log('\nLogin Credentials:');
  console.log('  Admin:         admin / admin123');
  console.log('  Rajesh Kumar:  rajesh / vansales123');
  console.log('  Amit Sharma:   amit / vansales123');
  console.log('  Priya Patel:   priya / vansales123');

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
