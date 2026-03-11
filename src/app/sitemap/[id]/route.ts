import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

const BATCH_SIZE = 5000;
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://visamatrix.vercel.app';

export const revalidate = 86400;

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    
    const cleanId = id.replace('.xml', '');

    const baseUrl = BASE_URL;

    // Gestione rotte statiche
    if (cleanId === 'static') {
        const staticUrls = [
            { loc: `${baseUrl}/`, lastmod: new Date().toISOString(), priority: '1.0' },
            { loc: `${baseUrl}/visa-search`, lastmod: new Date().toISOString(), priority: '0.9' },
        ];

        const urlEntries = staticUrls.map(url => `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlEntries}
</urlset>`;

        return new NextResponse(xml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate',
            },
        });
    }

    const chunkId = Number(cleanId) || 0;
    const start = chunkId * BATCH_SIZE;
    const end = start + BATCH_SIZE - 1;

    const supabase = getSupabaseServerClient();

    const { data: routes, error } = await supabase
        .from('requirements')
        .select('updated_at, passports!inner(slug), countries!inner(slug)')
        .order('id', { ascending: true })
        .range(start, end);

    if (error || !routes) {
        return new NextResponse('Error generating sitemap chunk', { status: 500 });
    }

    const urlEntries = routes.map((route: any) => `
  <url>
    <loc>${baseUrl}/visa/${route.passports.slug}/${route.countries.slug}</loc>
    <lastmod>${new Date(route.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlEntries}
</urlset>`;

    return new NextResponse(xml, {
        status: 200,
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate',
        },
    });
}
