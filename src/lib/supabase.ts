import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'admin' | 'seller' | 'buyer';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  role: UserRole;
  company_name: string | null;
  logo_url: string | null;
  business_name: string | null;
  seller_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
