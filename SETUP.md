# B2B Ordering Platform - Setup Guide

## Database Setup

The database schema has been created in `supabase/migrations/001_initial_schema.sql`. You need to apply this migration to your Supabase database.

### Step 1: Apply the Migration

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and execute the SQL

### Step 2: Create an Admin User

To get started, you need to create an admin user. Run this SQL in your Supabase SQL Editor:

```sql
-- Create admin user (replace with your email and password)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  'admin@example.com',  -- CHANGE THIS
  crypt('YourPassword123!', gen_salt('bf')),  -- CHANGE THIS
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated'
) RETURNING id;

-- Use the ID from the previous query to create the profile
INSERT INTO public.user_profiles (
  id,
  email,
  first_name,
  last_name,
  role,
  is_active
) VALUES (
  'YOUR_USER_ID_FROM_ABOVE',  -- CHANGE THIS to the UUID returned above
  'admin@example.com',  -- CHANGE THIS to match above
  'Admin',
  'User',
  'admin',
  true
);
```

**IMPORTANT:** Replace the email, password, and user ID with your actual values.

### Alternative: Quick Admin Setup

If the above doesn't work due to authentication issues, you can manually create an admin user through the Supabase dashboard:

1. Go to Authentication → Users
2. Click "Add User"
3. Enter email: `admin@example.com` and a password
4. After creating, copy the user's UUID
5. Go to SQL Editor and run:

```sql
INSERT INTO public.user_profiles (
  id,
  email,
  first_name,
  last_name,
  role,
  is_active
) VALUES (
  'PASTE_USER_UUID_HERE',
  'admin@example.com',
  'Admin',
  'User',
  'admin',
  true
);
```

## User Flow

### Admin User
1. Login with admin credentials
2. Onboard sellers by clicking "Onboard Seller"
3. Provide seller details (name, email, business name, logo)
4. Seller receives invitation email

### Seller User
1. Login with credentials provided by admin
2. View dashboard with real-time analytics
3. Manage products (add, edit, bulk import/export)
4. Onboard buyers
5. Set buyer-specific discounts and credit terms
6. Manage orders and track status
7. Access promotions, logistics, payments, inventory, and messaging features

### Buyer User
1. Login with credentials provided by seller
2. Browse products with custom pricing (if discounts applied)
3. Add products to cart
4. Place orders
5. Track order status and payments
6. View credit terms

## Features Implemented

### Fully Functional
- ✅ User authentication (Admin, Seller, Buyer)
- ✅ Admin dashboard with seller onboarding
- ✅ Seller dashboard with real-time analytics
- ✅ Products management (grid/list view, import/export, bulk edit)
- ✅ Orders management with status tracking
- ✅ Buyers management with custom discounts and credit terms
- ✅ Buyer portal with product browsing and cart

### Placeholder Pages (Ready for Implementation)
- 🔄 Promotions management
- 🔄 Logistics integration
- 🔄 Payments & Invoices tracking
- 🔄 Inventory management
- 🔄 Messaging system

## Technology Stack

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Authentication:** Supabase Auth
- **Database:** PostgreSQL with Row Level Security

## Security Features

- Row Level Security (RLS) enabled on all tables
- Admins can access all data
- Sellers can only access their own data and their buyers
- Buyers can only access their own data and their seller's products
- Proper authentication checks on all operations

## Product Import Template

The CSV template for bulk product import includes these columns:
- SKU
- Product Name
- Description
- Category
- Brand
- Unit Price
- Cost Price
- Stock Quantity
- Min Order Qty
- Max Order Qty
- Unit of Measure
- Image URL
- Is Visible (TRUE/FALSE)
- Is Active (TRUE/FALSE)

Download the template from the Products page using the "Download Template" button.
