const express = require('express');
const router = express.Router();

const site = require('../config/site');
const dbApi = require('../db');
const { renderContent, formatDate, truncate } = require('../lib/format');
const { resolveMedia } = require('../lib/media');

// Public blog list
router.get('/', (req, res) => {
  const posts = dbApi.listBlogs({ includeDrafts: false, limit: 100 });
  res.render('blog', {
    site,
    title: 'Blog — Backlinkedge SEO',
    posts,
    formatDate,
    truncate,
    resolveMedia
  });
});

// Single post
router.get('/:slug', (req, res) => {
  const post = dbApi.getBlogBySlug(req.params.slug);
  if (!post || post.status !== 'published') {
    return res.status(404).render('message', {
      title: 'Post not found',
      heading: 'Post not found',
      body: 'This article doesn’t exist or hasn’t been published yet.',
      cta: { href: '/blog', label: 'Back to blog' }
    });
  }
  // A few recent posts for the "more reading" rail
  const more = dbApi.listBlogs({ includeDrafts: false, limit: 4 })
    .filter((p) => p.id !== post.id)
    .slice(0, 3);

  res.render('blog-post', {
    site,
    title: `${post.title} — Backlinkedge SEO`,
    post,
    more,
    renderContent,
    formatDate,
    resolveMedia
  });
});

module.exports = router;
