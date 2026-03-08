import { getSupabaseServerClient } from '@/lib/supabase';
import Link from 'next/link';

export const revalidate = 86400;

export default async function Home() {
  const supabase = getSupabaseServerClient();

  const { data: passports } = await supabase
    .from('passports')
    .select('slug, country_name')
    .order('country_name');

  const { data: destinations } = await supabase
    .from('countries')
    .select('slug, name')
    .order('name');

  // Popular routes for the quick links section
  const popularRoutes = [
    { passport: 'Italy', passportSlug: 'it-passport', destination: 'United States', destinationSlug: 'destination-us' },
    { passport: 'India', passportSlug: 'in-passport', destination: 'United Kingdom', destinationSlug: 'destination-gb' },
    { passport: 'Brazil', passportSlug: 'br-passport', destination: 'Canada', destinationSlug: 'destination-ca' },
    { passport: 'China', passportSlug: 'cn-passport', destination: 'France', destinationSlug: 'destination-fr' },
    { passport: 'Nigeria', passportSlug: 'ng-passport', destination: 'Germany', destinationSlug: 'destination-de' },
    { passport: 'Japan', passportSlug: 'jp-passport', destination: 'Australia', destinationSlug: 'destination-au' },
  ];

  return (
    <main style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }} className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500 opacity-10 blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1.5 mb-8">
            <span className="text-blue-400 text-sm font-medium">🌍 198 Passports · 227 Destinations · 39,601 Rules</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-black text-white mb-6 leading-tight tracking-tight">
            Do You Need a<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Visa?</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12">
            Instant, accurate visa requirements for every passport and destination in the world.
            No signup. No guesswork. Just the answer.
          </p>

          {/* Search Card */}
          <div className="max-w-3xl mx-auto bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 shadow-2xl">
            <form
              action="/visa-search"
              method="GET"
              className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center"
            >
              <div className="flex-1">
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2 text-left">
                  🛂 My Passport
                </label>
                <select
                  name="passport"
                  required
                  className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="" className="bg-slate-900">Select your passport...</option>
                  {passports?.map((p: any) => (
                    <option key={p.slug} value={p.slug} className="bg-slate-900">{p.country_name}</option>
                  ))}
                </select>
              </div>

              <div className="hidden sm:flex items-end pb-1 text-slate-500 text-2xl font-light">→</div>

              <div className="flex-1">
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2 text-left">
                  🌏 Going To
                </label>
                <select
                  name="destination"
                  required
                  className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="" className="bg-slate-900">Select destination...</option>
                  {destinations?.map((d: any) => (
                    <option key={d.slug} value={d.slug} className="bg-slate-900">{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="sm:self-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold px-8 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-blue-500/25 whitespace-nowrap"
                >
                  Check Now →
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Popular Routes */}
      <div className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="text-center text-slate-400 text-sm font-semibold uppercase tracking-widest mb-8">
          Popular Routes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {popularRoutes.map((route) => (
            <Link
              key={`${route.passportSlug}-${route.destinationSlug}`}
              href={`/visa/${route.passportSlug}/${route.destinationSlug}`}
              className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/40 rounded-2xl p-5 transition-all duration-200 flex items-center gap-4"
            >
              <div className="text-2xl">🗺️</div>
              <div>
                <p className="text-white font-semibold text-sm">{route.passport} → {route.destination}</p>
                <p className="text-slate-500 text-xs mt-0.5 group-hover:text-blue-400 transition-colors">Check requirements →</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Stats Row */}
        <div className="mt-16 grid grid-cols-3 gap-8 text-center border-t border-white/10 pt-12">
          <div>
            <div className="text-3xl font-black text-white">198</div>
            <div className="text-slate-500 text-sm mt-1">Passports</div>
          </div>
          <div>
            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">39,601</div>
            <div className="text-slate-500 text-sm mt-1">Visa Rules</div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">Free</div>
            <div className="text-slate-500 text-sm mt-1">Always</div>
          </div>
        </div>
      </div>
    </main>
  );
}
