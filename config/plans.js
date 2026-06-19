// Single source of truth for pricing plans.
// `amount` is in cents (Stripe's smallest currency unit).
// Used by both the public pricing section AND the Stripe checkout route.

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    desc: 'Perfect for small businesses',
    amount: 29900,
    featured: false,
    features: [
      '10 High Quality Backlinks / Month',
      'Technical SEO Audit',
      'Keyword Research',
      'Monthly Performance Report',
      'Email Support'
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    desc: 'Most popular choice',
    amount: 59900,
    featured: true,
    features: [
      '20 High Quality Backlinks / Month',
      'Technical & On-Page SEO',
      'Content Strategy',
      'Monthly Performance Report',
      'Priority Support'
    ]
  },
  {
    id: 'authority',
    name: 'Authority',
    desc: 'For agencies & large businesses',
    amount: 99900,
    featured: false,
    features: [
      '40 High Quality Backlinks / Month',
      'Advanced SEO Strategy',
      'Content Marketing (2 Articles)',
      'Weekly Reports & Calls',
      'VIP Support'
    ]
  }
];

const CURRENCY = 'usd';

function getPlan(id) {
  return PLANS.find((p) => p.id === id) || null;
}

// Convenience for templates: dollar string without trailing .00
function priceLabel(amountCents) {
  const dollars = amountCents / 100;
  return Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2);
}

module.exports = { PLANS, CURRENCY, getPlan, priceLabel };
