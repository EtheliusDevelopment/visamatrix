import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function test() {
    const { count, error: countErr } = await supabase
        .from('requirements')
        .select('*', { count: 'exact', head: true });

    console.log('Count:', count, countErr);

    const start = 0 * 5000;
    const end = start + 5000 - 1;

    const { data: routes, error } = await supabase
        .from('requirements')
        .select(`
            updated_at,
            passports!inner(slug),
            countries!inner(slug)
        `)
        .order('id', { ascending: true })
        .range(start, end)
        .limit(5);

    console.log('Routes:', routes, error);
}

test();
