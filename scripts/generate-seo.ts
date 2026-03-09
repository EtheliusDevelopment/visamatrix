import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment config
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openAiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openAiKey) {
    console.error('Missing required environment variables (.env.local)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openAiKey });

// The maximum number of API calls to make in this run (Checkpoint Limit)
const BATCH_LIMIT = 9000;
// How many API calls to process simultaneously to speed up the engine
const CONCURRENCY = 5;

async function generateSeoContent() {
    console.log(`🤖 VisaMatrix AI Engine Starting... (Limit: ${BATCH_LIMIT} routes)`);
    console.log(`📦 Model: gpt-4.1`);

    // 1. Fetch exactly the routes missing SEO content. 
    // Since we check `seo_content IS NULL`, the database itself acts as our bulletproof checkpoint system.
    let { data: matrixItems, error: fetchErr } = await supabase
        .from('requirements')
        .select(`
            id,
            requirement_code,
            passports!inner(country_name),
            countries!inner(name)
        `)
        .in('requirement_code', ['e-visa', 'eta', 'visa required', 'voa'])
        .is('seo_content', null)
        .limit(BATCH_LIMIT);

    if (fetchErr) {
        console.error('Error fetching matrix:', fetchErr);
        return;
    }

    if (!matrixItems || matrixItems.length === 0) {
        console.log('✅ All routes already have SEO content or no routes match.');
        return;
    }

    console.log(`Found ${matrixItems.length} routes to process. Starting batch in 3 seconds...`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    let processedCount = 0;
    let errorCount = 0;

    // 2. Process in concurrent chunks
    for (let i = 0; i < matrixItems.length; i += CONCURRENCY) {
        const chunk = matrixItems.slice(i, i + CONCURRENCY);

        const promises = chunk.map(async (task) => {
            const passportName = (task.passports as any).country_name;
            const destinationName = (task.countries as any).name;
            let visaType = task.requirement_code;

            // Format visa type for the prompt
            if (visaType === 'eta') {
                if (destinationName === 'United States') {
                    visaType = 'Electronic System for Travel Authorization (ESTA)';
                } else {
                    visaType = 'Electronic Travel Authorization (eTA)';
                }
            }
            else if (visaType === 'e-visa') visaType = 'e-Visa';
            else if (visaType === 'voa') visaType = 'Visa on Arrival';
            else if (visaType === 'visa required') visaType = 'Tourist Visa';

            const prompt = `
            You are an expert travel consultant and SEO writer. 
            Write a highly accurate, short structural guide for ${passportName} citizens applying for an ${visaType} to enter ${destinationName}.
            
            Return the response ONLY as a strict JSON object with the following schema:
            {
                "guide_html": "HTML formatted text summarizing the application process. Keep it under 200 words. Use <h3> tags for sub-sections. Do NOT include html/head/body tags.",
                "faqs": [
                    {
                        "question": "Do citizens of ${passportName} need a visa for ${destinationName}?",
                        "answer": "String answer."
                    },
                    {
                        "question": "How long does the ${visaType} take to process?",
                        "answer": "String answer."
                    }
                ]
            }
            Ensure the response is raw JSON. Do not wrap in markdown code blocks.
            `;

            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-4.1",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" }
                });

                const rawJsonOutput = completion.choices[0]?.message?.content;
                if (!rawJsonOutput) throw new Error('Empty response from OpenAI');

                const seoContent = JSON.parse(rawJsonOutput);

                // 3. Update DB (This immediately creates a checkpoint for this specific route)
                const { error: updateErr } = await supabase
                    .from('requirements')
                    .update({ seo_content: seoContent })
                    .eq('id', task.id);

                if (updateErr) throw updateErr;

                processedCount++;
                console.log(`[${processedCount}/${matrixItems.length}] ✅ Success: ${passportName} -> ${destinationName}`);
            } catch (e: any) {
                errorCount++;
                console.error(`[❌ Error] ${passportName} -> ${destinationName}: ${e.message}`);
            }
        });

        // Wait for the current chunk to finish before starting the next
        await Promise.all(promises);
    }

    console.log(`\n🏁 Engine Run Complete!`);
    console.log(`✅ Processed: ${processedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`Checkpoint saved natively in Supabase. You can safely stop and re-run this script anytime.`);
}

generateSeoContent();
