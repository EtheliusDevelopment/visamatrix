import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

const BATCH_SIZE = 5000;
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://visamatrix.vercel.app';

export const revalidate = 86400;

export async function GET() {
    const supabase = getSupabaseServerClient();

    const { count, error } = await supabase
        .from('requirements')
        .select('*', { count: 'exact', head: true });

    if (error || count === null) {
        return new NextResponse('Error generating sitemap', { status: 500 });
    }

    const numSitemaps = Math.ceil(count / BATCH_SIZE);

    const sitemapEntries = Array.from({ length: numSitemaps }, (_, i) => `
  <sitemap>
    <loc>${BASE_URL}/sitemap/${i}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapEntries}
</sitemapindex>`;

    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate',
        },
    });
}
