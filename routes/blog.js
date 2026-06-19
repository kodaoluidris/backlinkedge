const express = require('express');
const router = express.Router();

const site = require('../config/site');
const dbApi = require('../db');
const { renderContent, formatDate, truncate } = require('../lib/format');
const { resolveMedia } = require('../lib/media');

// Wrap async handlers so rejections reach Express' error handler.
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Public blog list — degrades to an empty list if the database is unavailable.
router.get('/', ah(async (req, res) => {
  let posts = [];
  try {
    posts = await dbApi.listBlogs({ includeDrafts: false, limit: 100 });
  } catch (err) {
    console.warn('Blog list unavailable (DB offline):', err.code || err.message);
  }
  res.render('blog', {
    site,
    title: 'Blog — Backlinkedge SEO',
    posts,
    formatDate,
    truncate,
    resolveMedia
  });
}));

// Single post
router.get('/:slug', ah(async (req, res) => {
  let post = null;
  let more = [];
  try {
    post = await dbApi.getBlogBySlug(req.params.slug);
    if (post && post.status === 'published') {
      more = (await dbApi.listBlogs({ includeDrafts: false, limit: 4 }))
        .filter((p) => p.id !== post.id)
        .slice(0, 3);
    }
  } catch (err) {
    console.warn('Blog post unavailable (DB offline):', err.code || err.message);
  }
  if (!post || post.status !== 'published') {
    return res.status(404).render('message', {
      title: 'Post not found',
      heading: 'Post not found',
      body: 'This article doesn’t exist or hasn’t been published yet.',
      cta: { href: '/blog', label: 'Back to blog' }
    });
  }

  res.render('blog-post', {
    site,
    title: `${post.title} — Backlinkedge SEO`,
    post,
    more,
    renderContent,
    formatDate,
    resolveMedia
  });
}));

module.exports = router;
