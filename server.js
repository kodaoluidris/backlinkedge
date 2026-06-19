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
    title: 'Backlinkedge SEO — Build Authority. Rank Higher.',
    plans: PLANS,
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

// Initialize the database (creates DB + tables if needed), then start the server.
const db = require('./db');
db.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n  Backlinkedge SEO running at http://localhost:${PORT}`);
      console.log(`  Admin panel:  http://localhost:${PORT}/admin\n`);
    });
  })
  .catch((err) => {
    console.error('\n  ✗ Could not connect to MySQL.');
    console.error(`    ${err.message}`);
    console.error('    Check your DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME in .env,');
    console.error('    and make sure your MySQL server is running.\n');
    process.exit(1);
  });
