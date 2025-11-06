/*
  # Add Warehouses and Shipment Items Tables

  1. New Tables
    - `warehouses`
      - `id` (uuid, primary key)
      - `seller_id` (uuid, references user_profiles)
      - `name` (text) - Warehouse name
      - `address` (text) - Full address
      - `city` (text)
      - `state` (text)
      - `zip_code` (text)
      - `country` (text)
      - `phone` (text)
      - `is_active` (boolean)
      - `created_at` (timestamptz)

    - `shipment_items`
      - `id` (uuid, primary key)
      - `shipment_id` (uuid, references shipments)
      - `order_item_id` (uuid, references order_items)
      - `warehouse_id` (uuid, references warehouses)
      - `quantity` (integer) - Quantity being shipped
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated sellers
*/

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  country text NOT NULL DEFAULT 'USA',
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create shipment_items table for tracking which items ship from which warehouse
CREATE TABLE IF NOT EXISTS shipment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  quantity integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add warehouse_id to shipments table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shipments' AND column_name = 'warehouse_id'
  ) THEN
    ALTER TABLE shipments ADD COLUMN warehouse_id uuid REFERENCES warehouses(id);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_warehouses_seller ON warehouses(seller_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment ON shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_order_item ON shipment_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_warehouse ON shipment_items(warehouse_id);

-- Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;

-- Policies for warehouses
CREATE POLICY "Sellers can view own warehouses"
  ON warehouses FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

CREATE POLICY "Sellers can create own warehouses"
  ON warehouses FOR INSERT
  TO authenticated
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update own warehouses"
  ON warehouses FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can delete own warehouses"
  ON warehouses FOR DELETE
  TO authenticated
  USING (seller_id = auth.uid());

-- Policies for shipment_items
CREATE POLICY "Users can view shipment items"
  ON shipment_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shipments s
      WHERE s.id = shipment_items.shipment_id
      AND (s.seller_id = auth.uid() OR EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = s.order_id AND o.buyer_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Sellers can create shipment items"
  ON shipment_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shipments s
      WHERE s.id = shipment_items.shipment_id
      AND s.seller_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can update shipment items"
  ON shipment_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shipments s
      WHERE s.id = shipment_items.shipment_id
      AND s.seller_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shipments s
      WHERE s.id = shipment_items.shipment_id
      AND s.seller_id = auth.uid()
    )
  );
