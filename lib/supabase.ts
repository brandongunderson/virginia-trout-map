import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wbiuuvzkjkbfrwpirxwg.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiaXV1dnpramtiZnJ3cGlyeHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NTcwMTUsImV4cCI6MjA3ODIzMzAxNX0.Rh0_xQBpscXtxQnZAN0--VAM0bIPlG87YDYeQ4PRD-c';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
