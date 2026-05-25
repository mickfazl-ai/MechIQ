import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrnrnlhdjdanchzwafwl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ybnJubGhkamRhbmNoendhZndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNzg0MDQsImV4cCI6MjA4NzY1NDQwNH0.0xgX3kvU57uLHbvXzRfnXT0aF4JKqRLxLWIUTpAU-0M';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});
