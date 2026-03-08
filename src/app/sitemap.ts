import { MetadataRoute } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase';

// Revalidate sitemap cache daily (86400 seconds)
export const revalidate = 86400;

// Maximum Google limit is 50,000, we use 5,000 for safe Next.js RAM usage during generation
const BATCH_SIZE = 5000;

export async function generateSitemaps() {
    const supabase = getSupabaseServerClient();

    // Count exact number of rows in the matrix
    const { count, error } = await supabase
        .from('requirements')
        .select('*', { count: 'exact', head: true });

    if (error || count === null) {
        console.error('SITEMAP: Error fetching count for sitemaps', error);
        return [];
    }

    // e.g. 39,600 / 5000 = 8 sitemaps
    const numSitemaps = Math.ceil(count / BATCH_SIZE);

    // Returns [{ id: 0 }, { id: 1 }, ... { id: 7 }]
    // Next.js will auto-generate sitemap.xml (index) pointing to sitemap/0.xml, sitemap/1.xml, etc.
    return Array.from({ length: numSitemaps }, (_, i) => ({ id: i }));
}

export default async function sitemap(props: { id?: number | string }): Promise<MetadataRoute.Sitemap> {
    const supabase = getSupabaseServerClient();

    // Calculate the pagination range for Supabase based on the sitemap chunk ID
    // Next.js might pass `id` strangely, so we explicitly cast it or default to 0
    const sitemapId = Number(props?.id) || 0;
    const start = sitemapId * BATCH_SIZE;
    const end = start + BATCH_SIZE - 1;

    console.log(`SITEMAP: Generating chunk ${sitemapId} for rows ${start} to ${end}`);

    const { data: routes, error } = await supabase
        .from('requirements')
        .select(`
            updated_at,
            passports!inner(slug),
            countries!inner(slug)
        `)
        .order('id', { ascending: true }) // CRITICAL: Ensures stable pagination
        .range(start, end);

    if (error || !routes) {
        console.error(`SITEMAP: Error fetching routes for sitemap ${sitemapId}`, error);
        return [];
    }

    // Default to localhost if environment variable isn't set
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

    return routes.map((route: any) => ({
        url: `${baseUrl}/visa/${route.passports.slug}/${route.countries.slug}`,
        lastModified: new Date(route.updated_at),
        changeFrequency: 'weekly',
        // High priority for visa destinations, medium for visa-free
        priority: 0.8,
    }));
}
