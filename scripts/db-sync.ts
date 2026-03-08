import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Open Source Dataset URL (Feb 2024 structured format)
const DATASET_URL = 'https://raw.githubusercontent.com/ilyankou/passport-index-dataset/master/passport-index-tidy-iso2.csv';

// Known territories/passports that might cause issues or need normalization
const normalizeCountryName = (name: string) => name.trim();
const generateSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function run() {
    console.log(`\n🚀 Starting VisaMatrix DB Sync`);
    console.log(`📥 Fetching Open Source Visa Dataset...`);

    try {
        const res = await fetch(DATASET_URL);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const text = await res.text();
        const lines = text.split('\n').filter(l => l.trim().length > 0);

        console.log(`✅ Fetched ${lines.length - 1} records (rows). Processing...`);

        // Track unique countries and passports to batch insert
        const uniqueCountries = new Map<string, any>();
        const uniquePassports = new Map<string, any>();
        const requirementsData: any[] = [];

        // Skip header
        for (let i = 1; i < lines.length; i++) {
            // The file passport-index-tidy-iso2.csv format is: Passport, Destination, Requirement
            const columns = lines[i].split(',');
            if (columns.length < 3) continue;

            const passportCode = columns[0].trim();
            const destinationCode = columns[1].trim();
            const rawRequirement = columns[2].trim();

            // Validate row
            if (!passportCode || !destinationCode || !rawRequirement) continue;

            // Build unique sets
            if (!uniqueCountries.has(destinationCode)) {
                uniqueCountries.set(destinationCode, {
                    iso2_code: destinationCode,
                    name: destinationCode, // Will be updated later if needed
                    slug: `destination-${destinationCode.toLowerCase()}`
                });
            }

            if (!uniqueCountries.has(passportCode)) {
                uniqueCountries.set(passportCode, {
                    iso2_code: passportCode,
                    name: passportCode,
                    slug: `issuer-${passportCode.toLowerCase()}`
                });
            }

            if (!uniquePassports.has(passportCode)) {
                uniquePassports.set(passportCode, {
                    iso2_code: passportCode,
                    country_name: passportCode,
                    slug: `${passportCode.toLowerCase()}-passport`
                });
            }

            // Parse Requirement
            let reqCode = rawRequirement;
            let days = null;

            if (!isNaN(Number(rawRequirement))) {
                reqCode = 'visa-free';
                days = Number(rawRequirement);
            } else if (rawRequirement === 'eTA') {
                reqCode = 'eta';
            } else if (rawRequirement === 'e-visa') {
                reqCode = 'e-visa';
            } else if (rawRequirement === 'VOA') {
                reqCode = 'voa';
            } else if (rawRequirement === 'VR') {
                reqCode = 'visa-required';
            } else if (rawRequirement === 'covid') {
                reqCode = 'banned-covid';
            }

            // pSEO Slug (critical for the matrix pages)
            const routeSlug = `${passportCode.toLowerCase()}-citizens-visa-requirements-for-${destinationCode.toLowerCase()}`;

            requirementsData.push({
                passport_iso2: passportCode,
                destination_iso2: destinationCode,
                requirement_code: reqCode,
                allowed_days: days,
                route_slug: routeSlug
            });
        }

        console.log(`\n🧩 Discovered ${uniqueCountries.size} unique territories/countries.`);
        console.log(`🧩 Discovered ${uniquePassports.size} unique passports.`);
        console.log(`🧩 Prepared ${requirementsData.length} relation matrices.\n`);

        // Phase 1: Insert Countries
        console.log('💾 UPSERTING Countries (batch)...');
        const countriesArray = Array.from(uniqueCountries.values());
        // Simple batching to avoid Payload limits
        for (let i = 0; i < countriesArray.length; i += 50) {
            const batch = countriesArray.slice(i, i + 50);
            const { error } = await supabase.from('countries').upsert(batch, { onConflict: 'iso2_code' });
            if (error) console.error('Error inserting countries batch:', error);
        }

        // Phase 2: Insert Passports
        console.log('💾 UPSERTING Passports...');
        const passportsArray = Array.from(uniquePassports.values());
        for (let i = 0; i < passportsArray.length; i += 50) {
            const batch = passportsArray.slice(i, i + 50);
            const { error } = await supabase.from('passports').upsert(batch, { onConflict: 'iso2_code' });
            if (error) console.error('Error inserting passports batch:', error);
        }

        // Phase 3: Insert The Matrix (Requirements)
        console.log('💾 UPSERTING The Visa Requirements Matrix (this may take a minute).........');
        let successCount = 0;
        let failCount = 0;

        // Massive batch insert
        const batchSize = 1000;
        for (let i = 0; i < requirementsData.length; i += batchSize) {
            const batch = requirementsData.slice(i, i + batchSize);
            const { error } = await supabase.from('requirements').upsert(batch, {
                onConflict: 'passport_iso2, destination_iso2'
            });

            if (error) {
                console.warn(`⚠️ Batch error near row ${i}:`, error.message);
                failCount++;
            } else {
                successCount += batch.length;
            }
            process.stdout.write(`\rProgress: ${Math.min(i + batchSize, requirementsData.length)} / ${requirementsData.length}`);
        }

        console.log(`\n\n🎉 Sync Complete!`);
        console.log(`✅ Successfully inserted/updated ${successCount} matrix combinations.`);
        if (failCount > 0) console.log(`⚠️ ${failCount} batches had warnings/errors.`);

    } catch (e) {
        console.error('Fatal sync error:', e);
    }
}

run();
