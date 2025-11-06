/*
  # Create Wishlist Table

  This migration creates a wishlist table for buyers to save products they're interested in.

  ## Changes
  1. Create wishlist table
  2. Add foreign keys to buyer and product
  3. Set up RLS policies
  4. Create indexes for performance

  ## Security
  - Enable RLS
  - Buyers can only view and manage their own wishlist items
*/

-- Create wishlist table
CREATE TABLE IF NOT EXISTS wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(buyer_id, product_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wishlist_buyer_id ON wishlist(buyer_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON wishlist(product_id);

-- Enable RLS
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Buyers can view own wishlist"
  ON wishlist FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "Buyers can add to own wishlist"
  ON wishlist FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Buyers can remove from own wishlist"
  ON wishlist FOR DELETE
  TO authenticated
  USING (buyer_id = auth.uid());
