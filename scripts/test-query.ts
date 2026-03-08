import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function test() {
    console.log('Testing query...');
    const { data, error } = await supabase
        .from('requirements')
        .select(`
      requirement_code,
      allowed_days,
      updated_at,
      passports!inner(country_name, slug),
      countries!inner(name, slug)
    `)
        .eq('passports.slug', 'it-passport')
        .eq('countries.slug', 'destination-us')
        .maybeSingle();

    console.log('Data:', data);
    console.log('Error:', error);
}

test();
