# Adding Test Data for Agent Portal Client History

## Overview
This script adds sample tour and rating data to test the agent portal's client history feature.

## What the script creates:
- 1 completed tour for client "Sarah Renter" (client_test_002) on Sept 25, 2024
- 3 properties in the tour
- 3 property ratings with different feedback categories:
  - Property 1: ⭐⭐⭐⭐⭐ (5 stars) - "Offer Now" with positive feedback
  - Property 2: ⭐⭐⭐ (3 stars) - "Hold" to compare with other options  
  - Property 3: ⭐⭐ (2 stars) - "Reject" due to distance from work

## How to run (when database is available):

### Option 1: Using psql command
```bash
psql $DATABASE_URL < add_test_data.sql
```

### Option 2: Using a SQL client (pgAdmin, DBeaver, etc.)
1. Connect with your `DATABASE_URL`
2. Run the contents of `add_test_data.sql`

## After adding the data:
1. Log in as agent (user ID: 47231990)
2. Navigate to Clients page
3. Click on "Sarah Renter" client
4. Go to the "History" tab
5. You should see:
   - Summary statistics showing 1 tour, 3 properties viewed, 3 ratings
   - Tour card for Sept 25, 2024
   - 3 properties with ratings and feedback
6. Click on any property to view details, photos, and documents

## Troubleshooting:
- If you get "duplicate key" errors, the data already exists - this is safe to ignore
- If database endpoint is disabled, enable it via Neon dashboard first
