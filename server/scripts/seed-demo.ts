/**
 * GLC Audit Platform — Demo Seed Script
 *
 * Inserts a complete simulated audit for Hospital Universitari Son Espases
 * (Palma de Mallorca) into Supabase so you can demo all UI pages without
 * running the real AI pipeline.
 *
 * Usage:
 *   cd server
 *   npx tsx scripts/seed-demo.ts --email you@example.com
 *
 * Options:
 *   --email <email>   Assign the demo audit to this Supabase Auth user.
 *                     If the user doesn't exist yet, it will be created.
 *   --no-reset        Keep any existing demo audit (default: reset enabled).
 *
 * Requirements:
 *   - server/.env must contain SUPABASE_URL and SUPABASE_SERVICE_KEY
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { buildSonEspasesData, DEMO_AUDIT_ID } from './data/son-espases';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DEMO_COMPANY_URL = 'https://www.hospitalsonespases.es';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    '\n❌  Missing env vars. Make sure server/.env contains:\n   SUPABASE_URL=...\n   SUPABASE_SERVICE_KEY=...\n'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------
function parseArgs() {
  const args = process.argv.slice(2);
  const emailIdx = args.indexOf('--email');
  const email = emailIdx !== -1 ? args[emailIdx + 1] : null;
  const noReset = args.includes('--no-reset');
  return { email, reset: !noReset };
}

// ---------------------------------------------------------------------------
// Resolve user ID
// ---------------------------------------------------------------------------
async function resolveUserId(email: string | null): Promise<string> {
  if (!email) {
    throw new Error(
      'Missing --email. Provide an existing Supabase Auth user email (or a new one to auto-create).'
    );
  }

  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    throw new Error(
      `Could not list users via Supabase Admin API (${error.message}). Check SUPABASE_SERVICE_KEY.`
    );
  }

  const user = data.users.find((u) => u.email === email);
  if (!user) {
    console.log(`ℹ️   User "${email}" not found. Creating it in Supabase Auth…`);
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      throw new Error(`Could not create Supabase Auth user: ${createErr?.message ?? 'Unknown error'}`);
    }
    console.log(`✅  Created user: ${email} (${created.user.id})`);
    return created.user.id;
  }

  console.log(`✅  Found user: ${email} (${user.id})`);
  return user.id;
}

// ---------------------------------------------------------------------------
// Delete existing demo audit (idempotency)
// ---------------------------------------------------------------------------
async function deleteExistingDemo(userId: string) {
  const { data: existing } = await supabase
    .from('audits')
    .select('id')
    .eq('company_url', DEMO_COMPANY_URL)
    .eq('user_id', userId)
    .limit(1);

  if (existing && existing.length > 0) {
    const id = existing[0].id;
    await supabase.from('audits').delete().eq('id', id);
    console.log(`🗑️   Deleted existing demo audit (${id})`);
  }
}

// ---------------------------------------------------------------------------
// Insert all seed data
// ---------------------------------------------------------------------------
async function insertSeedData(auditId: string, userId: string) {
  const data = buildSonEspasesData(auditId, userId);

  // 1. Audit master
  const { error: auditErr } = await supabase.from('audits').insert(data.audit);
  if (auditErr) throw new Error(`audits: ${auditErr.message}`);
  console.log('  ✓ audits');

  // 2. Recon
  const { error: reconErr } = await supabase.from('audit_recon').insert(data.recon);
  if (reconErr) throw new Error(`audit_recon: ${reconErr.message}`);
  console.log('  ✓ audit_recon');

  // 3. Domains (6 rows)
  const { error: domainsErr } = await supabase.from('audit_domains').insert(data.domains);
  if (domainsErr) throw new Error(`audit_domains: ${domainsErr.message}`);
  console.log(`  ✓ audit_domains (${data.domains.length} rows)`);

  // 4. Strategy
  const { error: stratErr } = await supabase.from('audit_strategy').insert(data.strategy);
  if (stratErr) throw new Error(`audit_strategy: ${stratErr.message}`);
  console.log('  ✓ audit_strategy');

  // 5. Review points
  const { error: reviewErr } = await supabase.from('review_points').insert(data.reviews);
  if (reviewErr) throw new Error(`review_points: ${reviewErr.message}`);
  console.log(`  ✓ review_points (${data.reviews.length} rows)`);

  // 6. Pipeline events (insert in batches to avoid payload limit)
  const BATCH_SIZE = 50;
  for (let i = 0; i < data.events.length; i += BATCH_SIZE) {
    const batch = data.events.slice(i, i + BATCH_SIZE);
    // Remove the id field — bigserial auto-generates it
    const batchWithoutId = batch.map(({ id: _id, ...rest }) => rest);
    const { error: evErr } = await supabase.from('pipeline_events').insert(batchWithoutId);
    if (evErr) throw new Error(`pipeline_events batch ${i}: ${evErr.message}`);
  }
  console.log(`  ✓ pipeline_events (${data.events.length} rows)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n🏥  GLC Demo Seed — Hospital Universitari Son Espases\n');

  const { email, reset } = parseArgs();
  const userId = await resolveUserId(email);

  if (reset) {
    await deleteExistingDemo(userId);
  }

  console.log('\n📥  Inserting seed data…');
  await insertSeedData(DEMO_AUDIT_ID, userId);

  console.log('\n✅  Done!\n');
  console.log('  Open one of these URLs to explore the demo:\n');
  console.log(`  Portfolio:     http://localhost:5173/portfolio`);
  console.log(`  Pipeline log:  http://localhost:5173/pipeline/${DEMO_AUDIT_ID}`);
  console.log(`  Audit detail:  http://localhost:5173/audit/${DEMO_AUDIT_ID}`);
  console.log(`  Report:        http://localhost:5173/reports/${DEMO_AUDIT_ID}`);
  console.log(`  Strategy Lab:  http://localhost:5173/strategy/${DEMO_AUDIT_ID}\n`);
}

main().catch((err) => {
  console.error('\n❌  Seed failed:', err.message);
  process.exit(1);
});
