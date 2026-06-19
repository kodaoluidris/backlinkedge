// One-time data migration: copy existing rows from the old SQLite database
// (data/app.db) into MySQL. Run once after switching to MySQL:
//
//   npm run migrate-sqlite
//
// Requires Node 22.5+ (for the built-in node:sqlite reader). Safe to re-run —
// inserts are idempotent on unique keys (stripe ids / slug).

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const dbApi = require('../db');

async function main() {
  const sqlitePath = path.join(__dirname, '..', 'data', 'app.db');
  if (!fs.existsSync(sqlitePath)) {
    console.log('No data/app.db found — nothing to migrate.');
    process.exit(0);
  }

  let DatabaseSync;
  try {
    ({ DatabaseSync } = require('node:sqlite'));
  } catch (e) {
    console.error('This migration needs Node 22.5+ (node:sqlite) to read the old DB.');
    console.error('Run it once with e.g. `nvm use 22` then `npm run migrate-sqlite`.');
    process.exit(1);
  }

  const old = new DatabaseSync(sqlitePath);
  await dbApi.init();

  const tableExists = (name) =>
    !!old.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);

  let counts = { customers: 0, subscriptions: 0, transactions: 0, blogs: 0 };

  if (tableExists('customers')) {
    for (const c of old.prepare('SELECT * FROM customers').all()) {
      await dbApi.upsertCustomer({ stripeCustomerId: c.stripe_customer_id, email: c.email, name: c.name });
      counts.customers++;
    }
  }

  if (tableExists('subscriptions')) {
    for (const s of old.prepare('SELECT * FROM subscriptions').all()) {
      await dbApi.upsertSubscription({
        stripeSubscriptionId: s.stripe_subscription_id,
        stripeCustomerId: s.stripe_customer_id,
        email: s.email, planId: s.plan_id, planName: s.plan_name,
        amount: s.amount, currency: s.currency, status: s.status,
        currentPeriodEnd: s.current_period_end
      });
      counts.subscriptions++;
    }
  }

  if (tableExists('transactions')) {
    for (const t of old.prepare('SELECT * FROM transactions').all()) {
      await dbApi.recordTransaction({
        stripeEventId: t.stripe_event_id, stripeInvoiceId: t.stripe_invoice_id,
        stripeCustomerId: t.stripe_customer_id, email: t.email, name: t.name,
        planId: t.plan_id, planName: t.plan_name, amount: t.amount,
        currency: t.currency, status: t.status
      });
      counts.transactions++;
    }
  }

  if (tableExists('blogs')) {
    for (const b of old.prepare('SELECT * FROM blogs ORDER BY id ASC').all()) {
      // Insert directly to preserve the original slug exactly.
      await dbApi.run(
        `INSERT IGNORE INTO blogs (slug, title, excerpt, content, image, media_type, author, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          b.slug, b.title, b.excerpt, b.content, b.image,
          b.media_type || 'image', b.author, b.status || 'published',
          b.created_at || null, b.updated_at || null
        ]
      );
      counts.blogs++;
    }
  }

  console.log('Migration complete:', counts);
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
