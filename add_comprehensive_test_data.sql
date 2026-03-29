-- Comprehensive Test Data for Estate Vista Agent Portal
-- This script adds tours, ratings, and property media for testing

-- First, let's add some more test clients if they don't exist
INSERT INTO users (id, email, first_name, last_name, role, client_type, created_at)
VALUES 
  ('client_john_001', 'john.buyer@example.com', 'John', 'Buyer', 'client', 'buyer', NOW()),
  ('client_sarah_002', 'sarah.renter@example.com', 'Sarah', 'Renter', 'client', 'renter', NOW())
ON CONFLICT (id) DO NOTHING;

-- Add rental profile for Sarah
INSERT INTO rental_profiles (user_id, property_type, monthly_budget, preferred_areas, bedrooms, bathrooms, created_at)
VALUES (
  'client_sarah_002',
  'apartment',
  '2500',
  ARRAY['Downtown', 'Midtown', 'Uptown'],
  2,
  '2',
  NOW()
) ON CONFLICT (user_id) DO NOTHING;

-- Add buyer requirements for John
INSERT INTO buyer_requirements (
  id, user_id, budget_min, budget_max, bedrooms, bathrooms, 
  preferred_areas, property_type, must_have_features, nice_to_have_features,
  deal_breakers, timeframe, urgency_level, financing_status, 
  pre_approval_amount, version, status, created_at, last_validated_at
)
VALUES (
  gen_random_uuid(),
  'client_john_001',
  400000,
  650000,
  3,
  2.5,
  ARRAY['West End', 'East Side', 'Suburbs'],
  ARRAY['house', 'townhouse'],
  ARRAY['garage', 'backyard', 'modern_kitchen'],
  ARRAY['pool', 'fireplace', 'home_office'],
  ARRAY['busy_street', 'old_hvac', 'no_parking'],
  'within_3_months',
  'high',
  'pre_approved',
  '600000',
  1,
  'active',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Add past tour 1 for John (completed with all ratings)
INSERT INTO tours (id, agent_id, client_id, scheduled_date, status, total_distance, estimated_duration_minutes, created_at)
VALUES (
  'tour_john_past_001',
  '47231990',
  'client_john_001',
  '2024-09-15 14:00:00',
  'completed',
  22.5,
  120,
  '2024-09-10 10:00:00'
) ON CONFLICT (id) DO NOTHING;

-- Add properties to John's tour
INSERT INTO tour_properties (tour_id, property_id, "order", scheduled_time)
VALUES 
  ('tour_john_past_001', 'ebf6b3ec-e603-4cc2-aab6-f71d15ba4da6', 1, '2024-09-15 14:00:00'),
  ('tour_john_past_001', '31ef10e1-5062-48c8-8728-f82de2b8c3e0', 2, '2024-09-15 15:00:00'),
  ('tour_john_past_001', 'f46a010f-5672-4d40-a472-3b71e597e11b', 3, '2024-09-15 16:00:00'),
  ('tour_john_past_001', 'a8c2f894-dc0a-41b8-a8e8-6b8a91e50315', 4, '2024-09-15 17:00:00')
ON CONFLICT DO NOTHING;

-- Add ratings for John's tour with all feedback categories
INSERT INTO property_ratings (id, property_id, client_id, tour_id, rating, feedback_category, reason, notes, remind_later, created_at)
VALUES 
  (
    'rating_john_001',
    'ebf6b3ec-e603-4cc2-aab6-f71d15ba4da6',
    'client_john_001',
    'tour_john_past_001',
    5,
    'offer_now',
    'Meets all needs',
    'This is the one! Perfect location, great schools nearby, and the house has everything on our must-have list. The modern kitchen is stunning and the backyard is perfect for kids. Ready to make a strong offer ASAP!',
    false,
    '2024-09-15 17:30:00'
  ),
  (
    'rating_john_002',
    '31ef10e1-5062-48c8-8728-f82de2b8c3e0',
    'client_john_001',
    'tour_john_past_001',
    4,
    'hold_later',
    'Compare with other options',
    'Really nice property with great potential. Love the open floor plan and the neighborhood is quiet. Want to see a few more options this weekend before making a decision. Definitely a top contender though!',
    false,
    '2024-09-15 17:45:00'
  ),
  (
    'rating_john_003',
    'f46a010f-5672-4d40-a472-3b71e597e11b',
    'client_john_001',
    'tour_john_past_001',
    2,
    'reject',
    'Over budget',
    'The house is beautiful but the price is too high for what we're comfortable with. Would need to come down at least $50k to consider it. Also concerned about the property taxes being higher than expected.',
    false,
    '2024-09-15 18:00:00'
  ),
  (
    'rating_john_004',
    'a8c2f894-dc0a-41b8-a8e8-6b8a91e50315',
    'client_john_001',
    'tour_john_past_001',
    3,
    'hold_later',
    'Awaiting inspection details',
    'Interesting property but has some red flags. Would need a thorough home inspection before making any decision. The basement had some moisture issues that concern us.',
    false,
    '2024-09-15 18:15:00'
  )
ON CONFLICT (id) DO NOTHING;

-- Add past tour 2 for Sarah (completed with ratings)
INSERT INTO tours (id, agent_id, client_id, scheduled_date, status, total_distance, estimated_duration_minutes, created_at)
VALUES (
  'tour_sarah_past_001',
  '47231990',
  'client_sarah_002',
  '2024-09-20 10:00:00',
  'completed',
  12.8,
  90,
  '2024-09-18 14:00:00'
) ON CONFLICT (id) DO NOTHING;

-- Add properties to Sarah's tour
INSERT INTO tour_properties (tour_id, property_id, "order", scheduled_time)
VALUES 
  ('tour_sarah_past_001', 'ebf6b3ec-e603-4cc2-aab6-f71d15ba4da6', 1, '2024-09-20 10:00:00'),
  ('tour_sarah_past_001', '31ef10e1-5062-48c8-8728-f82de2b8c3e0', 2, '2024-09-20 11:00:00'),
  ('tour_sarah_past_001', 'f46a010f-5672-4d40-a472-3b71e597e11b', 3, '2024-09-20 12:00:00')
ON CONFLICT DO NOTHING;

-- Add ratings for Sarah's tour
INSERT INTO property_ratings (id, property_id, client_id, tour_id, rating, feedback_category, reason, notes, remind_later, created_at)
VALUES 
  (
    'rating_sarah_001',
    'ebf6b3ec-e603-4cc2-aab6-f71d15ba4da6',
    'client_sarah_002',
    'tour_sarah_past_001',
    4,
    'offer_now',
    'Great location',
    'Love the downtown location! Close to work and all the restaurants. The apartment is bright and has good natural light. Would like to submit an application.',
    false,
    '2024-09-20 13:00:00'
  ),
  (
    'rating_sarah_002',
    '31ef10e1-5062-48c8-8728-f82de2b8c3e0',
    'client_sarah_002',
    'tour_sarah_past_001',
    3,
    'hold_later',
    'Need partner/family alignment',
    'Nice place but my partner wants to see it before we commit. Scheduling a second viewing for next week.',
    false,
    '2024-09-20 13:15:00'
  ),
  (
    'rating_sarah_003',
    'f46a010f-5672-4d40-a472-3b71e597e11b',
    'client_sarah_002',
    'tour_sarah_past_001',
    1,
    'reject',
    'Location not preferred',
    'Too far from downtown. The commute would be over an hour each way. Not feasible for my work schedule.',
    false,
    '2024-09-20 13:30:00'
  )
ON CONFLICT (id) DO NOTHING;

-- Add another past tour for John with no ratings yet (agent can add ratings)
INSERT INTO tours (id, agent_id, client_id, scheduled_date, status, total_distance, estimated_duration_minutes, created_at)
VALUES (
  'tour_john_past_002',
  '47231990',
  'client_john_001',
  '2024-09-28 13:00:00',
  'completed',
  18.3,
  105,
  '2024-09-25 09:00:00'
) ON CONFLICT (id) DO NOTHING;

-- Add properties to John's second tour (no ratings yet)
INSERT INTO tour_properties (tour_id, property_id, "order", scheduled_time)
VALUES 
  ('tour_john_past_002', 'ebf6b3ec-e603-4cc2-aab6-f71d15ba4da6', 1, '2024-09-28 13:00:00'),
  ('tour_john_past_002', 'a8c2f894-dc0a-41b8-a8e8-6b8a91e50315', 2, '2024-09-28 14:00:00')
ON CONFLICT DO NOTHING;

-- Add property media (photos, videos, documents)
-- Note: In production these would be uploaded to object storage
-- For testing, we'll add some sample entries

INSERT INTO property_media (id, property_id, tour_id, uploaded_by, media_type, url, title, created_at)
VALUES 
  (
    gen_random_uuid(),
    'ebf6b3ec-e603-4cc2-aab6-f71d15ba4da6',
    'tour_john_past_001',
    'client_john_001',
    'photo',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
    'Front exterior view',
    '2024-09-15 17:35:00'
  ),
  (
    gen_random_uuid(),
    'ebf6b3ec-e603-4cc2-aab6-f71d15ba4da6',
    'tour_john_past_001',
    'client_john_001',
    'photo',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    'Modern kitchen',
    '2024-09-15 17:36:00'
  ),
  (
    gen_random_uuid(),
    'ebf6b3ec-e603-4cc2-aab6-f71d15ba4da6',
    'tour_john_past_001',
    'client_john_001',
    'photo',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
    'Spacious backyard',
    '2024-09-15 17:37:00'
  ),
  (
    gen_random_uuid(),
    '31ef10e1-5062-48c8-8728-f82de2b8c3e0',
    'tour_john_past_001',
    'client_john_001',
    'photo',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    'Living room',
    '2024-09-15 17:50:00'
  ),
  (
    gen_random_uuid(),
    '31ef10e1-5062-48c8-8728-f82de2b8c3e0',
    'tour_john_past_001',
    'client_john_001',
    'video',
    'https://example.com/property-walkthrough.mp4',
    'Full property walkthrough',
    '2024-09-15 17:51:00'
  )
ON CONFLICT DO NOTHING;

-- Add property documents
INSERT INTO property_documents (id, property_id, tour_id, uploaded_by, title, file_url, file_type, file_size, created_at)
VALUES 
  (
    gen_random_uuid(),
    'ebf6b3ec-e603-4cc2-aab6-f71d15ba4da6',
    'tour_john_past_001',
    '47231990',
    'Property Disclosure Statement',
    'https://example.com/docs/disclosure-123.pdf',
    'application/pdf',
    245678,
    '2024-09-15 14:00:00'
  ),
  (
    gen_random_uuid(),
    'ebf6b3ec-e603-4cc2-aab6-f71d15ba4da6',
    'tour_john_past_001',
    '47231990',
    'Home Inspection Report',
    'https://example.com/docs/inspection-123.pdf',
    'application/pdf',
    1245678,
    '2024-09-15 14:00:00'
  ),
  (
    gen_random_uuid(),
    '31ef10e1-5062-48c8-8728-f82de2b8c3e0',
    'tour_john_past_001',
    '47231990',
    'Floor Plans',
    'https://example.com/docs/floorplan-456.pdf',
    'application/pdf',
    345678,
    '2024-09-15 15:00:00'
  )
ON CONFLICT DO NOTHING;

-- Add some offers for completeness
INSERT INTO offers (id, client_id, property_id, offer_amount, status, notes, created_at)
VALUES 
  (
    gen_random_uuid(),
    'client_john_001',
    'ebf6b3ec-e603-4cc2-aab6-f71d15ba4da6',
    625000,
    'pending',
    'Strong offer with quick closing. Pre-approved financing.',
    '2024-09-16 10:00:00'
  )
ON CONFLICT DO NOTHING;

-- Summary:
-- This script creates:
-- 1. Two test clients (John Buyer and Sarah Renter) with requirements
-- 2. Three completed tours with properties
-- 3. Comprehensive property ratings (offer_now, hold_later, reject)
-- 4. Property media (photos, videos)
-- 5. Property documents (PDFs)
-- 6. One active offer

-- To run this script:
-- Use the execute_sql_tool with this file's contents
