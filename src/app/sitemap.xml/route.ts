import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

const BATCH_SIZE = 5000;
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://visamatrix.vercel.app';

export const revalidate = 86400;
export const dynamic = 'force-static';
export const runtime = 'edge';

export async function GET() {
    const baseUrl = BASE_URL;
    
    const supabase = getSupabaseServerClient();

    const { count, error } = await supabase
        .from('requirements')
        .select('*', { count: 'exact', head: true });

    if (error || count === null) {
        console.error('Sitemap Error:', error);
        return new NextResponse('Error generating sitemap', { status: 500 });
    }

    const numSitemaps = Math.ceil(count / BATCH_SIZE);

    const sitemapEntries = Array.from({ length: numSitemaps }, (_, i) => `
  <sitemap>
    <loc>${baseUrl}/sitemap/${i}.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`).join('');

    const staticEntry = `
  <sitemap>
    <loc>${baseUrl}/sitemap/static.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticEntry}${sitemapEntries}
</sitemapindex>`;

    return new NextResponse(xml, {
        status: 200,
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate',
        },
    });
}
