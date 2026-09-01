-- Automated Table Reset & Creation Script (With Foreign Keys)

-- Drop existing tables in reverse order
DROP TABLE IF EXISTS public."payments" CASCADE;
DROP TABLE IF EXISTS public."shipment_items" CASCADE;
DROP TABLE IF EXISTS public."shipments" CASCADE;
DROP TABLE IF EXISTS public."messages" CASCADE;
DROP TABLE IF EXISTS public."order_items" CASCADE;
DROP TABLE IF EXISTS public."orders" CASCADE;
DROP TABLE IF EXISTS public."wishlist" CASCADE;
DROP TABLE IF EXISTS public."cart" CASCADE;
DROP TABLE IF EXISTS public."buyer_discounts" CASCADE;
DROP TABLE IF EXISTS public."buyer_payment_methods" CASCADE;
DROP TABLE IF EXISTS public."buyer_addresses" CASCADE;
DROP TABLE IF EXISTS public."product_variants" CASCADE;
DROP TABLE IF EXISTS public."products" CASCADE;
DROP TABLE IF EXISTS public."buyer_credit_terms" CASCADE;
DROP TABLE IF EXISTS public."warehouses" CASCADE;
DROP TABLE IF EXISTS public."promotions" CASCADE;
DROP TABLE IF EXISTS public."brands" CASCADE;
DROP TABLE IF EXISTS public."categories" CASCADE;
DROP TABLE IF EXISTS public."user_profiles" CASCADE;

-- Create new tables
CREATE TABLE public."user_profiles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT,
  "first_name" TEXT,
  "last_name" TEXT,
  "role" TEXT,
  "company_name" TEXT,
  "logo_url" TEXT,
  "business_name" TEXT,
  "seller_id" UUID,
  "is_active" BOOLEAN,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "phone" TEXT,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "zip_code" TEXT,
  "country" TEXT,
  "address_line2" TEXT
);

CREATE TABLE public."categories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "seller_id" UUID REFERENCES public."user_profiles"("id") ON DELETE SET NULL,
  "name" TEXT,
  "description" TEXT,
  "is_active" BOOLEAN,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public."brands" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "seller_id" UUID REFERENCES public."user_profiles"("id") ON DELETE SET NULL,
  "name" TEXT,
  "description" TEXT,
  "logo_url" TEXT,
  "is_active" BOOLEAN,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."promotions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public."warehouses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "seller_id" UUID REFERENCES public."user_profiles"("id") ON DELETE SET NULL,
  "name" TEXT,
  "address_line1" TEXT,
  "city" TEXT,
  "state" TEXT,
  "postal_code" TEXT,
  "country" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "is_active" BOOLEAN,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "company_name" TEXT,
  "contact_person" TEXT,
  "address_line2" TEXT
);

CREATE TABLE IF NOT EXISTS public."buyer_credit_terms" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public."products" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "seller_id" UUID REFERENCES public."user_profiles"("id") ON DELETE SET NULL,
  "category_id" UUID REFERENCES public."categories"("id") ON DELETE SET NULL,
  "brand_id" UUID REFERENCES public."brands"("id") ON DELETE SET NULL,
  "sku" TEXT,
  "name" TEXT,
  "description" TEXT,
  "unit_price" NUMERIC,
  "cost_price" NUMERIC,
  "stock_quantity" BIGINT,
  "min_order_quantity" BIGINT,
  "max_order_quantity" BIGINT,
  "unit_of_measure" TEXT,
  "image_url" TEXT,
  "is_visible" BOOLEAN,
  "is_active" BOOLEAN,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "parent_sku" TEXT,
  "has_variants" BOOLEAN,
  "features" TEXT,
  "specifications" TEXT,
  "vendor_name" TEXT,
  "promotion_id" TEXT,
  "original_price" NUMERIC,
  "discount_price" TEXT
);

CREATE TABLE public."product_variants" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" UUID REFERENCES public."products"("id") ON DELETE SET NULL,
  "sku" TEXT,
  "name" TEXT,
  "variant_attributes" JSONB,
  "unit_price" NUMERIC,
  "cost_price" NUMERIC,
  "stock_quantity" BIGINT,
  "image_url" TEXT,
  "is_active" BOOLEAN,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "min_order_quantity" BIGINT,
  "max_order_quantity" BIGINT,
  "unit_of_measure" TEXT
);

CREATE TABLE public."buyer_addresses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "buyer_id" UUID REFERENCES public."user_profiles"("id") ON DELETE SET NULL,
  "full_name" TEXT,
  "phone" TEXT,
  "address_line1" TEXT,
  "address_line2" TEXT,
  "city" TEXT,
  "state" TEXT,
  "postal_code" TEXT,
  "country" TEXT,
  "is_default" BOOLEAN,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "address_type" TEXT,
  "street_address" TEXT
);

CREATE TABLE IF NOT EXISTS public."buyer_payment_methods" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."buyer_discounts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."cart" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public."wishlist" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "buyer_id" UUID REFERENCES public."user_profiles"("id") ON DELETE SET NULL,
  "product_id" UUID REFERENCES public."products"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."order_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."shipments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public."shipment_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "shipment_id" UUID REFERENCES public."shipments"("id") ON DELETE SET NULL,
  "order_item_id" UUID REFERENCES public."order_items"("id") ON DELETE SET NULL,
  "warehouse_id" UUID REFERENCES public."warehouses"("id") ON DELETE SET NULL,
  "quantity" BIGINT,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."payments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

