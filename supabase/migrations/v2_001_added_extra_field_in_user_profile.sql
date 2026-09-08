ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS website text NULL,
  ADD COLUMN IF NOT EXISTS position text NULL,
  ADD COLUMN IF NOT EXISTS contact_phone text NULL,
  ADD COLUMN IF NOT EXISTS employee_count text NULL,
  ADD COLUMN IF NOT EXISTS years_in_business text NULL,
  ADD COLUMN IF NOT EXISTS has_showroom boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS showroom_sqft text NULL,
  ADD COLUMN IF NOT EXISTS comments text NULL;