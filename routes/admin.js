const express = require('express');
const router = express.Router();

const { verifyAdmin, requireAdmin } = require('../middleware/auth');
const dbApi = require('../db');
const { isConfigured } = require('../config/stripe');
const { upload, mediaTypeOf } = require('../middleware/upload');
const { resolveMedia } = require('../lib/media');
const { formatDate } = require('../lib/format');
const mailer = require('../lib/mailer');

// Wrap async route handlers so rejected promises reach Express' error handler.
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ───────────── Auth ───────────── */

router.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (verifyAdmin(email, password)) {
    req.session.isAdmin = true;
    req.session.adminEmail = email;
    return res.redirect('/admin');
  }
  res.status(401).render('admin/login', { error: 'Invalid email or password.' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

/* ───────────── Protected ───────────── */

router.use(requireAdmin);

router.get('/', ah(async (req, res) => {
  const a = await dbApi.getAnalytics();
  const recent = await dbApi.listTransactions({ limit: 8 });
  res.render('admin/dashboard', {
    active: 'dashboard',
    adminEmail: req.session.adminEmail,
    stripeReady: isConfigured,
    a,
    recent
  });
}));

router.get('/transactions', ah(async (req, res) => {
  const transactions = await dbApi.listTransactions({ limit: 500 });
  res.render('admin/transactions', {
    active: 'transactions',
    adminEmail: req.session.adminEmail,
    stripeReady: isConfigured,
    transactions
  });
}));

router.get('/subscriptions', ah(async (req, res) => {
  const subscriptions = await dbApi.listSubscriptions();
  res.render('admin/subscriptions', {
    active: 'subscriptions',
    adminEmail: req.session.adminEmail,
    stripeReady: isConfigured,
    subscriptions
  });
}));

/* ───────────── Newsletter ───────────── */

router.get('/newsletters', ah(async (req, res) => {
  const subscribers = await dbApi.listNewsletters({ limit: 5000 });
  res.render('admin/newsletters', {
    active: 'newsletters',
    adminEmail: req.session.adminEmail,
    stripeReady: isConfigured,
    subscribers,
    formatDate,
    mailerReady: mailer.isConfigured,
    flash: req.query.msg || null,
    sent: req.query.sent ? Number(req.query.sent) : null,
    failed: req.query.failed ? Number(req.query.failed) : null,
    err: req.query.err || null
  });
}));

// Send a broadcast email to selected (or all) subscribers.
router.post('/newsletters/send', ah(async (req, res) => {
  const subject = String(req.body.subject || '').trim();
  const message = String(req.body.message || '').trim();
  const scope = req.body.scope === 'all' ? 'all' : 'selected';

  if (!mailer.isConfigured) {
    return res.redirect('/admin/newsletters?err=notconfigured');
  }
  if (!subject || !message) {
    return res.redirect('/admin/newsletters?err=missing');
  }

  // Resolve recipient list.
  let recipients;
  if (scope === 'all') {
    recipients = (await dbApi.listNewsletters({ limit: 100000 })).map((r) => r.email);
  } else {
    const picked = req.body.emails;
    recipients = Array.isArray(picked) ? picked : (picked ? [picked] : []);
  }
  recipients = [...new Set(recipients.filter(Boolean).map((e) => String(e).trim().toLowerCase()))];

  if (!recipients.length) {
    return res.redirect('/admin/newsletters?err=norecipients');
  }

  const html = mailer.textToHtml(message);
  let sent = 0, failed = 0;
  // Send individually so each recipient gets a personal copy (no leaked addresses).
  for (const to of recipients) {
    try {
      await mailer.sendMail({ to, subject, html, text: message });
      sent += 1;
    } catch (e) {
      failed += 1;
      console.error(`Newsletter send to ${to} failed:`, e && e.message ? e.message : e);
    }
  }
  res.redirect(`/admin/newsletters?sent=${sent}&failed=${failed}`);
}));

router.get('/newsletters/export', ah(async (req, res) => {
  const rows = await dbApi.listNewsletters({ limit: 100000 });
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const csv = [
    'email,status,source,subscribed_at',
    ...rows.map((r) => [r.email, r.status, r.source, r.created_at].map(esc).join(','))
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="newsletter-subscribers.csv"');
  res.send(csv);
}));

router.post('/newsletters/:id/delete', ah(async (req, res) => {
  await dbApi.deleteNewsletter(Number(req.params.id));
  res.redirect('/admin/newsletters?msg=deleted');
}));

/* ───────────── Blog CRUD ───────────── */

// List
router.get('/blogs', ah(async (req, res) => {
  const posts = await dbApi.listBlogs({ includeDrafts: true, limit: 500 });
  res.render('admin/blogs', {
    active: 'blogs',
    adminEmail: req.session.adminEmail,
    stripeReady: isConfigured,
    posts,
    formatDate,
    resolveMedia,
    flash: req.query.msg || null
  });
}));

// New form
router.get('/blogs/new', (req, res) => {
  res.render('admin/blog-form', {
    active: 'blogs',
    adminEmail: req.session.adminEmail,
    stripeReady: isConfigured,
    post: null,
    error: null,
    resolveMedia
  });
});

// Edit form
router.get('/blogs/:id/edit', ah(async (req, res) => {
  const post = await dbApi.getBlogById(Number(req.params.id));
  if (!post) return res.redirect('/admin/blogs');
  res.render('admin/blog-form', {
    active: 'blogs',
    adminEmail: req.session.adminEmail,
    stripeReady: isConfigured,
    post,
    error: null,
    resolveMedia
  });
}));

// Helper to handle the multer upload + form fields for create/update
function handleBlogUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      req.uploadError = err.message;
    }
    next();
  });
}

// Create
router.post('/blogs', handleBlogUpload, ah(async (req, res) => {
  const { title, excerpt, content, author, status, image_url } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).render('admin/blog-form', {
      active: 'blogs', adminEmail: req.session.adminEmail, stripeReady: isConfigured,
      post: req.body, error: req.uploadError || 'Title is required.', resolveMedia
    });
  }
  const image = req.file ? `/uploads/${req.file.filename}` : (image_url || null);
  const mediaType = req.file
    ? mediaTypeOf({ mimetype: req.file.mimetype })
    : mediaTypeOf({ pathOrUrl: image });
  await dbApi.createBlog({ title: title.trim(), excerpt, content, image, mediaType, author, status });
  res.redirect('/admin/blogs?msg=created');
}));

// Update
router.post('/blogs/:id', handleBlogUpload, ah(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await dbApi.getBlogById(id);
  if (!existing) return res.redirect('/admin/blogs');

  const { title, excerpt, content, author, status, image_url } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).render('admin/blog-form', {
      active: 'blogs', adminEmail: req.session.adminEmail, stripeReady: isConfigured,
      post: { ...existing, ...req.body }, error: req.uploadError || 'Title is required.', resolveMedia
    });
  }
  // New upload wins; else keep existing unless an image_url was provided.
  const image = req.file ? `/uploads/${req.file.filename}` : (image_url || null);
  const mediaType = req.file
    ? mediaTypeOf({ mimetype: req.file.mimetype })
    : mediaTypeOf({ pathOrUrl: image });
  await dbApi.updateBlog(id, { title: title.trim(), excerpt, content, image, mediaType, author, status });
  res.redirect('/admin/blogs?msg=updated');
}));

// Delete
router.post('/blogs/:id/delete', ah(async (req, res) => {
  await dbApi.deleteBlog(Number(req.params.id));
  res.redirect('/admin/blogs?msg=deleted');
}));

module.exports = router;
