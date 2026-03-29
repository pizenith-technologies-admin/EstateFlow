# Database

**Provider**: [Neon](https://neon.tech) — serverless PostgreSQL
**ORM**: [Drizzle ORM](https://orm.drizzle.team)
**Schema file**: `shared/schema.ts`

## Connection

```ts
// server/db.ts
import { Pool } from '@neondatabase/serverless';
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
```

## Migrations

```bash
# Apply schema changes to the database
npm run db:push

# Generate SQL migration files
npx drizzle-kit generate
```

> `db:push` applies schema changes directly without generating migration files. Suitable for development. Use `generate` + `migrate` for production-grade migration tracking.

---

## Tables

### users
Core user table. All roles share this table.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | User ID |
| email | text UNIQUE | Login email |
| firstName | text | |
| lastName | text | |
| role | enum | `agent`, `client`, `brokerage`, `superadmin` |
| agentId | text FK → users | Assigned agent (for clients) |
| passwordHash | text | SHA-256 hash |
| profileImageUrl | text | Cloudinary URL |
| driveFolderUrl | text | Google Drive folder link |
| createdAt | timestamp | |

### sessions
Managed by `connect-pg-simple`. Auto-created on first run.

| Column | Type | Notes |
|--------|------|-------|
| sid | text PK | Session ID |
| sess | json | Session data |
| expire | timestamp | Expiry time |

---

### properties

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| mlsNumber | text | MLS listing number |
| address | text | Street address |
| city | text | |
| province | text | |
| postalCode | text | |
| bedrooms | integer | |
| bathrooms | decimal | |
| price | decimal | |
| propertyType | text | house/condo/townhouse/etc |
| status | text | active/sold/leased |
| imageUrl | text | Primary photo |
| agentId | text FK → users | Listing agent |
| description | text | |

### property_photos

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| propertyId | text FK → properties | |
| url | text | Cloudinary URL |
| caption | text | |
| uploadedBy | text FK → users | |

### property_media
Stores videos and documents in addition to photos.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| propertyId | text FK → properties | |
| tourId | text FK → tours | Optional — media from tour visit |
| mediaType | text | photo/video/document |
| url | text | |
| uploadedBy | text FK → users | |

### property_shortlists

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| propertyId | text FK → properties | |
| userId | text FK → users | |
| createdAt | timestamp | |

### property_ratings

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| tourId | text FK → tours | |
| propertyId | text FK → properties | |
| userId | text FK → users | |
| rating | integer | 1–5 |
| feedbackCategory | text | `offer_now`, `hold_later`, `reject` |
| reason | text | |

---

### tours

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| agentId | text FK → users | |
| clientId | text FK → users | |
| groupId | text FK → client_groups | Optional group tour |
| scheduledDate | text | `YYYY-MM-DD` |
| status | enum | `requested`, `scheduled`, `in_progress`, `completed`, `cancelled` |
| totalDistance | decimal | km |
| estimatedDuration | integer | minutes |
| notes | text | |

### tour_properties
Join table linking tours to properties with per-property status.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| tourId | text FK → tours | |
| propertyId | text FK → properties | |
| order | integer | Viewing order |
| status | text | `scheduled`, `viewed`, `liked`, `rejected`, `offer_made` |
| agentRating | text | Agent's internal rating |
| visitedAt | timestamp | |

### tour_recaps

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| agentId | text FK → users | |
| tourDate | text | |
| totalDistance | decimal | |
| showingsCompleted | integer | |
| keyInsights | text | |
| challengesFaced | text | |
| nextSteps | text | |

### tour_reminders

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| userId | text FK → users | |
| tourId | text FK → tours | |
| method | text | `notification`, `email`, `sms` |
| timing | text | e.g. `24h_before` |
| sent | boolean | |

---

### showing_requests

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| clientId | text FK → users | |
| agentId | text FK → users | |
| preferredDate | text | |
| preferredTime | text | |
| status | text | `pending`, `approved`, `rejected` |
| notes | text | |

### requested_properties
Properties linked to a showing request.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| requestId | text FK → showing_requests | |
| propertyId | text FK → properties | |

---

### offers

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| propertyId | text FK → properties | |
| clientId | text FK → users | |
| agentId | text FK → users | |
| amount | decimal | Offer price |
| status | text | `pending`, `accepted`, `rejected`, `withdrawn` |
| conditions | text | Offer conditions |
| submittedAt | timestamp | |

---

### client_requirements
Stores buyer/renter requirements for property matching.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| clientId | text FK → users | |
| clientType | text | `buyer`, `renter` |
| minBudget | decimal | |
| maxBudget | decimal | |
| minBedrooms | integer | |
| preferredAreas | json | Array of city/neighbourhood strings |
| propertyTypes | json | Array of preferred types |
| mustHaveFeatures | json | Deal-breakers |
| timeline | text | `immediate`, `3_months`, `6_months`, `1_year` |
| validationStatus | text | `draft`, `validated`, `active` |

### requirements_versions
Audit trail of all requirement changes.

### requirements_exceptions
Overrides on specific matching rules (e.g., allow 10% over budget).

### property_matches
Scored match results for a requirement set.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| requirementId | text FK → client_requirements | |
| propertyId | text FK → properties | |
| overallScore | decimal | 0–1 |
| budgetScore | decimal | |
| locationScore | decimal | |
| sizeScore | decimal | |
| amenityScore | decimal | |
| highlights | json | Matched features |
| dealBreakers | json | Failed must-haves |

---

### rental_profiles
Renter profile for application pre-fill.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| userId | text FK → users | |
| monthlyIncome | decimal | |
| creditScore | integer | |
| employmentStatus | text | |
| numberOfOccupants | integer | |
| hasPets | boolean | |
| smokingStatus | text | |

### rental_applications
OREA Form 410 equivalent.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| propertyId | text FK → properties | |
| applicantId | text FK → users | |
| status | text | `pending`, `approved`, `rejected` |
| submittedAt | timestamp | |

Linked tables: `employment_history`, `financial_information`, `rental_history`, `personal_references`

---

### property_suggestions
Client-submitted property suggestions (not in MLS).

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| clientId | text FK → users | |
| address | text | |
| mlsNumber | text | Optional |
| status | text | `pending`, `approved`, `rejected`, `scheduled` |

---

### client_groups

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| name | text | |
| createdById | text FK → users | |

### group_members

| Column | Type | Notes |
|--------|------|-------|
| groupId | text FK → client_groups | |
| userId | text FK → users | |

### group_messages

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| groupId | text FK → client_groups | |
| userId | text FK → users | Sender |
| message | text | |
| sentAt | timestamp | |

### conversations
Direct messaging channel between agent and client.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| agentId | text FK → users | |
| clientId | text FK → users | |

### direct_messages

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| conversationId | text FK → conversations | |
| senderId | text FK → users | |
| content | text | |
| isRead | boolean | |
| sentAt | timestamp | |

---

### documents

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| userId | text FK → users | Owner |
| clientId | text FK → users | Associated client |
| documentType | text | 25+ types (offer, inspection, appraisal, etc.) |
| fileName | text | |
| url | text | GCS or Cloudinary URL |
| expirationDate | date | For time-sensitive docs |
| tags | json | Array of tag strings |
| isArchived | boolean | |
| uploadedAt | timestamp | |

---

### agent_branding_settings

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| agentId | text FK → users | UNIQUE |
| logoUrl | text | Cloudinary URL |
| agentName | text | Display name |
| brokerageName | text | |
| primaryColor | text | Hex colour |

### contacts
Agent contact directory.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| agentId | text FK → users | Owner |
| name | text | |
| email | text | |
| phone | text | |
| type | text | buyer/seller/lawyer/etc |

### client_contact_links
Many-to-many: clients ↔ contacts.

---

### brokerages

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| name | text | |
| email | text | |
| phone | text | |
| address | text | |
| logoUrl | text | |

### brokerage_agents

| Column | Type | Notes |
|--------|------|-------|
| brokerageId | text FK → brokerages | |
| agentId | text FK → users | |
| joinedAt | timestamp | |

---

### location_shares
Live location sharing sessions.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| userId | text FK → users | |
| latitude | decimal | |
| longitude | decimal | |
| expiresAt | timestamp | |

### location_history
GPS trail.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| userId | text FK → users | |
| latitude | decimal | |
| longitude | decimal | |
| accuracy | decimal | metres |
| activityType | text | walking/driving/etc |
| recordedAt | timestamp | |

### calendar_integrations

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| userId | text FK → users | |
| provider | text | `google`, `outlook`, `apple` |
| accessToken | text | Encrypted |
| refreshToken | text | Encrypted |

### calendar_events

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| userId | text FK → users | |
| title | text | |
| startTime | timestamp | |
| endTime | timestamp | |
| tourId | text FK → tours | Optional |
| externalEventId | text | ID from Google/Outlook |
