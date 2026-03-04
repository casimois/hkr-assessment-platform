-- Add selected_sections column to submissions for question pool randomization
-- When an assessment section has pool_size set, a random subset of questions
-- is selected at invite time and stored here. NULL means use all questions.
ALTER TABLE submissions ADD COLUMN selected_sections jsonb;
