// Database layer — MySQL (via mysql2/promise connection pool).
// Credentials come from environment variables (see .env / .env.example).
// All functions are async. Call `await init()` once at startup (server.js does this).

const mysql = require('mysql2/promise');

const DB = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'backlinkedge_seo'
};

// `dateStrings: true` makes DATETIME/DATE come back as 'YYYY-MM-DD HH:MM:SS'
// strings (matching the previous SQLite format) so the view formatters keep working.
let pool = mysql.createPool({
  host: DB.host,
  port: DB.port,
  user: DB.user,
  password: DB.password,
  database: DB.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  charset: 'utf8mb4'
});

// Convenience helpers around the pool.
async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}
async function get(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}
async function run(sql, params = []) {
  const [result] = await pool.query(sql, params);
  return result; // { insertId, affectedRows, ... }
}

/* ───────────────────────── Schema / init ───────────────────────── */

// Creates the database (if missing) and all tables. Safe to run repeatedly.
async function init() {
  // First connect without a database to ensure it exists.
  const bootstrap = await mysql.createConnection({
    host: DB.host, port: DB.port, user: DB.user, password: DB.password, multipleStatements: false
  });
  await bootstrap.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await bootstrap.end();

  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id                  INT AUTO_INCREMENT PRIMARY KEY,
      stripe_customer_id  VARCHAR(255) UNIQUE,
      email               VARCHAR(320),
      name                VARCHAR(255),
      created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id                      INT AUTO_INCREMENT PRIMARY KEY,
      stripe_subscription_id  VARCHAR(255) UNIQUE,
      stripe_customer_id      VARCHAR(255),
      email                   VARCHAR(320),
      plan_id                 VARCHAR(100),
      plan_name               VARCHAR(255),
      amount                  BIGINT,
      currency                VARCHAR(10),
      status                  VARCHAR(40),
      current_period_end      DATETIME NULL,
      created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sub_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id                  INT AUTO_INCREMENT PRIMARY KEY,
      stripe_event_id     VARCHAR(255),
      stripe_invoice_id   VARCHAR(255) UNIQUE,
      stripe_customer_id  VARCHAR(255),
      email               VARCHAR(320),
      name                VARCHAR(255),
      plan_id             VARCHAR(100),
      plan_name           VARCHAR(255),
      amount              BIGINT,
      currency            VARCHAR(10),
      status              VARCHAR(40),
      created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS blogs (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      slug        VARCHAR(120) UNIQUE,
      title       VARCHAR(255) NOT NULL,
      excerpt     TEXT,
      content     LONGTEXT,
      image       TEXT,
      media_type  VARCHAR(20) DEFAULT 'image',
      author      VARCHAR(255),
      status      VARCHAR(20) DEFAULT 'published',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_blog_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  return pool;
}

/* ───────────────────────── Writers ───────────────────────── */

async function upsertCustomer({ stripeCustomerId, email, name }) {
  await run(
    `INSERT INTO customers (stripe_customer_id, email, name)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       email = COALESCE(VALUES(email), email),
       name  = COALESCE(VALUES(name), name)`,
    [stripeCustomerId, email || null, name || null]
  );
}

async function upsertSubscription(s) {
  await run(
    `INSERT INTO subscriptions
       (stripe_subscription_id, stripe_customer_id, email, plan_id, plan_name,
        amount, currency, status, current_period_end, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       status             = VALUES(status),
       current_period_end = VALUES(current_period_end),
       plan_id            = COALESCE(VALUES(plan_id), plan_id),
       plan_name          = COALESCE(VALUES(plan_name), plan_name),
       amount             = COALESCE(VALUES(amount), amount),
       updated_at         = NOW()`,
    [
      s.stripeSubscriptionId, s.stripeCustomerId, s.email || null,
      s.planId || null, s.planName || null, s.amount || null,
      s.currency || 'usd', s.status, normalizeDate(s.currentPeriodEnd)
    ]
  );
}

// Returns true if inserted, false if it was a duplicate invoice (idempotent).
async function recordTransaction(t) {
  const res = await run(
    `INSERT IGNORE INTO transactions
       (stripe_event_id, stripe_invoice_id, stripe_customer_id, email, name,
        plan_id, plan_name, amount, currency, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      t.stripeEventId || null, t.stripeInvoiceId || null, t.stripeCustomerId || null,
      t.email || null, t.name || null, t.planId || null, t.planName || null,
      t.amount || 0, t.currency || 'usd', t.status || 'paid'
    ]
  );
  return res.affectedRows > 0;
}

// Accepts an ISO string / Date and returns 'YYYY-MM-DD HH:MM:SS' for MySQL DATETIME.
function normalizeDate(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d)) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/* ───────────────────────── Readers ───────────────────────── */

async function listTransactions({ limit = 100, offset = 0 } = {}) {
  return query(
    `SELECT * FROM transactions ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [Number(limit), Number(offset)]
  );
}

async function listSubscriptions() {
  return query(`SELECT * FROM subscriptions ORDER BY updated_at DESC`);
}

async function getAnalytics() {
  const totalRevenue = (await get(
    `SELECT COALESCE(SUM(amount),0) AS v FROM transactions WHERE status='paid'`
  )).v;
  const txCount = (await get(
    `SELECT COUNT(*) AS v FROM transactions WHERE status='paid'`
  )).v;
  const activeSubs = (await get(
    `SELECT COUNT(*) AS v FROM subscriptions WHERE status='active'`
  )).v;
  const mrr = (await get(
    `SELECT COALESCE(SUM(amount),0) AS v FROM subscriptions WHERE status='active'`
  )).v;
  const customers = (await get(`SELECT COUNT(*) AS v FROM customers`)).v;

  const byPlan = await query(`
    SELECT plan_name AS plan, COUNT(*) AS count, COALESCE(SUM(amount),0) AS revenue
    FROM transactions WHERE status='paid'
    GROUP BY plan_name ORDER BY revenue DESC
  `);

  const daily = await query(`
    SELECT DATE(created_at) AS day, COALESCE(SUM(amount),0) AS revenue, COUNT(*) AS count
    FROM transactions
    WHERE status='paid' AND DATE(created_at) >= (CURDATE() - INTERVAL 29 DAY)
    GROUP BY DATE(created_at) ORDER BY day ASC
  `);

  // MySQL returns SUM()/COUNT() as strings sometimes; coerce to numbers.
  return {
    totalRevenue: Number(totalRevenue),
    txCount: Number(txCount),
    activeSubs: Number(activeSubs),
    mrr: Number(mrr),
    customers: Number(customers),
    byPlan: byPlan.map((p) => ({ plan: p.plan, count: Number(p.count), revenue: Number(p.revenue) })),
    daily: daily.map((d) => ({ day: d.day, revenue: Number(d.revenue), count: Number(d.count) }))
  };
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
async function uniqueSlug(base, ignoreId = null) {
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = ignoreId
      ? await get('SELECT id FROM blogs WHERE slug = ? AND id != ?', [slug, ignoreId])
      : await get('SELECT id FROM blogs WHERE slug = ?', [slug]);
    if (!row) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function createBlog(b) {
  const slug = await uniqueSlug(slugify(b.title));
  const res = await run(
    `INSERT INTO blogs (slug, title, excerpt, content, image, media_type, author, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      slug, b.title, b.excerpt || null, b.content || null,
      b.image || null, b.mediaType || 'image', b.author || 'Backlinkedge Team', b.status || 'published'
    ]
  );
  return { id: res.insertId, slug };
}

async function updateBlog(id, b) {
  const slug = await uniqueSlug(slugify(b.title), id);
  const newMedia = b.image || null;
  await run(
    `UPDATE blogs SET
       slug = ?, title = ?, excerpt = ?, content = ?,
       image = COALESCE(?, image),
       media_type = CASE WHEN ? IS NOT NULL THEN ? ELSE media_type END,
       author = ?, status = ?,
       updated_at = NOW()
     WHERE id = ?`,
    [
      slug, b.title, b.excerpt || null, b.content || null,
      newMedia,
      newMedia, b.mediaType || 'image',
      b.author || 'Backlinkedge Team', b.status || 'published', id
    ]
  );
  return { id, slug };
}

async function deleteBlog(id) {
  const res = await run('DELETE FROM blogs WHERE id = ?', [id]);
  return res.affectedRows > 0;
}

async function getBlogById(id) {
  return get('SELECT * FROM blogs WHERE id = ?', [id]);
}

async function getBlogBySlug(slug) {
  return get('SELECT * FROM blogs WHERE slug = ?', [slug]);
}

async function listBlogs({ includeDrafts = false, limit = 100, offset = 0 } = {}) {
  const where = includeDrafts ? '' : "WHERE status = 'published'";
  return query(
    `SELECT * FROM blogs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [Number(limit), Number(offset)]
  );
}

module.exports = {
  pool,
  init,
  query,
  get,
  run,
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
