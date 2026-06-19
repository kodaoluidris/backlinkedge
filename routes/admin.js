const express = require('express');
const router = express.Router();

const { verifyAdmin, requireAdmin } = require('../middleware/auth');
const dbApi = require('../db');
const { isConfigured } = require('../config/stripe');
const { upload, mediaTypeOf } = require('../middleware/upload');
const { resolveMedia } = require('../lib/media');
const { formatDate } = require('../lib/format');

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
