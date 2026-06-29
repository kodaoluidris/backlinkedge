const express = require('express');
const router = express.Router();
const dbApi = require('../db');

// Basic email shape validation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Responds to both AJAX (JSON) and plain form submits (redirect back).
function reply(req, res, ok, message, status = 200) {
  const wantsJson =
    req.xhr ||
    (req.get('accept') || '').includes('application/json') ||
    (req.get('x-requested-with') || '').toLowerCase() === 'fetch';
  if (wantsJson) return res.status(status).json({ ok, message });
  const back = req.get('referer') || '/';
  const sep = back.includes('?') ? '&' : '?';
  return res.redirect(`${back}${sep}newsletter=${ok ? 'ok' : 'err'}#contact`);
}

router.post('/subscribe', async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();

  if (!EMAIL_RE.test(email) || email.length > 320) {
    return reply(req, res, false, 'Please enter a valid email address.', 400);
  }

  try {
    const { created } = await dbApi.subscribeNewsletter(email, 'footer');
    return reply(
      req,
      res,
      true,
      created ? 'You’re subscribed — thanks for joining!' : 'You’re already subscribed. 🎉'
    );
  } catch (err) {
    console.error('Newsletter subscribe failed:', err && err.message ? err.message : err);
    return reply(req, res, false, 'Something went wrong. Please try again later.', 503);
  }
});

module.exports = router;
