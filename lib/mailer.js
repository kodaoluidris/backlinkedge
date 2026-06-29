// Email sending via SMTP (nodemailer).
// Configure with environment variables (see .env):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE (true/false)
//   MAIL_FROM        e.g. "Backlinkedge SEO <hello@yourdomain.com>"
// If SMTP is not configured, isConfigured is false and sendMail throws a
// clear error (the admin UI shows a setup notice instead of crashing).

const nodemailer = require('nodemailer');

const cfg = {
  host: process.env.SMTP_HOST || '',
  port: Number(process.env.SMTP_PORT || 587),
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
  from: process.env.MAIL_FROM || process.env.SMTP_USER || ''
};

// Reject obvious placeholders so a half-filled .env doesn't look "configured".
const isConfigured = Boolean(
  cfg.host && cfg.user && cfg.pass && !/your-?smtp|example\.com|xxxx/i.test(cfg.host + cfg.user)
);

let transporter = null;
function getTransporter() {
  if (!isConfigured) throw new Error('Email is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM to your .env file.');
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure, // true for 465, false for 587/STARTTLS
      auth: { user: cfg.user, pass: cfg.pass }
    });
  }
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  return t.sendMail({
    from: cfg.from || cfg.user,
    to,
    subject,
    text: text || undefined,
    html: html || undefined
  });
}

// Verify the SMTP connection/credentials (used by the admin "test" action).
async function verify() {
  return getTransporter().verify();
}

// Plain-text message -> simple, safe HTML email (escaped, paragraphs/line breaks).
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function textToHtml(body, { brand = 'Backlinkedge SEO' } = {}) {
  const blocks = String(body || '')
    .split(/\n{2,}/)
    .map((b) => `<p style="margin:0 0 16px;line-height:1.6;color:#1f2a44;font-size:15px;">${escapeHtml(b.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<!DOCTYPE html><html><body style="margin:0;background:#f4f7fb;padding:24px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e6ebf3;">
      <h2 style="margin:0 0 20px;color:#0f1b33;font-size:20px;">${escapeHtml(brand)}</h2>
      ${blocks}
      <hr style="border:none;border-top:1px solid #e6ebf3;margin:24px 0;">
      <p style="margin:0;color:#8893a8;font-size:12px;line-height:1.5;">
        You’re receiving this because you subscribed to ${escapeHtml(brand)} updates.
      </p>
    </div></body></html>`;
}

module.exports = { isConfigured, sendMail, verify, textToHtml, config: cfg };
