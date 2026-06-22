// ============================================================
//  Structured data (JSON-LD) — single source of truth.
//  Implements the 4 essential schema types:
//    1. Organization   2. LocalBusiness   3. FAQPage   4. Review
//
//  These objects are injected as <script type="application/ld+json">
//  in the page <head> (see views/partials/schema.ejs).
//  Validate at: https://search.google.com/test/rich-results
// ============================================================

// Production site URL (used for absolute URLs in schema). Override with
// SITE_URL in .env when you deploy to your real domain.
const SITE_URL = (process.env.SITE_URL || 'https://backlinkedge-two.vercel.app').replace(/\/$/, '');

// ── Business facts (edit these to match your real details) ──
const business = {
  name: 'Backlinkedge SEO',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  image: `${SITE_URL}/office.jpg`,
  description:
    'Backlinkedge SEO is a results-driven SEO agency specializing in link building, technical SEO, local SEO, GEO SEO, and content marketing.',
  email: 'info@backlinkedge.com',
  telephone: '+2348012345678',
  foundingDate: '2025',
  industry: 'SEO Services',
  priceRange: '$$',
  address: {
    street: '123 SEO Street',
    locality: 'Victoria Island, Lagos',
    region: 'Lagos',
    postalCode: '100001',
    country: 'NG'
  },
  geo: { latitude: '6.4281', longitude: '3.4219' },
  hours: {
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '09:00',
    closes: '18:00'
  },
  areaServed: 'Lagos, Nigeria',
  sameAs: [
    'https://www.linkedin.com/company/backlinkedge',
    'https://twitter.com/backlinkedge',
    'https://www.facebook.com/backlinkedge',
    'https://www.instagram.com/backlinkedge'
  ]
};

// ── FAQs (shown as rich results in Google) ──
const faqs = [
  {
    q: 'What services does Backlinkedge SEO offer?',
    a: 'We offer link building, technical SEO, local SEO, GEO SEO, content marketing, and SEO consulting.'
  },
  {
    q: 'How long does SEO take to show results?',
    a: 'SEO results typically take 3 to 6 months depending on competition, website authority, and strategy.'
  },
  {
    q: 'Do you provide white-hat backlinks?',
    a: 'Yes, we focus on high-quality white-hat backlinks to improve search rankings safely and sustainably.'
  }
];

// ── Reviews / ratings ──
const reviews = {
  aggregate: { ratingValue: '4.9', reviewCount: '87', bestRating: '5' },
  sample: {
    author: 'John Smith',
    ratingValue: '5',
    bestRating: '5',
    body:
      'Backlinkedge SEO helped our website grow traffic and improve rankings significantly. Their team is professional, responsive, and results-driven.'
  }
};

// ── Schema builders ──────────────────────────────────────────
function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: business.name,
    url: business.url,
    logo: business.logo,
    description: business.description,
    email: business.email,
    telephone: business.telephone,
    foundingDate: business.foundingDate,
    sameAs: business.sameAs
  };
}

function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    image: business.image,
    url: business.url,
    telephone: business.telephone,
    email: business.email,
    priceRange: business.priceRange,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address.street,
      addressLocality: business.address.locality,
      addressRegion: business.address.region,
      postalCode: business.address.postalCode,
      addressCountry: business.address.country
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: business.geo.latitude,
      longitude: business.geo.longitude
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: business.hours.days,
      opens: business.hours.opens,
      closes: business.hours.closes
    },
    areaServed: business.areaServed
  };
}

function faqSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
}

function reviewSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: business.name,
    url: business.url,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: reviews.aggregate.ratingValue,
      reviewCount: reviews.aggregate.reviewCount,
      bestRating: reviews.aggregate.bestRating
    },
    review: {
      '@type': 'Review',
      itemReviewed: {
        '@type': 'Organization',
        name: business.name,
        url: business.url
      },
      author: { '@type': 'Person', name: reviews.sample.author },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: reviews.sample.ratingValue,
        bestRating: reviews.sample.bestRating
      },
      reviewBody: reviews.sample.body
    }
  };
}

// All schemas for the homepage, in document order.
function homeSchemas() {
  return [organizationSchema(), localBusinessSchema(), faqSchema(), reviewSchema()];
}

module.exports = {
  SITE_URL,
  business,
  faqs,
  reviews,
  organizationSchema,
  localBusinessSchema,
  faqSchema,
  reviewSchema,
  homeSchemas
};
