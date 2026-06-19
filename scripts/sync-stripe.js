// One-off / repeatable backfill: pull existing data from your Stripe account
// into the local database. Useful to recover payments made before webhooks were
// set up, or to reconcile after downtime.
//
//   npm run sync-stripe
//
require('dotenv').config();

const { stripe, isConfigured } = require('../config/stripe');
const dbApi = require('../db');

async function main() {
  if (!isConfigured) {
    console.error('✗ Stripe is not configured. Add a real STRIPE_SECRET_KEY to .env first.');
    process.exit(1);
  }

  await dbApi.init();
  console.log('Syncing from Stripe (test mode if using sk_test_ keys)…\n');

  /* ---- Customers ---- */
  let customers = 0;
  for await (const c of stripe.customers.list({ limit: 100 })) {
    await dbApi.upsertCustomer({ stripeCustomerId: c.id, email: c.email, name: c.name });
    customers++;
  }
  console.log(`✓ Customers:     ${customers}`);

  /* ---- Subscriptions ---- */
  let subs = 0;
  for await (const s of stripe.subscriptions.list({ status: 'all', limit: 100 })) {
    const item = s.items && s.items.data && s.items.data[0];
    const price = item && item.price;
    await dbApi.upsertSubscription({
      stripeSubscriptionId: s.id,
      stripeCustomerId: typeof s.customer === 'string' ? s.customer : (s.customer && s.customer.id),
      planId: s.metadata && s.metadata.plan_id,
      planName: (s.metadata && s.metadata.plan_name) || (price && price.nickname) || 'Subscription',
      amount: price && price.unit_amount,
      currency: s.currency,
      status: s.status,
      currentPeriodEnd: s.current_period_end
        ? new Date(s.current_period_end * 1000).toISOString()
        : null
    });
    subs++;
  }
  console.log(`✓ Subscriptions: ${subs}`);

  /* ---- Paid invoices → transactions ---- */
  let paid = 0;
  for await (const inv of stripe.invoices.list({ status: 'paid', limit: 100 })) {
    const line = inv.lines && inv.lines.data && inv.lines.data[0];
    const meta = (line && line.metadata && Object.keys(line.metadata).length ? line.metadata : null)
      || (inv.subscription_details && inv.subscription_details.metadata)
      || {};
    await dbApi.recordTransaction({
      stripeInvoiceId: inv.id,
      stripeCustomerId: typeof inv.customer === 'string' ? inv.customer : (inv.customer && inv.customer.id),
      email: inv.customer_email,
      name: inv.customer_name,
      planId: meta.plan_id,
      planName: meta.plan_name || (line && line.description) || 'Subscription',
      amount: inv.amount_paid,
      currency: inv.currency,
      status: 'paid'
    });
    paid++;
  }
  console.log(`✓ Paid invoices: ${paid}`);

  const a = await dbApi.getAnalytics();
  console.log(`\nDone. Local totals → revenue $${(a.totalRevenue / 100).toFixed(2)}, ` +
    `${a.txCount} payments, ${a.activeSubs} active subs.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
