# SFA Journey Plan - Complete Testing & Documentation

---

## 1. PROJECT FOLDER STRUCTURE

```
sfa-journey-plan/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── middleware/
│   │   └── auth.js                # JWT auth & role-based authorization
│   ├── models/
│   │   ├── User.js                # User schema (name, username, password, role, mobileNumber)
│   │   ├── Customer.js            # Customer schema (customerName, customerCode, address, contactNumber, route, location)
│   │   ├── JourneyPlan.js         # Journey Plan schema (planDate, assignedTo, customers[], status, createdBy)
│   │   └── Visit.js               # Visit schema (customerId, userId, journeyPlanId, visitStatus, visitNotes, salesOrderAmount, visitTime)
│   ├── routes/
│   │   ├── auth.js                # POST /api/auth/login, GET /api/auth/me
│   │   ├── admin.js               # Admin APIs (create-journey-plan, add-customers-to-plan, assign-plan, journey-plans)
│   │   ├── mobile.js              # Van Sales APIs (today-journey-plan, customer-details, complete-visit, add-visit-notes, record-order)
│   │   ├── users.js               # GET /api/users
│   │   └── customers.js           # Customer CRUD
│   ├── seed/
│   │   └── seed.js                # Seed data: 2 users, 10 customers, 4 plans
│   ├── .env                       # Environment variables (MONGODB_URI, JWT_SECRET, PORT)
│   ├── server.js                  # Express app entry point
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.js      # Auth state management (login, logout, user)
│   │   ├── services/
│   │   │   └── api.js              # Axios API client with JWT interceptor
│   │   ├── pages/
│   │   │   ├── LoginPage.js        # Login (admin & vansales, username-based)
│   │   │   ├── AdminDashboard.js   # Admin: list all journey plans with stats
│   │   │   ├── AdminCreatePlan.js  # Admin: create plan + select date + assign user + select customers
│   │   │   ├── AdminPlanDetail.js  # Admin: plan details + add customers + activate
│   │   │   ├── MobileDashboard.js  # Mobile: today's journey plan screen
│   │   │   ├── MobileCustomerList.js # Mobile: customer list with visit status
│   │   │   └── MobileCustomerDetail.js # Mobile: customer detail + visit actions
│   │   ├── styles/
│   │   │   └── global.css          # Tailwind CSS directives + base mobile styles
│   │   ├── App.js                  # Router + Role-based Protected Routes
│   │   └── index.js                # Entry point
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
└── TESTING.md                      # This file
```

---

## 2. MONGODB SCHEMA MODELS

### User Schema
| Field        | Type    | Required | Constraints                    |
|-------------|---------|----------|--------------------------------|
| name        | String  | Yes      | trimmed                        |
| username    | String  | Yes      | unique, lowercase, trimmed     |
| password    | String  | Yes      | min 6 chars, bcrypt hashed     |
| role        | String  | Yes      | enum: ['admin', 'vansales']    |
| mobileNumber| String  | No       | trimmed                        |
| isActive    | Boolean | No       | default: true                  |

### Customer Schema
| Field         | Type   | Required | Constraints                  |
|--------------|--------|----------|------------------------------|
| customerName | String | Yes      | trimmed                      |
| customerCode | String | Yes      | unique, trimmed              |
| address      | String | No       | trimmed                      |
| contactNumber| String | No       | trimmed                      |
| route        | String | No       | trimmed                      |
| location     | String | No       | trimmed                      |
| status       | String | No       | enum: ['active','inactive'], default: 'active' |

**Indexes:** customerCode, route, text(customerName + customerCode)

### JourneyPlan Schema
| Field      | Type       | Required | Constraints                     |
|-----------|------------|----------|---------------------------------|
| planDate  | Date       | Yes      |                                 |
| assignedTo| ObjectId   | Yes      | ref: User                       |
| customers | [ObjectId] | No       | ref: Customer                   |
| status    | String     | No       | enum: ['active','inactive'], default: 'inactive' |
| createdBy | ObjectId   | Yes      | ref: User                       |
| createdAt | Date       | No       | default: Date.now               |

**Indexes:** (assignedTo + planDate), planDate, status

### Visit Schema
| Field           | Type     | Required | Constraints                     |
|----------------|----------|----------|---------------------------------|
| customerId     | ObjectId | Yes      | ref: Customer                   |
| userId         | ObjectId | Yes      | ref: User                       |
| journeyPlanId  | ObjectId | Yes      | ref: JourneyPlan                |
| visitStatus    | String   | No       | enum: ['pending','completed'], default: 'pending' |
| visitNotes     | String   | No       | trimmed, default: ''            |
| salesOrderAmount| Number  | No       | default: 0                      |
| visitTime      | Date     | No       |                                 |

**Indexes:** journeyPlanId, userId, customerId

---

## 3. EXPRESS API ENDPOINTS

### Authentication
| Method | Endpoint          | Auth | Description        |
|--------|------------------|------|--------------------|
| POST   | /api/auth/login  | No   | Login with username/password, returns JWT token |
| GET    | /api/auth/me     | JWT  | Get current user profile |

### Admin APIs
| Method | Endpoint                          | Auth       | Description                    |
|--------|----------------------------------|------------|--------------------------------|
| POST   | /api/admin/create-journey-plan   | JWT+Admin  | Create new journey plan with customers |
| POST   | /api/admin/add-customers-to-plan | JWT+Admin  | Add more customers to existing plan |
| POST   | /api/admin/assign-plan           | JWT+Admin  | Assign user to plan + change status |
| GET    | /api/admin/journey-plans         | JWT+Admin  | List all plans with pagination + visit stats |

### Van Sales Mobile APIs
| Method | Endpoint                          | Auth | Description                    |
|--------|----------------------------------|------|--------------------------------|
| GET    | /api/mobile/today-journey-plan   | JWT  | Get today's active plans with visits |
| GET    | /api/mobile/customer-details/:id | JWT  | Get customer details + visit history |
| POST   | /api/mobile/complete-visit       | JWT  | Mark visit as completed        |
| POST   | /api/mobile/add-visit-notes      | JWT  | Add/update notes on a visit    |
| POST   | /api/mobile/record-order         | JWT  | Record sales order amount      |

### Supporting APIs
| Method | Endpoint            | Auth       | Description         |
|--------|-------------------|------------|---------------------|
| GET    | /api/users         | JWT+Admin  | List users (filter by role) |
| GET    | /api/customers     | JWT        | List customers with pagination + search |
| GET    | /api/customers/:id | JWT        | Get single customer |
| POST   | /api/customers     | JWT+Admin  | Create customer     |

---

## 4. SAMPLE API RESPONSES

### POST /api/auth/login
**Request:**
```json
{ "username": "vansales_test01", "password": "vansales123" }
```
**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Van Sales User 01",
    "username": "vansales_test01",
    "role": "vansales",
    "mobileNumber": "+971501000002",
    "isActive": true
  }
}
```

### POST /api/admin/create-journey-plan
**Request:**
```json
{
  "planDate": "2026-03-05",
  "assignedTo": "65f1a2b3c4d5e6f7a8b9c0d1",
  "customers": ["65f1a2b3c4d5e6f7a8b9c0e1", "65f1a2b3c4d5e6f7a8b9c0e2"]
}
```
**Response (201):**
```json
{
  "message": "Journey plan created successfully",
  "plan": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0f1",
    "planDate": "2026-03-05T00:00:00.000Z",
    "assignedTo": { "_id": "...", "name": "Van Sales User 01", "username": "vansales_test01" },
    "customers": [
      { "_id": "...", "customerName": "Al Madina Grocery", "customerCode": "CUST001", "location": "Downtown Dubai" }
    ],
    "status": "inactive",
    "createdBy": { "_id": "...", "name": "Admin User" }
  }
}
```

### GET /api/mobile/today-journey-plan
**Response (200):**
```json
[
  {
    "_id": "65f...",
    "planDate": "2026-03-05T00:00:00.000Z",
    "customers": [
      { "_id": "...", "customerName": "Al Madina Grocery", "customerCode": "CUST001", "address": "123 Main St", "contactNumber": "+971501234567", "route": "Route A", "location": "Downtown Dubai" }
    ],
    "status": "active",
    "visits": [
      {
        "_id": "65f...",
        "customerId": { "customerName": "Al Madina Grocery", "customerCode": "CUST001", "location": "Downtown Dubai" },
        "visitStatus": "pending",
        "visitNotes": "",
        "salesOrderAmount": 0
      }
    ],
    "visitStats": { "total": 5, "completed": 0, "pending": 5 }
  }
]
```

### POST /api/mobile/complete-visit
**Request:** `{ "visitId": "65f..." }`
**Response (200):**
```json
{
  "message": "Visit completed successfully",
  "visit": {
    "_id": "65f...",
    "customerId": { "customerName": "Al Madina Grocery", "customerCode": "CUST001" },
    "visitStatus": "completed",
    "visitTime": "2026-03-05T10:30:00.000Z"
  }
}
```

### POST /api/mobile/add-visit-notes
**Request:** `{ "visitId": "65f...", "visitNotes": "Met with store manager" }`
**Response (200):**
```json
{
  "message": "Notes added successfully",
  "visit": { "_id": "65f...", "visitNotes": "Met with store manager", "visitStatus": "pending" }
}
```

### POST /api/mobile/record-order
**Request:** `{ "visitId": "65f...", "salesOrderAmount": 1250.50 }`
**Response (200):**
```json
{
  "message": "Order recorded successfully",
  "visit": { "_id": "65f...", "salesOrderAmount": 1250.50, "visitStatus": "pending" }
}
```

### GET /api/admin/journey-plans
**Response (200):**
```json
{
  "plans": [
    {
      "_id": "65f...",
      "planDate": "2026-03-05T00:00:00.000Z",
      "assignedTo": { "name": "Van Sales User 01", "username": "vansales_test01" },
      "customers": [...],
      "status": "active",
      "visits": [...],
      "visitStats": { "total": 5, "completed": 2, "pending": 3 }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 4, "pages": 1 }
}
```

---

## 5. TEST CASE DOCUMENT

### TS-001: Admin Creates Journey Plan with 5 Customers

| Item            | Detail |
|----------------|--------|
| **Test Case ID** | TS-001 |
| **Title**        | Admin creates Journey Plan with 5 customers |
| **Precondition** | Admin is logged in (admin_test / admin123). At least 5 active customers exist. |
| **Steps**        | 1. Login as admin_test. 2. Click "+ New Plan". 3. Select today's date. 4. Select "Van Sales User 01" from dropdown. 5. Check 5 customers. 6. Click "Create Journey Plan". |
| **Expected**     | Plan is created with status "inactive". 5 visit records are created with status "pending". Admin is redirected to dashboard showing the new plan with "5 customers" and 0/5 visited. |
| **Priority**     | High |

### TS-002: Van Sales User Logs In and Views Today's Plan

| Item            | Detail |
|----------------|--------|
| **Test Case ID** | TS-002 |
| **Title**        | Van Sales User logs in and views today's plan |
| **Precondition** | Active journey plan exists for today assigned to vansales_test01. |
| **Steps**        | 1. Open login page. 2. Enter username "vansales_test01" and password "vansales123". 3. Click "Sign In". 4. Observe the Mobile Dashboard. |
| **Expected**     | User is redirected to /mobile. Today's active plan is displayed with stats: total stops, completed, pending, percentage. Progress bar reflects completion status. "View Customers" link is visible. |
| **Priority**     | High |

### TS-003: Customer List Mobile UI Verification

| Item            | Detail |
|----------------|--------|
| **Test Case ID** | TS-003 |
| **Title**        | Customer list mobile UI shows required fields |
| **Precondition** | Van Sales user is logged in. Active plan with customers exists. |
| **Steps**        | 1. From Mobile Dashboard, tap on a plan. 2. Verify Customer List page loads. 3. For each customer card verify: Customer Name is bold and prominent, Customer Code is displayed, Location is shown, Visit Status badge is visible (pending=orange, completed=green). |
| **Expected**     | All customer cards show: customerName (bold, 16px), customerCode (14px, gray), location (14px, light gray), visitStatus badge (color-coded). Left border indicates status (green=completed, orange=pending). Progress summary at top shows X of Y visited. |
| **Priority**     | High |

### TS-004: Open Customer Details

| Item            | Detail |
|----------------|--------|
| **Test Case ID** | TS-004 |
| **Title**        | Open customer details from customer list |
| **Precondition** | Van Sales user is on Customer List page with pending visits. |
| **Steps**        | 1. Tap on any customer card. 2. Verify Customer Detail page loads. 3. Check: Name, Code, Address, Contact (tappable phone link), Route, Location are displayed. 4. Verify 3 action areas: "Mark Visit Complete" button, "Visit Notes" section with save button, "Record Order" section with amount input and submit button. |
| **Expected**     | All 6 customer fields displayed in a clean card layout. Contact number is a clickable tel: link. Three action areas are clearly separated. "Mark Visit Complete" is a large green button (prominent CTA). All buttons meet 44px minimum touch target. |
| **Priority**     | High |

### TS-005: Perform Visit Actions

| Item            | Detail |
|----------------|--------|
| **Test Case ID** | TS-005 |
| **Title**        | Complete visit, add notes, and record order |
| **Precondition** | Van Sales user is on Customer Detail page. Visit status is "pending". |
| **Steps**        | 1. Enter notes: "Met with store manager. Good stock levels." 2. Click "Save Notes" - verify success message. 3. Enter order amount: 1500.00. 4. Click "Record Order" - verify success message. 5. Click "Mark Visit Complete" - verify success message. |
| **Expected**     | Step 2: "Notes saved!" message appears briefly. Step 4: "Order recorded!" message appears. Step 5: "Visit marked as completed!" message. UI transitions to completed state showing checkmark, visit time, saved notes, and order amount. All action buttons are hidden (replaced by read-only completed view). Back on customer list, this customer's badge shows "completed" with green border. |
| **Priority**     | High |

### TS-006: Journey Plan with No Customers

| Item            | Detail |
|----------------|--------|
| **Test Case ID** | TS-006 |
| **Title**        | Journey Plan with no customers |
| **Precondition** | Seed data includes an inactive plan with 0 customers. |
| **Steps**        | 1. Login as admin_test. 2. View the journey plans list. 3. Find plan with "0 customers". 4. Click to view details. 5. Click "Add Customers". |
| **Expected**     | Plan displays "0 customers" with 0/0 visit stats. Progress bar is empty. "Add Customers" button works and shows available customers. Admin can add customers to the empty plan. |
| **Priority**     | Medium |

### TS-007: Future Journey Plan Should Not Appear Today

| Item            | Detail |
|----------------|--------|
| **Test Case ID** | TS-007 |
| **Title**        | Future Journey Plan should not appear in today's mobile view |
| **Precondition** | Seed data includes a plan with planDate = tomorrow (status: inactive). vansales_test01 is assigned to it. |
| **Steps**        | 1. Login as vansales_test01. 2. View the Mobile Dashboard (today's plans). 3. Verify only today's active plans are shown. |
| **Expected**     | Tomorrow's plan does NOT appear in the list. API /api/mobile/today-journey-plan filters by: planDate = today AND status = 'active'. Only plans matching BOTH conditions are returned. Inactive plans for today are also excluded. |
| **Priority**     | High |

### TS-008: Mobile Responsiveness

| Item            | Detail |
|----------------|--------|
| **Test Case ID** | TS-008 |
| **Title**        | Mobile responsiveness verification |
| **Precondition** | Application is running. |
| **Steps**        | 1. Open app at 375px width (iPhone SE). 2. Open app at 414px width (iPhone 12). 3. Open app at 768px width (iPad). 4. Open app at 1024px+ width (Desktop). 5. Navigate all pages on each width. |
| **Expected**     | 375px: All content fits, no horizontal scroll. Cards are full-width. Buttons are full-width. Text is readable (16px base). 414px: Same as above with slightly more breathing room. 768px: Content has max-width constraint. Cards have comfortable padding. 1024px+: Content centered with max-width. Modals center vertically instead of sliding from bottom. All screen sizes: Headers stick to top. Inputs have adequate size. Touch targets >= 44px. |
| **Priority**     | High |

### TS-009: One-Handed Usability

| Item            | Detail |
|----------------|--------|
| **Test Case ID** | TS-009 |
| **Title**        | One-handed usability test |
| **Precondition** | App running on mobile device (375px width). |
| **Steps**        | 1. Hold phone in right hand. 2. Navigate: Login -> Dashboard -> Customer List -> Customer Detail. 3. Perform: Save Notes, Record Order, Complete Visit. 4. Navigate back to dashboard. 5. Repeat with left hand. |
| **Expected**     | All primary actions reachable with thumb. Back button in top-left corner (slightly harder to reach but acceptable for navigation). "Mark Visit Complete" button is large and in the main content area. Form inputs are full-width (easy to tap). No actions require precise targeting. Bottom of screen (natural thumb zone) contains primary content. |
| **Priority**     | Medium |

### TS-010: Touch Target Size Validation

| Item            | Detail |
|----------------|--------|
| **Test Case ID** | TS-010 |
| **Title**        | All interactive elements meet 44x44px minimum |
| **Precondition** | App is running in Chrome DevTools mobile mode. |
| **Steps**        | 1. Open Chrome DevTools. 2. Inspect each interactive element. 3. Verify computed height >= 44px for: Login button, Logout button, Back button, Plan cards, Customer cards, "Mark Visit Complete" button, "Save Notes" button, "Record Order" button, Date input, Select dropdown, Text inputs, Textarea, Checkboxes (container). |
| **Expected**     | CSS enforces `min-height: 44px` on all button, a, input, select, textarea, [role="button"] elements. Tailwind classes py-3 (48px) and py-4 (56px) ensure adequate size. Card containers have p-4/p-5 padding making total tap area well above 44px. All form inputs use py-3 (48px effective height). |
| **Priority**     | Medium |

---

## 6. TEST EXECUTION REPORT FORMAT

| # | Test Case ID | Title | Status | Executed By | Date | Environment | Remarks |
|---|-------------|-------|--------|-------------|------|-------------|---------|
| 1 | TS-001 | Admin creates Journey Plan with 5 customers | ______ | __________ | ____/____/____ | Chrome/Mobile | |
| 2 | TS-002 | Van Sales User logs in and views today's plan | ______ | __________ | ____/____/____ | Chrome/Mobile | |
| 3 | TS-003 | Customer list mobile UI verification | ______ | __________ | ____/____/____ | Chrome/Mobile | |
| 4 | TS-004 | Open customer details | ______ | __________ | ____/____/____ | Chrome/Mobile | |
| 5 | TS-005 | Perform visit actions (complete, notes, order) | ______ | __________ | ____/____/____ | Chrome/Mobile | |
| 6 | TS-006 | Journey Plan with no customers | ______ | __________ | ____/____/____ | Chrome/Desktop | |
| 7 | TS-007 | Future Journey Plan should not appear today | ______ | __________ | ____/____/____ | Chrome/Mobile | |
| 8 | TS-008 | Mobile responsiveness (375/414/768/1024px) | ______ | __________ | ____/____/____ | Chrome DevTools | |
| 9 | TS-009 | One-handed usability | ______ | __________ | ____/____/____ | Physical Device | |
| 10| TS-010 | Touch target size validation (>=44px) | ______ | __________ | ____/____/____ | Chrome DevTools | |

**Status Options:** Pass | Fail | Blocked | Not Executed

---

## 7. DEFECT REPORT TEMPLATE

| Field | Value |
|-------|-------|
| **Defect ID** | DEF-XXX |
| **Title** | [Short description] |
| **Severity** | Critical / High / Medium / Low |
| **Priority** | P1 / P2 / P3 / P4 |
| **Status** | Open / In Progress / Fixed / Verified / Closed / Reopened |
| **Environment** | Browser: _____, Device: _____, OS: _____, Screen: _____px |
| **Module** | Login / Admin Dashboard / Create Plan / Customer List / Customer Detail / Visit Actions |
| **Test Case ID** | TS-XXX |
| **Build/Version** | v1.0.0 |
| **Steps to Reproduce** | 1. _____ 2. _____ 3. _____ |
| **Expected Result** | [What should happen] |
| **Actual Result** | [What actually happened] |
| **Screenshot/Video** | [Attach evidence] |
| **API Request/Response** | [If applicable, include curl/network tab data] |
| **Console Errors** | [If applicable, paste browser console errors] |
| **Reported By** | [Tester Name] |
| **Reported Date** | [YYYY-MM-DD] |
| **Assigned To** | [Developer Name] |
| **Fixed In Build** | [Version] |
| **Fixed Date** | [YYYY-MM-DD] |
| **Verified By** | [Tester Name] |
| **Remarks** | [Additional context, workarounds, related defects] |

---

## 8. TEST SUMMARY REPORT

| Section | Detail |
|---------|--------|
| **Project Name** | SFA Journey Plan Management System |
| **Version** | 1.0.0 |
| **Test Period** | [Start Date] to [End Date] |
| **Test Environment** | Node.js 18+ / Express 4.21 / MongoDB Atlas / React 18.3 / Tailwind CSS 3 |
| **Database** | MongoDB Atlas (Cluster0) - sfa_db |
| **Browsers Tested** | Chrome (Mobile + Desktop), Safari (iOS), Firefox |
| **Devices Tested** | iPhone SE (375px), iPhone 12 (414px), iPad (768px), Desktop (1024px+) |
| **Total Test Cases** | 10 |
| **Passed** | _____ |
| **Failed** | _____ |
| **Blocked** | _____ |
| **Not Executed** | _____ |
| **Pass Rate** | _____% |
| **Critical Defects** | _____ |
| **High Defects** | _____ |
| **Medium Defects** | _____ |
| **Low Defects** | _____ |
| **Total Defects** | _____ |
| **Defects Fixed** | _____ |
| **Defects Open** | _____ |
| **Overall Quality** | Good / Acceptable / Needs Improvement |
| **Recommendation** | Go / No-Go / Conditional Go |
| **Prepared By** | [QA Lead] |
| **Reviewed By** | [Project Manager] |
| **Date** | [YYYY-MM-DD] |

---

## 9. PERFORMANCE OBSERVATION CHECKLIST

| # | Check Item | Target | Actual | Status |
|---|-----------|--------|--------|--------|
| 1 | GET /api/mobile/today-journey-plan response (3G throttle) | < 2 sec | _____ ms | Pass/Fail |
| 2 | GET /api/mobile/customer-details/:id response | < 1 sec | _____ ms | Pass/Fail |
| 3 | POST /api/auth/login response | < 1 sec | _____ ms | Pass/Fail |
| 4 | GET /api/admin/journey-plans (20 plans) | < 2 sec | _____ ms | Pass/Fail |
| 5 | POST /api/mobile/complete-visit response | < 1 sec | _____ ms | Pass/Fail |
| 6 | MongoDB indexes created (check with db.collection.getIndexes()) | Yes | _____ | Pass/Fail |
| 7 | API response payload size (today-journey-plan) | < 50KB | _____ KB | Pass/Fail |
| 8 | Pagination on journey-plans endpoint | Yes | _____ | Pass/Fail |
| 9 | Pagination on customers endpoint | Yes | _____ | Pass/Fail |
| 10 | .lean() used on read-only queries | Yes | _____ | Pass/Fail |
| 11 | First Contentful Paint (mobile, 3G) | < 3 sec | _____ sec | Pass/Fail |
| 12 | No N+1 query patterns in APIs | Yes | _____ | Pass/Fail |

**Optimizations Applied:**
- MongoDB compound indexes: (assignedTo + planDate), planDate, status, customerCode, route
- Text index on customerName + customerCode for search
- `.lean()` on all read queries for faster serialization
- Pagination with configurable page/limit on list endpoints
- Selective `.populate()` with field projection (only needed fields)
- `Promise.all()` for parallel data fetching
- Lightweight API responses (no unnecessary nested data)

---

## 10. SUGGESTIONS FOR IMPROVEMENTS

### Short-term (Sprint 2)
1. **express-validator**: Add input validation middleware for all POST endpoints
2. **Rate Limiting**: Protect /api/auth/login against brute force (express-rate-limit)
3. **Error Codes**: Return structured error codes alongside messages for frontend handling
4. **GPS Capture**: Record lat/lng when completing a visit for proof-of-location
5. **Photo Upload**: Allow van sales users to capture store photos during visits

### Medium-term (Sprint 3-4)
6. **Push Notifications**: FCM/APNs notifications when admin assigns new plan
7. **Route Optimization**: Auto-sort customers by driving distance
8. **Admin Analytics Dashboard**: Charts for daily/weekly visit completion rates and sales
9. **Export to PDF/Excel**: Download journey plan reports and visit summaries
10. **Real-time Updates**: WebSocket or SSE for live visit status on admin dashboard

### Long-term (Future)
11. **Offline Mode**: Service worker + IndexedDB for offline visit recording with auto-sync
12. **Multi-language (i18n)**: Arabic/English support for UAE market
13. **Inventory Check**: Integration with inventory management system
14. **Payment Collection**: In-app payment recording with receipt generation
15. **AI Route Planning**: ML-based route optimization from historical visit data
16. **PWA**: Convert to Progressive Web App with install prompt and push notifications

---

## SEED DATA CREDENTIALS

| Role | Username | Password |
|------|----------|----------|
| Admin | admin_test | admin123 |
| Van Sales 1 | vansales_test01 | vansales123 |
| Van Sales 2 | vansales_test02 | vansales123 |

### 10 Customer Records

| # | Customer Name | Code | Address | Contact | Route | Location |
|---|--------------|------|---------|---------|-------|----------|
| 1 | Al Madina Grocery | CUST001 | 123 Main St, Downtown Dubai | +971501234567 | Route A - Downtown | Downtown Dubai |
| 2 | City Supermarket | CUST002 | 456 Market Ave, Business Bay | +971501234568 | Route A - Downtown | Business Bay |
| 3 | Fresh Foods Store | CUST003 | 789 Park Rd, Jumeirah | +971501234569 | Route B - Coastal | Jumeirah |
| 4 | Quick Mart | CUST004 | 321 Lake View, Dubai Marina | +971501234570 | Route B - Coastal | Dubai Marina |
| 5 | Family Store | CUST005 | 654 Palm St, Deira | +971501234571 | Route C - Deira | Deira |
| 6 | Express Mini Mart | CUST006 | 111 Creek Rd, Bur Dubai | +971501234572 | Route C - Deira | Bur Dubai |
| 7 | Royal Supermarket | CUST007 | 222 Sheikh Zayed Rd, Al Barsha | +971501234573 | Route D - West | Al Barsha |
| 8 | Corner Shop | CUST008 | 333 Al Wasl Rd, Al Safa | +971501234574 | Route D - West | Al Safa |
| 9 | Golden Grocery | CUST009 | 444 Hessa St, Al Quoz | +971501234575 | Route E - Industrial | Al Quoz |
| 10 | Star Provisions | CUST010 | 555 Emirates Rd, Silicon Oasis | +971501234576 | Route E - Industrial | Dubai Silicon Oasis |

---

## HOW TO RUN

### Backend
```bash
cd backend
npm install
npm run seed    # Seeds database with test data
npm run dev     # Starts server on port 5000
```

### Frontend
```bash
cd frontend
npm install
npm start       # Starts React on port 3000
```

### Quick Test
1. Open http://localhost:3000
2. Login as `admin_test` / `admin123` (Admin view)
3. Login as `vansales_test01` / `vansales123` (Mobile view)
