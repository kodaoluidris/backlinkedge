const crypto = require('crypto');

// Constant-time string comparison to avoid timing attacks.
function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Validate admin credentials against environment config.
function verifyAdmin(email, password) {
  const okEmail = safeEqual(email || '', process.env.ADMIN_EMAIL || '');
  const okPass = safeEqual(password || '', process.env.ADMIN_PASSWORD || '');
  return okEmail && okPass;
}

// Route guard — redirects to login if not authenticated.
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect('/admin/login');
}

module.exports = { verifyAdmin, requireAdmin };
