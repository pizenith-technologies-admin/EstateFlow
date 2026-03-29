# Estate Vista - Complete API Endpoints & Testing Flows

## 🔐 AUTHENTICATION FLOWS

### 1. **Signup (New User Registration)**
```
POST /api/signup
Body: { email, firstName, lastName, password, role: "client" | "agent" }
Response: { message, user, accessToken }
What it does: Creates new user, assigns random agent to clients, sets up session
✅ Test: Sign up as new client → Check agent assigned
```

### 2. **Login**
```
POST /api/login
Body: { email, password, role?: "client" | "agent" }
Response: { message, user, accessToken }
What it does: Authenticates user, assigns agent if needed, populates session
✅ Test: Login with client@example.com / password123
✅ Test: Login with agent@example.com / password123
```

### 3. **Quick Login (Development)**
```
GET /api/login?role=client
Response: Redirects to home with session
What it does: Quick login for testing
✅ Test: Use in development for fast testing
```

### 4. **Logout**
```
GET /api/logout
Response: Redirects to home, destroys session
What it does: Clears session and logs out user
✅ Test: Click logout button
```

### 5. **Get Current User**
```
GET /api/auth/user
Headers: Must be authenticated (session required)
Response: { id, email, firstName, lastName, role, agentId }
What it does: Retrieves logged-in user's information
✅ Test: After login, verify user data shows correctly
```

---

## 👥 CLIENT FLOWS

### Client Dashboard (Initial Load)
```
1. GET /api/auth/user → Get current user
2. GET /api/properties → Get all available properties
3. GET /api/rental-profile → Get client's rental/buyer profile
4. GET /api/tours → Get client's tours
5. GET /api/showing-requests → Get client's showing requests
6. GET /api/clients → Get all clients (for agent view)
```

### A. **Tour Request Creation Flow** ⭐ CRITICAL TEST
```
1. GET /api/properties → Browse properties
2. POST /api/tours → Create new tour with selected properties
   Body: { propertyIds: [...], clientId, agentId }
   ✅ Check: Tour created successfully
   ✅ Check: Properties added to tour
   ✅ Check: Email confirmation sent

3. GET /api/tours/:tourId/properties → View tour properties
4. PATCH /api/tours/:tourId/properties/:propertyId/status → Mark property as viewed/rejected
   Body: { status: "viewed" | "rejected" | "pending" }
```

### B. **Showing Request Creation Flow** ⭐ CRITICAL TEST
```
1. GET /api/properties → Select properties
2. POST /api/showing-requests → Create showing request
   Body: {
     propertyIds: [...],
     preferredDate: "2024-12-15",
     preferredTime: "14:00",
     notes: "..."
   }
   ✅ Check: Error if no agent assigned
   ✅ Check: Showing request created
   ✅ Check: Email sent to client
   ✅ Check: Agent gets notified

3. GET /api/showing-requests → View client's showing requests
4. PATCH /api/showing-requests/:requestId/status → Agent changes status
```

### C. **Rating & Feedback Flow**
```
1. After tour completed, POST /api/tours/:tourId/properties/:propertyId/rating
   Body: {
     rating: 1-5,
     feedbackCategory: "offer_now" | "hold_later" | "reject",
     reason: "string",
     notes: "optional notes",
     remindLater: boolean
   }
   ✅ Check: Rating saved
   ✅ Check: Feedback category applied

2. GET /api/tours/:tourId/ratings → View all ratings for tour
3. GET /api/clients/:clientId/ratings → View client's all ratings
```

### D. **Offer Management Flow**
```
1. POST /api/offers → Create offer on property
   Body: { propertyId, clientId, agentId, offerAmount, ... }
   ✅ Check: Offer created successfully

2. GET /api/offers → View offers (filtered by role)
   - Client sees: Their offers
   - Agent sees: Offers from their clients

3. GET /api/clients/:clientId/offers → View client's specific offers
```

### E. **Property Media/Photos**
```
1. GET /api/photos → Get all photos
2. GET /api/properties/:propertyId/photos → Get photos for property
3. POST /api/properties/:propertyId/photos → Upload photo
   ✅ Check: Photo uploads to storage
4. GET /api/properties/:propertyId/tours/:tourId/media → Get media by property+tour
5. POST /api/properties/:propertyId/tours/:tourId/media → Upload media for specific tour
6. DELETE /api/media/:mediaId → Delete media
```

### F. **Client Requirements/Preferences**
```
1. GET /api/rental-profile → Get client's rental profile (legacy)
   Response: { bedrooms, bathrooms, budget, areas, etc. }

2. POST /api/rental-profile → Create/update rental profile
   Body: { bedrooms, bathrooms, parking, budget, moveInDate, etc. }

3. GET /api/clients/:clientId/requirements-enhanced → Get enhanced requirements
   ✅ Check: Scope fit scores calculated
   ✅ Check: Match recommendations shown

4. POST /api/clients/:clientId/requirements-enhanced → Create enhanced requirements
   Body: { Complex requirements object with validation }

5. POST /api/requirements/:requirementId/validate → Validate requirements
6. POST /api/requirements/:requirementId/calculate-matches → Calculate property matches
7. POST /api/requirements/:requirementId/exceptions → Create exceptions
```

### G. **Client Directory & Notes**
```
1. GET /api/clients/:clientId/notes → Get notes for client
2. POST /api/clients/:clientId/notes → Add note to client
   Body: { content: "string", type: "general" | "follow_up" | "alert" }
```

### H. **Client Group Messaging**
```
1. GET /api/groups → Get all groups for user
2. GET /api/groups/:groupId/messages → Get messages in group
3. POST /api/groups/:groupId/messages → Send message to group
   Body: { content, senderId }
   ✅ Check: Message stored
   ✅ Check: All group members can see it

4. GET /api/groups/:groupId/members → Get group members
```

---

## 🏢 AGENT FLOWS

### Agent Dashboard (Initial Load)
```
1. GET /api/auth/user → Get current agent
2. GET /api/clients → Get all agent's clients
3. GET /api/tours → Get all agent's tours
4. GET /api/showing-requests → Get showing requests for agent's clients
5. GET /api/offers → Get offers from agent's clients
6. GET /api/stats → Get agent statistics
7. GET /api/reports/summary → Get reports summary
```

### A. **Client Management Flow**
```
1. GET /api/clients → View all clients
2. POST /api/clients → Create new client
   Body: { email, firstName, lastName }
   ✅ Check: Client created with agent assignment

3. GET /api/clients/:clientId/requirements → Get client requirements
4. GET /api/clients/:clientId/history → Get client view history
5. GET /api/clients/:clientId/shortlists → Get client shortlists
6. PATCH /api/clients/:clientId → Update client details
7. DELETE /api/clients/:clientId → Delete client
```

### B. **Tour Management Flow** ⭐ CRITICAL TEST
```
1. GET /api/tours → View all tours
2. POST /api/tours → Create tour for client
   Body: { propertyIds, clientId, agentId, tourDate, ... }
   ✅ Check: Tour created
   ✅ Check: Properties linked to tour

3. GET /api/tours/:tourId/properties → View tour properties
4. PATCH /api/tours/:tourId/properties/:propertyId/status → Mark properties
   - pending → viewed → offer_now/hold_later/reject
```

### C. **Showing Request Management** ⭐ CRITICAL TEST
```
1. GET /api/showing-requests → View all showing requests (agent's clients)
   ✅ Check: Only see requests from assigned clients

2. PATCH /api/showing-requests/:requestId/status → Update request status
   Body: { status: "pending" | "confirmed" | "rejected" | "completed" }
   ✅ Check: Status changes
   ✅ Check: Client receives notification email
```

### D. **Tour Reminders**
```
1. GET /api/tours/:tourId/reminders → Get reminders for tour
2. POST /api/tours/:tourId/reminders → Create reminder
   Body: { reminderTime, notes, type: "email" | "sms" }
   ✅ Check: Reminder scheduled

3. DELETE /api/tours/:tourId/reminders/:reminderId → Delete reminder
```

### E. **Route Optimization**
```
1. POST /api/tours/optimize-route → Optimize tour route
   Body: { startingAddress, tours: [{ propertyAddress, ... }] }
   Response: { optimizedOrder, totalDistance, totalDuration }
   ✅ Check: Route optimized with Google Maps
```

### F. **Tour Recap & Summary**
```
1. POST /api/tours/recap → Create recap after tour
   Body: { tourDate, notes, propertiesVisited, clientFeedback }

2. GET /api/tours/recap/:date → Get recap for date
3. PATCH /api/tours/recap/:id → Update recap
4. GET /api/tours/summary/:date → Get summary for date
5. GET /api/tours/report → Get tour report
```

### G. **Agent Branding/Portal Customization**
```
1. GET /api/clients/:clientId/drive-folder → Get client's drive folder
2. PATCH /api/clients/:clientId/drive-folder → Set client's drive folder
   Body: { driveFolderUrl: "..." }
```

### H. **Documents Center** (Agent managing client docs)
```
All document operations are client-specific
Agents can upload/manage documents for their clients
```

---

## 🏛️ ADMIN/BROKERAGE FLOWS

```
📌 Note: These require superadmin or brokerage role
Most admin endpoints start with /api/admin/ or require isSuperAdmin middleware
```

---

## 📊 COMMON FEATURES

### A. **Statistics & Reports**
```
1. GET /api/stats → Get general statistics
   Response: { totalTours, activeClients, distanceTraveled, hoursInvested }

2. GET /api/reports/summary → Get summary report
   Response: { period, offerAnalytics, topRejectionReasons, clientSpecificReports }

3. GET /api/clients/:clientId/history → Get client activity history
```

### B. **Property Management**
```
1. GET /api/properties → Get all properties (filtered by agent)
2. POST /api/properties → Create property listing
3. GET /api/properties/:propertyId/photos → View property photos
4. POST /api/properties/:propertyId/photos → Upload photo to property
```

### C. **Reminders System**
```
1. GET /api/reminders/:userId → Get all reminders for user
2. POST /api/reminders → Create reminder
   Body: { userId, reminderTime, type, notes }
   ✅ Check: Reminder scheduled

3. PUT /api/reminders/:id → Update reminder
4. DELETE /api/reminders/:id → Delete reminder
```

### D. **Rental Applications** (For Renter Clients)
```
1. GET /api/rental-applications → Get all applications
2. POST /api/rental-applications → Create OREA Form 410 application
   Body: { Complex rental application data }
   ✅ Check: All fields validated

3. GET /api/rental-applications/:id → Get specific application
4. PUT /api/rental-applications/:id/status → Update application status
```

### E. **Client Groups**
```
1. GET /api/groups → Get all groups
2. POST /api/groups → Create new group
   Body: { name, members: [...] }

3. GET /api/client-groups → Get all client groups
4. GET /api/clients/:clientId/groups → Get groups client belongs to
```

---

## ✅ STEP-BY-STEP TESTING CHECKLIST

### **Phase 1: Authentication** (Start here)
```
□ Sign up as new client
  - Verify: Email stored
  - Verify: Agent randomly assigned
  - Verify: Session created
  - Verify: Redirected to home

□ Login as client
  - Email: client@example.com
  - Password: password123
  - Verify: Session created with agentId
  - Verify: Dashboard loads with client data

□ Login as agent
  - Email: agent@example.com
  - Password: password123
  - Verify: Can see assigned clients
  - Verify: Can see tours/requests

□ Logout
  - Verify: Session destroyed
  - Verify: Cannot access protected pages
```

### **Phase 2: Client Basic Flows** ⭐ PRIORITY
```
□ Browse Properties
  - GET /api/properties works
  - Properties display correctly

□ Create Tour Request (CRITICAL)
  - Select properties
  - Submit tour request
  - Verify: No agent_id NULL error
  - Verify: Email sent
  - Verify: Visible in "My Requests"

□ Create Showing Request (CRITICAL)
  - Select properties
  - Choose date/time
  - Submit request
  - Verify: No agent_id NULL error
  - Verify: Email confirmation sent
  - Verify: Agent can see request

□ Rate Property
  - After tour, rate property 1-5
  - Select feedback category
  - Add optional notes
  - Verify: Rating saved
  - Verify: Visible in ratings list
```

### **Phase 3: Agent Flows** ⭐ PRIORITY
```
□ View Assigned Clients
  - GET /api/clients works
  - Shows all client list
  - Verify: Can filter/search

□ View Showing Requests
  - GET /api/showing-requests works
  - Shows client requests only
  - Verify: Date/time displays correctly

□ Update Request Status
  - PATCH /api/showing-requests/:id/status
  - Change: pending → confirmed → completed
  - Verify: Client receives email notification
  - Verify: Status updates in real-time

□ Create Tour for Client
  - POST /api/tours
  - Select client, properties, date
  - Verify: Tour created
  - Verify: Properties linked

□ View Tour Properties
  - GET /api/tours/:tourId/properties
  - Mark property as viewed/rejected
  - Verify: Status updates

□ Create Tour Reminder
  - POST /api/tours/:tourId/reminders
  - Set reminder time
  - Verify: Reminder scheduled
```

### **Phase 4: Advanced Features**
```
□ Upload Photos/Media
  - Upload property photo
  - Verify: File stored in Object Storage
  - Verify: Can download presigned URL

□ Route Optimization
  - POST /api/tours/optimize-route
  - Verify: Google Maps integration works
  - Verify: Route optimized with distance/duration

□ Reports & Analytics
  - GET /api/stats
  - GET /api/reports/summary
  - Verify: Data displays correctly

□ Client Requirements
  - POST /api/clients/:clientId/requirements-enhanced
  - Verify: Scope fit scores calculated
  - Verify: Property matches recommended
```

---

## 🐛 COMMON ERRORS TO WATCH FOR

### ❌ **agent_id NOT NULL Constraint Error**
```
Error: "null value in column "agent_id""
Solution: Client not assigned agent during login/signup
Check: Verify session.user.agentId is set
Fix: Make sure agentId is in session after login
```

### ❌ **Date Parsing Errors**
```
Error: "toISOString is not a function"
Solution: preferredDate not properly converted to Date object
Check: Verify date is parsed from JSON string before storage
Fix: Use `new Date(preferredDate)` when receiving JSON
```

### ❌ **Email Not Sending**
```
Error: SENDGRID_API_KEY not set
Solution: SendGrid integration not configured
Check: Logs show "email notifications will be disabled"
Note: App still works, emails just don't send in dev
```

### ❌ **Unauthorized 401 Errors**
```
Error: "Unauthorized"
Solution: Missing authentication or invalid session
Check: Verify you're logged in
Check: Verify sessionId in cookies
Fix: Login again and retry
```

---

## 📝 RECOMMENDED TEST ORDER

1. **Auth**: Signup → Login → Verify User Data
2. **Client**: Browse Properties → Create Tour → Create Showing Request
3. **Agent**: View Clients → View Requests → Update Status
4. **Feedback**: Rate Property → Add Notes → View Ratings
5. **Advanced**: Upload Media → View Reports → Optimize Route

---

## 🚀 TEST CREDENTIALS

```
CLIENT:
Email: client@example.com
Password: password123

AGENT:
Email: agent@example.com
Password: password123

Can also signup new users with role: "client" or "agent"
```
