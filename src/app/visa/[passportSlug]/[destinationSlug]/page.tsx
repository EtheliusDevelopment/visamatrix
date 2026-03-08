import { getSupabaseServerClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';

// Revalidate Cache every hour (pSEO performance)
export const revalidate = 3600;

interface PageProps {
    params: Promise<{
        passportSlug: string;
        destinationSlug: string;
    }>;
}

export default async function VisaRequirementPage({ params }: PageProps) {
    const { passportSlug, destinationSlug } = await params;

    // Example route slug: it-citizens-visa-requirements-for-us
    // We need to resolve the slugs back to iso2 or query by route_slug if we structured it that way.
    // We'll do a join query using the normalized slugs from passport and destination tables.

    const supabase = getSupabaseServerClient();

    const { data: requirement, error } = await supabase
        .from('requirements')
        .select(`
      requirement_code,
      allowed_days,
      updated_at,
      seo_content,
      passports!inner(country_name, slug),
      countries!inner(name, slug)
    `)
        .eq('passports.slug', passportSlug)
        .eq('countries.slug', destinationSlug)
        .maybeSingle();

    if (error || !requirement) {
        console.error('Database Error or Not Found:', passportSlug, destinationSlug, error);
        notFound();
    }

    const { passports: passport, countries: destination, requirement_code, allowed_days, seo_content } = requirement as any;

    // The Verdict UI Logic
    let verdictColor = 'bg-gray-100 text-gray-800';
    let verdictLabel = requirement_code.toUpperCase();
    let verdictIcon = '📄';

    if (requirement_code === 'visa-free') {
        verdictColor = 'bg-green-100 text-green-800 border-green-200';
        verdictLabel = 'VISA FREE';
        verdictIcon = '✅';
    } else if (requirement_code === 'visa-required') {
        verdictColor = 'bg-red-100 text-red-800 border-red-200';
        verdictLabel = 'VISA REQUIRED';
        verdictIcon = '🛑';
    } else if (requirement_code === 'e-visa' || requirement_code === 'eta') {
        verdictColor = 'bg-blue-100 text-blue-800 border-blue-200';
        if (requirement_code === 'eta') {
            verdictLabel = destination.slug === 'destination-us' ? 'ESTA REQUIRED' : 'eTA REQUIRED';
        } else {
            verdictLabel = 'e-VISA REQUIRED';
        }
        verdictIcon = '🌐';
    } else if (requirement_code === 'voa') {
        verdictColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        verdictLabel = 'VISA ON ARRIVAL';
        verdictIcon = '🛬';
    }

    return (
        <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Header Section */}
                <div className="text-center space-y-4">
                    <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        Do {passport.country_name} Citizens Need a Visa for {destination.name}?
                    </h1>
                    <p className="text-lg text-gray-500">
                        Official 2026 travel requirements and entry rules.
                    </p>
                </div>

                {/* The Verdict Box */}
                <div className="border-2 rounded-xl shadow-lg overflow-hidden bg-white">
                    <div className={`${verdictColor} px-6 py-8 text-center border-b`}>
                        <div className="text-6xl mb-4">{verdictIcon}</div>
                        <h2 className="text-3xl font-bold tracking-tight mb-2">
                            {verdictLabel}
                        </h2>
                        {allowed_days && (
                            <p className="text-xl font-medium opacity-90">
                                Maximum stay: {allowed_days} days
                            </p>
                        )}
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-500">Passport Type</p>
                                <p className="text-lg font-semibold">{passport.country_name} (Ordinary)</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-500">Destination</p>
                                <p className="text-lg font-semibold">{destination.name}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-500">Passport Validity Required</p>
                                <p className="text-lg font-semibold">6 Months (Recommended)</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-500">Data Updated</p>
                                <p className="text-lg font-semibold">{new Date(requirement.updated_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI GENERATED SEO SECTION (Helpful Content) */}
                {seo_content && (
                    <div className="mt-12 space-y-10">
                        {seo_content.guide_html && (
                            <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Application Guide</h2>
                                <div
                                    className="prose prose-blue max-w-none text-gray-600"
                                    dangerouslySetInnerHTML={{ __html: seo_content.guide_html }}
                                />
                            </section>
                        )}

                        {seo_content.faqs && seo_content.faqs.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
                                <div className="space-y-4">
                                    {seo_content.faqs.map((faq: any, idx: number) => (
                                        <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                            <h3 className="text-lg font-bold text-gray-900 mb-2">{faq.question}</h3>
                                            <p className="text-gray-600">{faq.answer}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}

            </div>
        </main>
    );
}
