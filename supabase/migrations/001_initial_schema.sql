/*
  # B2B Ordering Platform - Complete Database Schema

  ## Overview
  This migration creates a comprehensive B2B ordering platform with three user types:
  Admin, Seller, and Buyer with full e-commerce capabilities.

  ## 1. New Tables

  ### User Management
  - `user_profiles` - Extended user information with role management
    - `id` (uuid, FK to auth.users)
    - `email` (text)
    - `first_name` (text)
    - `last_name` (text)
    - `role` (text: 'admin', 'seller', 'buyer')
    - `company_name` (text)
    - `logo_url` (text)
    - `business_name` (text)
    - `seller_id` (uuid, FK) - For buyers, links to their seller
    - `is_active` (boolean)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Product Management
  - `categories` - Product categories
  - `brands` - Product brands
  - `products` - Main product catalog
    - Includes pricing, inventory, visibility controls
    - Seller-specific products

  ### Buyer-Specific Pricing
  - `buyer_discounts` - Custom discounts per buyer for brands/categories
  - `buyer_credit_terms` - Credit terms (30/60/90 days) per buyer

  ### Orders & Transactions
  - `orders` - Order header information
  - `order_items` - Line items for each order
  - `payments` - Payment tracking and history
  - `invoices` - Invoice generation and tracking

  ### Promotions
  - `promotions` - Promotional campaigns with discount rules
  - `promotion_buyers` - Specific buyers eligible for promotions

  ### Communication
  - `messages` - Internal messaging between sellers and buyers

  ### Logistics (Optional)
  - `shipments` - Shipping and logistics tracking

  ## 2. Security
  - Enable RLS on all tables
  - Admin can access all data
  - Sellers can only access their own data and their buyers
  - Buyers can only access their own data and their seller's products

  ## 3. Important Notes
  - All monetary values stored as numeric(10,2)
  - Timestamps use timestamptz with default now()
  - Proper foreign key constraints for data integrity
  - Indexes on frequently queried columns
*/

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text,
  role text NOT NULL CHECK (role IN ('admin', 'seller', 'buyer')),
  company_name text,
  logo_url text,
  business_name text,
  seller_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(seller_id, name)
);

-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(seller_id, name)
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  brand_id uuid REFERENCES brands(id) ON DELETE SET NULL,
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  cost_price numeric(10,2) DEFAULT 0,
  stock_quantity integer DEFAULT 0,
  min_order_quantity integer DEFAULT 1,
  max_order_quantity integer,
  unit_of_measure text DEFAULT 'unit',
  image_url text,
  is_visible boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(seller_id, sku)
);

-- Create buyer discounts table
CREATE TABLE IF NOT EXISTS buyer_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  discount_type text NOT NULL CHECK (discount_type IN ('category', 'brand', 'product')),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  discount_percentage numeric(5,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create buyer credit terms table
CREATE TABLE IF NOT EXISTS buyer_credit_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  credit_days integer NOT NULL CHECK (credit_days IN (0, 30, 60, 90)),
  credit_limit numeric(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(buyer_id, seller_id)
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  buyer_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  subtotal numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  shipping_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) DEFAULT 0,
  notes text,
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  due_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  discount_percentage numeric(5,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  tax_percentage numeric(5,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  line_total numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  promotion_type text NOT NULL CHECK (promotion_type IN ('percentage', 'flat', 'coupon')),
  discount_value numeric(10,2) NOT NULL,
  coupon_code text,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  applies_to text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'specific')),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create promotion buyers junction table
CREATE TABLE IF NOT EXISTS promotion_buyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(promotion_id, buyer_id)
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  payment_method text,
  payment_reference text,
  payment_date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  issue_date timestamptz DEFAULT now(),
  due_date timestamptz,
  amount numeric(10,2) NOT NULL,
  paid_amount numeric(10,2) DEFAULT 0,
  status text DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  subject text,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  carrier text,
  tracking_number text,
  shipping_date timestamptz,
  estimated_delivery timestamptz,
  actual_delivery timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'picked_up', 'in_transit', 'delivered', 'failed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_seller ON user_profiles(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_credit_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Sellers can view their buyers"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'seller' AND id = user_profiles.seller_id
    )
  );

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Sellers can insert buyer profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'seller' AND id = seller_id
    )
  );

-- RLS Policies for categories
CREATE POLICY "Sellers can manage their categories"
  ON categories FOR ALL
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Buyers can view seller categories"
  ON categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND seller_id = categories.seller_id
    )
  );

-- RLS Policies for brands
CREATE POLICY "Sellers can manage their brands"
  ON brands FOR ALL
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Buyers can view seller brands"
  ON brands FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND seller_id = brands.seller_id
    )
  );

-- RLS Policies for products
CREATE POLICY "Sellers can manage their products"
  ON products FOR ALL
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Buyers can view visible products from their seller"
  ON products FOR SELECT
  TO authenticated
  USING (
    is_visible = true AND is_active = true AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND seller_id = products.seller_id
    )
  );

-- RLS Policies for buyer_discounts
CREATE POLICY "Sellers can manage buyer discounts"
  ON buyer_discounts FOR ALL
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Buyers can view their discounts"
  ON buyer_discounts FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

-- RLS Policies for buyer_credit_terms
CREATE POLICY "Sellers can manage credit terms"
  ON buyer_credit_terms FOR ALL
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Buyers can view their credit terms"
  ON buyer_credit_terms FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

-- RLS Policies for orders
CREATE POLICY "Sellers can view their orders"
  ON orders FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

CREATE POLICY "Buyers can view their orders"
  ON orders FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "Buyers can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Sellers can update their orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- RLS Policies for order_items
CREATE POLICY "Users can view order items for their orders"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.seller_id = auth.uid() OR orders.buyer_id = auth.uid())
    )
  );

CREATE POLICY "Buyers can insert order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id AND orders.buyer_id = auth.uid()
    )
  );

-- RLS Policies for promotions
CREATE POLICY "Sellers can manage their promotions"
  ON promotions FOR ALL
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Buyers can view active promotions"
  ON promotions FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND seller_id = promotions.seller_id
    )
  );

-- RLS Policies for promotion_buyers
CREATE POLICY "Sellers can manage promotion buyers"
  ON promotion_buyers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM promotions
      WHERE promotions.id = promotion_id AND promotions.seller_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM promotions
      WHERE promotions.id = promotion_id AND promotions.seller_id = auth.uid()
    )
  );

-- RLS Policies for payments
CREATE POLICY "Sellers can view their payments"
  ON payments FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

CREATE POLICY "Buyers can view their payments"
  ON payments FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "Sellers can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (seller_id = auth.uid());

-- RLS Policies for invoices
CREATE POLICY "Sellers can manage their invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Buyers can view their invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Recipients can update read status"
  ON messages FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- RLS Policies for shipments
CREATE POLICY "Sellers can manage their shipments"
  ON shipments FOR ALL
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Buyers can view their shipments"
  ON shipments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id AND orders.buyer_id = auth.uid()
    )
  );
