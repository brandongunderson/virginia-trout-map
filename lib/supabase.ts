import { createClient } from '@supabase/supabase-js';

// Fallback values for development/testing
const DEFAULT_SUPABASE_URL = 'https://wbiuuvzkjkbfrwpirxwg.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiaXV1dnpramtiZnJ3cGlyeHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NTcwMTUsImV4cCI6MjA3ODIzMzAxNX0.Rh0_xQBpscXtxQnZAN0--VAM0bIPlG87YDYeQ4PRD-c';

// Lazy Supabase client creation
let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const supabaseUrl = envUrl || DEFAULT_SUPABASE_URL;
    const supabaseAnonKey = envKey || DEFAULT_SUPABASE_ANON_KEY;
    
    // Debug logging for troubleshooting
    console.log('Supabase client initialization:', {
      envUrl: envUrl || 'UNDEFINED',
      envKey: envKey ? 'SET' : 'UNDEFINED',
      usingUrl: supabaseUrl === DEFAULT_SUPABASE_URL ? 'FALLBACK' : 'ENV',
      usingKey: supabaseAnonKey === DEFAULT_SUPABASE_ANON_KEY ? 'FALLBACK' : 'ENV',
      finalUrl: supabaseUrl,
      finalKey: supabaseAnonKey.substring(0, 50) + '...'
    });
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables are not configured');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  
  return supabaseClient;
}
