import { MetadataRoute } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase';

const BATCH_SIZE = 5000;
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://visamatrix.vercel.app';

export const revalidate = 86400; // 24 hours

export async function generateSitemaps() {
    const supabase = getSupabaseServerClient();
    const { count, error } = await supabase
        .from('requirements')
        .select('*', { count: 'exact', head: true });

    if (error || count === null) {
        console.error('Sitemap Count Error:', error);
        return [{ id: 0 }]; // Fallback safe
    }

    const numSitemaps = Math.ceil(count / BATCH_SIZE);
    
    // Generiamo gli ID da 0 in poi (0 a numSitemaps-1)
    return Array.from({ length: numSitemaps }, (_, i) => ({ id: i }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
    const supabase = getSupabaseServerClient();
    
    // Assicuriamoci che id sia un numero (viene passato come parametro)
    const chunkId = Number(id) || 0;
    const start = chunkId * BATCH_SIZE;
    const end = start + BATCH_SIZE - 1;

    let routes: MetadataRoute.Sitemap = [];

    // Se stiamo generando il primissimo chunk, aggiungiamo anche le rotte statiche all'inizio
    if (chunkId === 0) {
        routes.push({
            url: `${BASE_URL}/`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1.0,
        });
        routes.push({
            url: `${BASE_URL}/visa-search`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.9,
        });
    }

    // Aggiungiamo le rotte dinamiche (Visa requirements)
    const { data: requirements, error } = await supabase
        .from('requirements')
        .select(`
            updated_at,
            passports!inner(slug),
            countries!inner(slug)
        `)
        .order('id', { ascending: true })
        .range(start, end);

    if (error || !requirements) {
        console.error('Sitemap Chunk Error:', error);
        return routes;
    }

    const dynamicRoutes: MetadataRoute.Sitemap = requirements.map((req: any) => ({
        url: `${BASE_URL}/visa/${req.passports.slug}/${req.countries.slug}`,
        lastModified: new Date(req.updated_at),
        changeFrequency: 'weekly',
        priority: 0.8,
    }));

    return [...routes, ...dynamicRoutes];
}
