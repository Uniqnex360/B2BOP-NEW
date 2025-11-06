/*
  # Add Individual Variant Columns

  This migration adds individual variant attribute columns (variant_1 through variant_5)
  to support up to 5 different variant attributes per product variant.

  ## Changes
  1. Add variant_1_name through variant_5_name columns (text)
  2. Add variant_1_value through variant_5_value columns (text)
  3. Add min/max order quantity columns for variants
  
  ## Structure
  - variant_X_name: Name of the variant attribute (e.g., "Size", "Color")
  - variant_X_value: Value of the variant attribute (e.g., "Large", "Red")
  - Supports up to 5 different variant dimensions
*/

-- Add variant attribute columns
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS variant_1_name text,
  ADD COLUMN IF NOT EXISTS variant_1_value text,
  ADD COLUMN IF NOT EXISTS variant_2_name text,
  ADD COLUMN IF NOT EXISTS variant_2_value text,
  ADD COLUMN IF NOT EXISTS variant_3_name text,
  ADD COLUMN IF NOT EXISTS variant_3_value text,
  ADD COLUMN IF NOT EXISTS variant_4_name text,
  ADD COLUMN IF NOT EXISTS variant_4_value text,
  ADD COLUMN IF NOT EXISTS variant_5_name text,
  ADD COLUMN IF NOT EXISTS variant_5_value text,
  ADD COLUMN IF NOT EXISTS min_order_quantity integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_order_quantity integer;