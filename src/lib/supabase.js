import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://alvdnlylkkonowvccblt.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdmRubHlsa2tvbm93dmNjYmx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjIzOTIsImV4cCI6MjA5MzM5ODM5Mn0.fi1qqetGagp7fkSLOOkX5bPYZjPCmm5VJ0UKn8TC2SQ";

export const supabase = createClient(supabaseUrl, supabaseKey);
