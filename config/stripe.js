// Stripe client wrapper.
// Initializes lazily and detects placeholder keys so the app still boots
// (and shows a friendly message) before real test keys are configured.

const Stripe = require('stripe');

const secret = process.env.STRIPE_SECRET_KEY || '';

// A real Stripe secret key starts with "sk_test_" or "sk_live_" and is long.
// We also reject the "xxxx" placeholder shipped in .env.example.
const isConfigured =
  /^sk_(test|live)_[A-Za-z0-9]{20,}$/.test(secret) && !/x{6,}/i.test(secret);

let stripe = null;
if (isConfigured) {
  stripe = new Stripe(secret, { apiVersion: '2024-06-20' });
}

module.exports = {
  stripe,
  isConfigured,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
};
