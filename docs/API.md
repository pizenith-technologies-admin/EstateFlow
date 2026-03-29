# API Reference

**Base URL (Production)**: `https://estate-flow-deployment.vercel.app`
**Base URL (Local)**: `http://localhost:5000`

All protected routes require either:
- `Authorization: Bearer <token>` header (mobile)
- Valid session cookie (web)

---

## Authentication

### POST /api/login
Login with email and password.

**Body**
```json
{ "email": "agent@example.com", "password": "password123", "role": "agent" }
```
`role` is optional — only needed if a user has multiple roles.

**Response 200**
```json
{
  "message": "Login successful",
  "user": { "id": "...", "email": "...", "firstName": "...", "lastName": "...", "role": "agent" },
  "accessToken": "eyJ..."
}
```

### POST /api/register
Create a new account.

**Body**
```json
{ "email": "...", "firstName": "...", "lastName": "...", "password": "...", "role": "client" }
```
Valid roles: `agent`, `client`, `brokerage`, `superadmin`

### GET /api/logout
Destroy session and redirect to `/`.

### GET /api/login?role=agent
Development-only quick login. Returns redirect to `/`.

---

## Current User

### GET /api/auth/user
Get the currently authenticated user.

### PATCH /api/auth/user/role
Update own role.
**Body**: `{ "role": "client" }`

### PUT /api/auth/client-type
Set client type.
**Body**: `{ "clientType": "buyer" | "renter" }`

### GET /api/auth/user/agent
Get the agent assigned to the current client.

---

## Properties

### GET /api/properties
List all properties. Supports pagination and filters.

**Query params**: `page`, `limit`, `propertyType`, `minPrice`, `maxPrice`, `bedrooms`, `city`

### GET /api/properties/:propertyId
Get a single property with full details.

### POST /api/properties
Create a property. **Agent only.**

### GET /api/properties/:propertyId/photos
List photos for a property.

### POST /api/properties/:propertyId/photos
Upload photos. `multipart/form-data` with `photos[]` field.

### POST /api/properties/:propertyId/shortlist
Add property to current user's shortlist.

### DELETE /api/properties/:propertyId/shortlist
Remove from shortlist.

### GET /api/shortlists
Get all shortlisted properties for current user.

---

## Tours

### GET /api/tours
List tours for the current user.

### POST /api/tours
Schedule a new tour.

**Body**
```json
{
  "clientId": "...",
  "scheduledDate": "2026-04-01",
  "propertyIds": ["prop1", "prop2"]
}
```

### GET /api/tours/date/:date
Get tours on a specific date (format: `YYYY-MM-DD`).

### PATCH /api/tours/:tourId
Update tour details.

### PATCH /api/tours/:tourId/complete
Mark a tour as completed.

### GET /api/tours/:tourId/properties
List properties on a tour.

### POST /api/tours/:tourId/properties
Add a property to a tour.

### PATCH /api/tours/:tourId/properties/:propertyId/status
Update property status on tour.
**Body**: `{ "status": "viewed" | "liked" | "rejected" | "offer_made" }`

### POST /api/tours/optimize-route
Optimize the order of properties using Google Maps.

### POST /api/tours/:tourId/calculate-route-distance
Calculate total route distance for a tour.

### POST /api/tours/recap
Submit a tour recap.

### GET /api/tours/recap/:date
Get recap for a date.

### GET /api/tours/summary/:date
Get daily tour summary.

---

## Tour Ratings

### GET /api/tours/:tourId/properties/:propertyId/rating
Get rating for a specific property on a tour.

### POST /api/tours/:tourId/properties/:propertyId/rating
Submit a property rating.

**Body**
```json
{
  "rating": 4,
  "feedbackCategory": "offer_now" | "hold_later" | "reject",
  "reason": "Great location"
}
```

### GET /api/tours/:tourId/ratings
Get all ratings for a tour.

---

## Showing Requests

### GET /api/showing-requests
List showing requests.

### POST /api/showing-requests
Create a showing request.

### GET /api/showing-requests/:requestId
Get details of a request.

### PATCH /api/showing-requests/:requestId/status
Approve or reject.
**Body**: `{ "status": "approved" | "rejected" }`

---

## Clients (Agent Access)

### GET /api/clients
List all clients assigned to the current agent.

### POST /api/clients
Add a new client.

### PATCH /api/clients/:clientId
Update client profile.

### DELETE /api/clients/:clientId
Delete a client.

### GET /api/clients/:clientId/requirements
Get client property requirements.

### GET /api/clients/:clientId/history
Get client's tour history.

### GET /api/clients/:clientId/shortlists
Get client's shortlisted properties.

### GET /api/clients/:clientId/offers
Get client's offer history.

### GET /api/clients/:clientId/documents
Get all documents for a client.

### GET /api/clients/:clientId/notes
Get agent notes for a client.

### POST /api/clients/:clientId/notes
Add a note.
**Body**: `{ "note": "..." }`

### GET /api/clients/:clientId/groups
Get groups the client belongs to.

---

## Client Requirements

### GET /api/clients/:clientId/requirements-enhanced
Get full requirements with scoring config.

### POST /api/clients/:clientId/requirements-enhanced
Create/update client requirements.

### POST /api/requirements/:requirementId/validate
Validate requirements completeness.

### POST /api/requirements/:requirementId/calculate-matches
Find matching properties for a client's requirements. Returns scored list.

### POST /api/requirements/:requirementId/exceptions
Create an exception (e.g. override budget limit).

---

## Rental Profiles

### GET /api/rental-profile
Get the current user's rental profile.

### POST /api/rental-profile
Create rental profile.

### PUT /api/rental-profile
Update rental profile.

---

## Rental Applications (OREA Form 410)

### GET /api/rental-applications
List applications.

### POST /api/rental-applications
Submit a rental application.

### GET /api/rental-applications/:id
Get application details.

### PUT /api/rental-applications/:id/status
Update application status.
**Body**: `{ "status": "pending" | "approved" | "rejected" }`

---

## Documents

### GET /api/documents/:userId
Get all documents for a user.

### POST /api/documents/upload
Upload a document. `multipart/form-data`.

### POST /api/documents/upload-direct
Upload via base64 or URL.

### GET /api/documents/:id/download
Download a document.

### DELETE /api/documents/:id
Delete a document.

### POST /api/documents/bulk-upload
Upload multiple documents.

### DELETE /api/documents/bulk-delete
Delete multiple documents.
**Body**: `{ "ids": ["id1", "id2"] }`

### GET /objects/:objectPath
Stream a file from Google Cloud Storage. Path is the normalized object path.

---

## Offers

### GET /api/offers
List offers for current user.

### POST /api/offers
Create an offer.

**Body**
```json
{
  "propertyId": "...",
  "clientId": "...",
  "amount": 850000,
  "conditions": "..."
}
```

---

## Messaging

### GET /api/conversations
List all conversations for current user.

### POST /api/conversations
Start a new conversation.
**Body**: `{ "agentId": "...", "clientId": "..." }`

### GET /api/conversations/:conversationId/messages
Get messages in a conversation.

### POST /api/conversations/:conversationId/messages
Send a message.
**Body**: `{ "content": "..." }`

### GET /api/conversations/unread-count
Get count of unread messages.

---

## Groups

### GET /api/groups
List groups.

### POST /api/groups
Create a group.

### GET /api/groups/:groupId/messages
Get group messages.

### POST /api/groups/:groupId/messages
Send a group message.

### GET /api/groups/:groupId/members
List group members.

---

## Agent Settings & Branding

### GET /api/settings/branding
Get agent branding settings.

### PUT /api/settings/branding
Update branding (name, logo, colors).

### GET /api/settings/branding/my-agent
Get the branding of the agent assigned to current client.

### POST /api/uploads/agent-logo
Upload agent logo. `multipart/form-data` with `logo` field.

---

## Location

### POST /api/location-shares
Share live location.
**Body**: `{ "latitude": ..., "longitude": ..., "expiresAt": "..." }`

### DELETE /api/location-shares/:id
Stop sharing location.

### GET /api/location-history/:userId
Get location history for a user.

### POST /api/location-history
Record a location point.

---

## Calendar

### GET /api/calendar-integrations/:userId
Get calendar integrations (Google/Outlook/Apple).

### POST /api/calendar-integrations
Add a calendar integration.

### GET /api/calendar-events/:userId
Get calendar events.

### POST /api/calendar-events
Create an event.

### GET /api/schedules/date/:date
Get schedule for a specific date.

---

## Brokerage (Brokerage Role)

### GET /api/broker/kpis
Get brokerage performance KPIs.

### GET /api/broker/agents
List agents in the brokerage.

### GET /api/broker/clients
List all clients across the brokerage.

### POST /api/broker/agents/link
Link an agent to the brokerage.

### GET /api/broker/settings
Get brokerage settings.

### PUT /api/broker/settings
Update brokerage settings.

---

## Admin (Super Admin Only)

### GET /api/admin/kpis
System-wide KPIs.

### GET /api/admin/brokerages
List all brokerages.

### POST /api/admin/brokerages
Create a brokerage.

### PUT /api/admin/brokerages/:id
Update a brokerage.

### DELETE /api/admin/brokerages/:id
Delete a brokerage.

### GET /api/admin/agents
List all agents system-wide.

### POST /api/admin/agents
Create an agent account.

### GET /api/admin/clients
List all clients system-wide.

### GET /api/admin/reports
Get system reports.

---

## Utility

### GET /health
Health check. Returns `{ "status": "ok" }`. No auth required.

### POST /api/seed
Seed the database with sample data. **Development only.**
