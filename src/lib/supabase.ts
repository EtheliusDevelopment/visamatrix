import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Simplified client for Server Components (read-only for pSEO)
export const getSupabaseServerClient = () => {
    return createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false
        }
    });
};
