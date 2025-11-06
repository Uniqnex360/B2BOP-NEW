/*
  # Add Address Fields to User Profiles

  This migration adds address-related fields to the user_profiles table to support
  order invoicing and shipping address display.

  ## Changes
  1. Add phone field for contact information
  2. Add address field for street address
  3. Add city field
  4. Add state field
  5. Add zip_code field
  6. Add country field with default 'USA'

  ## Notes
  - All fields are optional (nullable) to maintain backward compatibility
  - These fields will be used in order detail invoices
*/

-- Add address fields to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS zip_code text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'USA';
