// Service: Local SEO  (full content — matches the provided design)
// Uses the section-driven model: `sections` is an ordered list of typed blocks
// the service template renders. Supported block types:
//   features | flow | split | results | cta | faq
module.exports = {
  slug: 'local-seo',
  name: 'Local SEO',
  icon: 'pin',
  color: '#2f6bff',
  summary: 'Dominate local search results with Google Business Profile optimization and local citation building.',
  tagline: 'Win the map pack in your area.',

  // ---- Hero ----
  eyebrow: 'Local SEO Services',
  heading: 'Win the Map Pack',
  headingAccent: 'in Your Area.',
  subheading: 'Get Found. Get More Customers. Grow Your Business.',
  intro: [
    'At BacklinkEdge SEO, we help local businesses rank higher in Google search results and dominate the local map pack with proven Local SEO strategies.',
    'If customers in your area cannot find your business online, you are losing valuable leads every day. Our Local SEO services are designed to improve your local visibility, generate more calls, and bring more customers directly to your business.'
  ],
  heroFeatures: [
    { icon: 'pin', label: 'Higher Rankings in Google Maps' },
    { icon: 'phone', label: 'More Calls & Local Leads' },
    { icon: 'growth', label: 'More Website Traffic' },
    { icon: 'rank', label: 'Increase Local Revenue' }
  ],
  ctaPrimary: { label: 'Get Started Today', href: '/#contact' },
  ctaSecondary: { label: 'See Our Local SEO Process', href: '#strategy' },
  heroVisual: 'map-pack',

  sections: [
    {
      type: 'features',
      title: 'Why',
      titleAccent: 'Local SEO',
      titleAfter: 'Matters',
      sub: '46% of all Google searches are looking for local information. If your business isn’t showing up in the map pack, you’re losing customers to your competitors.',
      items: [
        { icon: 'target', title: 'Rank Higher in Google Maps', text: 'Appear in the top 3 map pack positions and get more visibility.' },
        { icon: 'phone', title: 'Get More Calls & Local Leads', text: 'Attract high-intent local customers who are ready to take action.' },
        { icon: 'store', title: 'Drive Foot Traffic', text: 'Bring more customers to your physical location and grow your business.' },
        { icon: 'shield', title: 'Build Trust & Credibility', text: 'Better rankings and positive reviews build trust with local customers.' },
        { icon: 'growth', title: 'Increase Local Revenue', text: 'More visibility leads to more sales, more customers, and more growth.' }
      ]
    },
    {
      type: 'flow',
      id: 'strategy',
      alt: true,
      title: 'Our',
      titleAccent: 'Local SEO',
      titleAfter: 'Strategy',
      sub: 'Our data-driven Local SEO process is designed to help you rank higher and win the map pack in your area.',
      items: [
        { icon: 'store', title: 'Google Business Profile Optimization', text: 'We fully optimize your Google Business Profile to improve local visibility and attract more customers.' },
        { icon: 'pin', title: 'Local Citation Building', text: 'We build & optimize consistent citations across trusted directories to boost your local authority.' },
        { icon: 'search', title: 'Local Keyword Optimization', text: 'We find high-converting local keywords and optimize your website to rank for what your customers search.' },
        { icon: 'code', title: 'On-Page Local SEO', text: 'We optimize your website pages, meta tags, schema markup, and internal links for better local relevance.' },
        { icon: 'star', title: 'Reputation & Review Management', text: 'We help you get more positive reviews and manage your online reputation to build trust.' },
        { icon: 'link', title: 'Local Link Building', text: 'We build high-quality local backlinks from relevant websites to improve your local rankings.' }
      ]
    },
    {
      type: 'split',
      left: {
        title: 'Why Choose',
        titleAccent: 'BacklinkEdge?',
        bullets: [
          'Proven Local SEO Strategies That Deliver Results',
          '100% White-Hat SEO Techniques',
          'Customized Strategies for Your Business',
          'Transparent Reporting & Regular Updates',
          'Dedicated Local SEO Experts',
          'Long-Term Sustainable Growth'
        ]
      },
      right: {
        title: 'Industries We Serve',
        sub: 'We help local businesses across multiple industries dominate local search.',
        items: [
          { icon: 'scale', label: 'Legal Services' },
          { icon: 'retention', label: 'Healthcare' },
          { icon: 'home', label: 'Real Estate' },
          { icon: 'store', label: 'Restaurants' },
          { icon: 'gear', label: 'Home Services' },
          { icon: 'briefcase', label: 'Agencies' },
          { icon: 'sparkle', label: 'Beauty & Wellness' },
          { icon: 'car', label: 'Automotive' },
          { icon: 'projects', label: 'Contractors' },
          { icon: 'plus', label: '& More' }
        ]
      }
    },
    {
      type: 'results',
      title: 'Real Results. Real Growth.',
      sub: 'Our Local SEO campaigns deliver real results for local businesses.',
      stats: [
        ['156%', 'Increase in Map Pack Visibility', 'pin', '#16b981'],
        ['278%', 'Increase in Phone Calls', 'phone', '#3aa0ff'],
        ['185%', 'Increase in Website Traffic', 'growth', '#7c5cff'],
        ['212%', 'Increase in Local Leads', 'rank', '#ffb13c']
      ],
      testimonial: {
        quote: 'BacklinkEdge improved our Google Maps rankings and we started getting a lot more calls and customers. Highly recommended!',
        author: 'David P.',
        role: 'Business Owner'
      }
    },
    {
      type: 'cta',
      variant: 'blue',
      title: 'Ready to Win the Map Pack',
      titleAccent: 'in Your Area?',
      text: 'Let BacklinkEdge SEO help your business get found by local customers, rank higher in Google Maps, and grow your revenue.',
      primary: { label: 'Get Free Audit', href: '/#contact' },
      secondary: { label: 'Contact Us Now', href: '/#contact' },
      highlights: ['Rank Higher', 'Get More Customers', 'Grow Your Business']
    },
    {
      type: 'faq',
      title: 'Frequently Asked Questions',
      items: [
        { q: 'How long does Local SEO take?', a: 'Most businesses see measurable improvements within 2–4 months, depending on competition and current online presence.' },
        { q: 'Can you rank my business in Google Maps?', a: 'Yes, our Local SEO strategy is designed to improve Google Maps rankings and map pack visibility.' },
        { q: 'Do reviews help local rankings?', a: 'Yes. Reviews are one of the strongest local ranking signals.' },
        { q: 'Do you work with all local businesses?', a: 'Yes. We work with service businesses, agencies, retail stores, and more across all locations.' }
      ]
    }
  ]
};
