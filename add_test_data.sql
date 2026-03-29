-- Add a past tour with completed status for testing
INSERT INTO tours (id, agent_id, client_id, scheduled_date, status, total_distance, estimated_duration_minutes, created_at)
VALUES (
  'tour-past-001',
  '47231990',
  'client_test_002',
  '2024-09-25 06:00:00',
  'completed',
  15.5,
  90,
  '2024-09-20 10:00:00'
) ON CONFLICT (id) DO NOTHING;

-- Add properties to the past tour
INSERT INTO tour_properties (tour_id, property_id, "order", scheduled_time)
VALUES 
  ('tour-past-001', 'ebf6b3ec-e603-4cc2-aab6-f71d15ba4da6', 1, '2024-09-25 06:00:00'),
  ('tour-past-001', '31ef10e1-5062-48c8-8728-f82de2b8c3e0', 2, '2024-09-25 07:00:00'),
  ('tour-past-001', 'f46a010f-5672-4d40-a472-3b71e597e11b', 3, '2024-09-25 08:00:00')
ON CONFLICT DO NOTHING;

-- Add ratings for properties viewed in the tour
INSERT INTO property_ratings (id, property_id, client_id, tour_id, rating, feedback_category, reason, notes, remind_later, created_at)
VALUES 
  ('rating-001', 'ebf6b3ec-e603-4cc2-aab6-f71d15ba4da6', 'client_test_002', 'tour-past-001', 5, 'offer_now', 'Meets all needs', 'Perfect location, great amenities, and the price is within budget. Ready to make an offer!', false, '2024-09-25 09:00:00'),
  ('rating-002', '31ef10e1-5062-48c8-8728-f82de2b8c3e0', 'client_test_002', 'tour-past-001', 3, 'park_for_future', 'Compare with other options', 'Good property but want to see a few more options before deciding.', false, '2024-09-25 09:15:00'),
  ('rating-003', 'f46a010f-5672-4d40-a472-3b71e597e11b', 'client_test_002', 'tour-past-001', 2, 'reject', 'Too far from work', 'Location is not ideal for daily commute. Otherwise decent property.', false, '2024-09-25 09:30:00')
ON CONFLICT (id) DO NOTHING;
