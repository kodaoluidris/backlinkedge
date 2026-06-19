// Database layer — uses Node's built-in SQLite (node:sqlite).
// Zero external/native dependencies; data lives in ./data/app.db

const path = require('path');
const fs = require('fs');

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch (err) {
  console.error('\n  ✗ This app requires Node.js 22.5+ for the built-in "node:sqlite" module.');
  console.error(`    You are running ${process.version}.`);
  console.error('    Fix: switch Node versions, e.g.  nvm use 22   (or 24/25), then retry.\n');
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'app.db'));

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS customers (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    stripe_customer_id  TEXT UNIQUE,
    email               TEXT,
    name                TEXT,
    created_at          TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    stripe_subscription_id  TEXT UNIQUE,
    stripe_customer_id      TEXT,
    email                   TEXT,
    plan_id                 TEXT,
    plan_name               TEXT,
    amount                  INTEGER,        -- cents
    currency                TEXT,
    status                  TEXT,           -- active, canceled, past_due, ...
    current_period_end      TEXT,
    created_at              TEXT DEFAULT (datetime('now')),
    updated_at              TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    stripe_event_id     TEXT,
    stripe_invoice_id   TEXT UNIQUE,
    stripe_customer_id  TEXT,
    email               TEXT,
    name                TEXT,
    plan_id             TEXT,
    plan_name           TEXT,
    amount              INTEGER,            -- cents
    currency            TEXT,
    status              TEXT,               -- paid, refunded, failed
    created_at          TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at);
  CREATE INDEX IF NOT EXISTS idx_sub_status ON subscriptions(status);

  CREATE TABLE IF NOT EXISTS blogs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT UNIQUE,
    title       TEXT NOT NULL,
    excerpt     TEXT,
    content     TEXT,
    image       TEXT,                       -- /uploads/... path or external URL (image OR video)
    media_type  TEXT DEFAULT 'image',        -- image | video
    author      TEXT,
    status      TEXT DEFAULT 'published',   -- published | draft
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_blog_status ON blogs(status);
`);

// ── Migrations for databases created before a column existed ──
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn('blogs', 'media_type', "TEXT DEFAULT 'image'");

/* ───────────────────────── Writers ───────────────────────── */

function upsertCustomer({ stripeCustomerId, email, name }) {
  db.prepare(`
    INSERT INTO customers (stripe_customer_id, email, name)
    VALUES (?, ?, ?)
    ON CONFLICT(stripe_customer_id) DO UPDATE SET
      email = COALESCE(excluded.email, email),
      name  = COALESCE(excluded.name, name)
  `).run(stripeCustomerId, email || null, name || null);
}

function upsertSubscription(s) {
  db.prepare(`
    INSERT INTO subscriptions
      (stripe_subscription_id, stripe_customer_id, email, plan_id, plan_name,
       amount, currency, status, current_period_end, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(stripe_subscription_id) DO UPDATE SET
      status             = excluded.status,
      current_period_end = excluded.current_period_end,
      plan_id            = COALESCE(excluded.plan_id, plan_id),
      plan_name          = COALESCE(excluded.plan_name, plan_name),
      amount             = COALESCE(excluded.amount, amount),
      updated_at         = datetime('now')
  `).run(
    s.stripeSubscriptionId, s.stripeCustomerId, s.email || null,
    s.planId || null, s.planName || null, s.amount || null,
    s.currency || 'usd', s.status, s.currentPeriodEnd || null
  );
}

// Returns true if inserted, false if it was a duplicate invoice (idempotent).
function recordTransaction(t) {
  const res = db.prepare(`
    INSERT OR IGNORE INTO transactions
      (stripe_event_id, stripe_invoice_id, stripe_customer_id, email, name,
       plan_id, plan_name, amount, currency, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    t.stripeEventId || null, t.stripeInvoiceId || null, t.stripeCustomerId || null,
    t.email || null, t.name || null, t.planId || null, t.planName || null,
    t.amount || 0, t.currency || 'usd', t.status || 'paid'
  );
  return res.changes > 0;
}

/* ───────────────────────── Readers ───────────────────────── */

function listTransactions({ limit = 100, offset = 0 } = {}) {
  return db.prepare(`
    SELECT * FROM transactions ORDER BY datetime(created_at) DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

function listSubscriptions() {
  return db.prepare(`
    SELECT * FROM subscriptions ORDER BY datetime(updated_at) DESC
  `).all();
}

function getAnalytics() {
  const totalRevenue = db.prepare(
    `SELECT COALESCE(SUM(amount),0) AS v FROM transactions WHERE status='paid'`
  ).get().v;

  const txCount = db.prepare(
    `SELECT COUNT(*) AS v FROM transactions WHERE status='paid'`
  ).get().v;

  const activeSubs = db.prepare(
    `SELECT COUNT(*) AS v FROM subscriptions WHERE status='active'`
  ).get().v;

  // MRR = sum of active subscription amounts
  const mrr = db.prepare(
    `SELECT COALESCE(SUM(amount),0) AS v FROM subscriptions WHERE status='active'`
  ).get().v;

  const customers = db.prepare(`SELECT COUNT(*) AS v FROM customers`).get().v;

  const byPlan = db.prepare(`
    SELECT plan_name AS plan, COUNT(*) AS count, COALESCE(SUM(amount),0) AS revenue
    FROM transactions WHERE status='paid'
    GROUP BY plan_name ORDER BY revenue DESC
  `).all();

  // Revenue per day for the last 30 days (for the chart)
  const daily = db.prepare(`
    SELECT date(created_at) AS day, COALESCE(SUM(amount),0) AS revenue, COUNT(*) AS count
    FROM transactions
    WHERE status='paid' AND date(created_at) >= date('now','-29 days')
    GROUP BY date(created_at) ORDER BY day ASC
  `).all();

  return { totalRevenue, txCount, activeSubs, mrr, customers, byPlan, daily };
}

/* ───────────────────────── Blogs ───────────────────────── */

function slugify(title) {
  return String(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'post';
}

// Ensure slug uniqueness (ignoring a given id when editing).
function uniqueSlug(base, ignoreId = null) {
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = ignoreId
      ? db.prepare('SELECT id FROM blogs WHERE slug = ? AND id != ?').get(slug, ignoreId)
      : db.prepare('SELECT id FROM blogs WHERE slug = ?').get(slug);
    if (!row) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

function createBlog(b) {
  const slug = uniqueSlug(slugify(b.title));
  const res = db.prepare(`
    INSERT INTO blogs (slug, title, excerpt, content, image, media_type, author, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    slug, b.title, b.excerpt || null, b.content || null,
    b.image || null, b.mediaType || 'image', b.author || 'Backlinkedge Team', b.status || 'published'
  );
  return { id: res.lastInsertRowid, slug };
}

function updateBlog(id, b) {
  const slug = uniqueSlug(slugify(b.title), id);
  // Only change media_type when a new media (image/url) is provided.
  const newMedia = b.image || null;
  db.prepare(`
    UPDATE blogs SET
      slug = ?, title = ?, excerpt = ?, content = ?,
      image = COALESCE(?, image),
      media_type = CASE WHEN ? IS NOT NULL THEN ? ELSE media_type END,
      author = ?, status = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    slug, b.title, b.excerpt || null, b.content || null,
    newMedia,
    newMedia, b.mediaType || 'image',
    b.author || 'Backlinkedge Team', b.status || 'published', id
  );
  return { id, slug };
}

function deleteBlog(id) {
  return db.prepare('DELETE FROM blogs WHERE id = ?').run(id).changes > 0;
}

function getBlogById(id) {
  return db.prepare('SELECT * FROM blogs WHERE id = ?').get(id) || null;
}

function getBlogBySlug(slug) {
  return db.prepare('SELECT * FROM blogs WHERE slug = ?').get(slug) || null;
}

// Public listing (published only) or admin listing (all).
function listBlogs({ includeDrafts = false, limit = 100, offset = 0 } = {}) {
  const where = includeDrafts ? '' : "WHERE status = 'published'";
  return db.prepare(`
    SELECT * FROM blogs ${where}
    ORDER BY datetime(created_at) DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

module.exports = {
  db,
  upsertCustomer,
  upsertSubscription,
  recordTransaction,
  listTransactions,
  listSubscriptions,
  getAnalytics,
  // blogs
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogById,
  getBlogBySlug,
  listBlogs
};
