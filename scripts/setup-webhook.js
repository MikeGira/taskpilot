#!/usr/bin/env node
/**
 * TaskPilot — Stripe webhook setup script
 *
 * Finds the TaskPilot webhook endpoint in your Stripe account, corrects the
 * URL if it is wrong, and replaces the event list with only the events the
 * app actually handles.
 *
 * Usage (run from project root):
 *   npm run setup:webhook           # current events only
 *   npm run setup:webhook -- --pro  # include Pro subscription events (future)
 *
 * Reads STRIPE_SECRET_KEY from .env automatically via Node --env-file.
 */

const Stripe = require('stripe');

// ── Events the app handles ────────────────────────────────────────────────────

const EVENTS_BASE = [
  'checkout.session.completed',
];

// Add these when the Pro subscription tier is live
const EVENTS_PRO = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
];

// ── Config ────────────────────────────────────────────────────────────────────

const isPro     = process.argv.includes('--pro');
const wantedEvents = isPro ? EVENTS_PRO : EVENTS_BASE;
const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL || 'https://taskpilot-umber.vercel.app';
const correctUrl = `${siteUrl}/api/webhook/stripe`;

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error('Error: STRIPE_SECRET_KEY is not set. Add it to .env or pass it inline.');
    process.exit(1);
  }

  const mode = secretKey.startsWith('sk_live') ? 'LIVE' : 'TEST';
  console.log(`\nStripe mode : ${mode}`);
  console.log(`Target URL  : ${correctUrl}`);
  console.log(`Events      : ${wantedEvents.join(', ')}\n`);

  const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });

  // List all webhook endpoints
  const { data: endpoints } = await stripe.webhookEndpoints.list({ limit: 100 });

  // Find by exact correct URL first, then by any taskpilot URL (wrong path case)
  let endpoint =
    endpoints.find(e => e.url === correctUrl) ||
    endpoints.find(e => e.url.includes('taskpilot'));

  if (!endpoint) {
    console.log('No TaskPilot webhook found. Available endpoints:');
    if (endpoints.length === 0) {
      console.log('  (none)');
    } else {
      endpoints.forEach(e => console.log(`  ${e.id}  ${e.url}  [${e.status}]`));
    }
    console.log(`\nCreate a webhook manually in Stripe pointing to:\n  ${correctUrl}`);
    process.exit(1);
  }

  console.log(`Found webhook : ${endpoint.id}`);
  console.log(`  URL         : ${endpoint.url}`);
  console.log(`  Status      : ${endpoint.status}`);
  console.log(`  Events (${String(endpoint.enabled_events.length).padStart(2)}) : ${endpoint.enabled_events.join(', ') || '(none)'}`);

  // Determine what needs changing
  const urlNeedsfix    = endpoint.url !== correctUrl;
  const eventsNeedFix  = JSON.stringify([...endpoint.enabled_events].sort()) !==
                         JSON.stringify([...wantedEvents].sort());

  if (!urlNeedsfix && !eventsNeedFix) {
    console.log('\nWebhook is already correctly configured. Nothing to do.');
    return;
  }

  const updates = {};
  if (urlNeedsfix) {
    console.log(`\nFixing URL   : ${endpoint.url} → ${correctUrl}`);
    updates.url = correctUrl;
  }
  if (eventsNeedFix) {
    console.log(`Fixing events: ${endpoint.enabled_events.length} events → ${wantedEvents.length} event(s)`);
    updates.enabled_events = wantedEvents;
  }

  const updated = await stripe.webhookEndpoints.update(endpoint.id, updates);

  console.log('\nWebhook updated successfully:');
  console.log(`  URL    : ${updated.url}`);
  console.log(`  Events : ${updated.enabled_events.join(', ')}`);

  if (urlNeedsfix) {
    console.log(`
IMPORTANT — update STRIPE_WEBHOOK_SECRET in Vercel:
  1. Go to Stripe Dashboard → Developers → Webhooks → ${updated.id}
  2. Reveal the signing secret (whsec_...)
  3. Update STRIPE_WEBHOOK_SECRET in Vercel → Settings → Environment Variables
  4. Redeploy (or push any commit to trigger auto-deploy)
`);
  } else {
    console.log('\nNo URL change — STRIPE_WEBHOOK_SECRET is unchanged. No Vercel update needed.');
  }
}

main().catch(err => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
