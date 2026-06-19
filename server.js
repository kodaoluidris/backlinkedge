require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');

const { PLANS, priceLabel } = require('./config/plans');
const { publishableKey } = require('./config/stripe');
const site = require('./config/site');

const webhookRouter = require('./routes/webhook');
const checkoutRouter = require('./routes/checkout');
const adminRouter = require('./routes/admin');
const blogRouter = require('./routes/blog');

// Tawk.to live chat config (optional — only injected when both IDs are set)
const tawk = {
  propertyId: process.env.TAWKTO_PROPERTY_ID || '',
  widgetId: process.env.TAWKTO_WIDGET_ID || 'default'
};
tawk.enabled = /^[a-f0-9]{20,}$/i.test(tawk.propertyId);

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// ── Stripe webhook FIRST: it needs the raw request body, so it must be
//    mounted before the json/urlencoded parsers below. ──
app.use('/webhook', webhookRouter);

// Body parsers for everything else
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessions (admin auth)
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8 // 8 hours
  }
}));

// Expose live-chat config + current path to every view
app.use((req, res, next) => {
  res.locals.tawk = tawk;
  res.locals.currentPath = req.path;
  next();
});

// ── Routes ──
app.get('/', (req, res) => {
  res.render('index', {
    site,
    page: 'home',
    title: 'Backlinkedge SEO | Link Building & SEO Agency for Organic Growth.',
    plans: PLANS,
    meta:'Helping businesses grow with white-hat backlinks, technical SEO, local SEO, and AI search optimization. Get higher rankings and more leads with Backlinkedge SEO.',
    priceLabel,
    publishableKey
  });
});

app.use('/blog', blogRouter);
app.use('/checkout', checkoutRouter);
app.use('/admin', adminRouter);

// 404
app.use((req, res) => {
  res.status(404).render('message', {
    title: 'Page not found',
    heading: '404 — Page not found',
    body: 'The page you’re looking for doesn’t exist.',
    cta: { href: '/', label: 'Back to home' }
  });
});

// Error handler (catches rejected async route handlers)
app.use((err, req, res, next) => {
  console.error('Request error:', err && err.message ? err.message : err);
  if (res.headersSent) return next(err);
  res.status(500).render('message', {
    title: 'Something went wrong',
    heading: 'Something went wrong',
    body: 'An unexpected error occurred. Please try again.',
    cta: { href: '/', label: 'Back to home' }
  });
});

// Start the web server FIRST so the public site is always available, even if the
// database is down. Then try to connect to MySQL (and create the schema) in the
// background, retrying until it succeeds. DB-backed features degrade gracefully
// until the connection is up.
const db = require('./db');

app.listen(PORT, () => {
  console.log(`\n  Backlinkedge SEO running at http://localhost:${PORT}`);
  console.log(`  Admin panel:  http://localhost:${PORT}/admin\n`);
});

function initDbWithRetry(attempt = 1) {
  db.init()
    .then(() => console.log('  ✓ MySQL connected — database & tables ready.\n'))
    .catch((err) => {
      const wait = Math.min(30, attempt * 5); // back off up to 30s
      console.warn(
        `  ⚠ MySQL not reachable (${err.code || err.message}). ` +
        `The public site still works; database features are offline. ` +
        `Retrying in ${wait}s…`
      );
      setTimeout(() => initDbWithRetry(attempt + 1), wait * 1000);
    });
}
initDbWithRetry();
