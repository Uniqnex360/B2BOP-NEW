/*
  # Add Product Variants Support

  This migration adds support for product variants (e.g., different sizes, colors, configurations)
  while maintaining a parent product structure.

  ## Changes
  1. Create product_variants table
  2. Add parent_sku field to products table for display reference
  3. Each variant has its own SKU but references a parent product
  
  ## Structure
  - Parent Product: Main product with parent SKU (shown in product listing)
  - Variants: Different variations with their own SKUs (sizes, colors, etc.)
  
  ## Example
  Parent: T-Shirt (SKU: TSHIRT-001)
  Variants:
    - T-Shirt - Small - Red (SKU: TSHIRT-001-S-R)
    - T-Shirt - Medium - Blue (SKU: TSHIRT-001-M-B)
    - T-Shirt - Large - Red (SKU: TSHIRT-001-L-R)
*/

-- Add parent_sku to products table for display purposes
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS parent_sku text,
  ADD COLUMN IF NOT EXISTS has_variants boolean DEFAULT false;

-- Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  variant_attributes jsonb DEFAULT '{}',
  unit_price numeric NOT NULL DEFAULT 0,
  cost_price numeric DEFAULT 0,
  stock_quantity integer DEFAULT 0,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, sku)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_variants
CREATE POLICY "Sellers can view own product variants"
  ON product_variants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
      AND products.seller_id = auth.uid()
    )
  );

CREATE POLICY "Buyers can view active product variants"
  ON product_variants FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
      AND products.is_active = true
      AND products.is_visible = true
    )
  );

CREATE POLICY "Sellers can insert own product variants"
  ON product_variants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
      AND products.seller_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can update own product variants"
  ON product_variants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
      AND products.seller_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can delete own product variants"
  ON product_variants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
      AND products.seller_id = auth.uid()
    )
  );

-- Add variant_id to order_items to track which variant was ordered
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES product_variants(id);

-- Create index for order_items variant_id
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id);
