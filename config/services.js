// Single source of truth for services.
// Used by: navbar dropdown, landing "Our Services" cards, and each service page.
// `content` is placeholder copy — replace with your real content later.

const SERVICES = [
  {
    slug: 'link-building',
    name: 'Link Building',
    icon: 'link',
    color: '#4aa8ff',
    summary: 'High-quality, white-hat backlinks from authoritative websites that boost rankings and domain authority.',
    tagline: 'Earn authority links that move rankings.',
    content: `
      <p>Placeholder content for Link Building. Replace this with your real copy.</p>
      <p>We build high-quality, white-hat backlinks from relevant, authoritative websites — the kind of links that genuinely move rankings and grow domain authority without putting your site at risk.</p>
      <h3>What's included</h3>
      <ul>
        <li>Manual outreach to relevant, high-authority sites</li>
        <li>Guest posting and digital PR placements</li>
        <li>Competitor backlink gap analysis</li>
        <li>Monthly link reports with live URLs</li>
      </ul>
      <p>Add more detail here about your process, turnaround times, and what clients can expect.</p>
    `
  },
  {
    slug: 'technical-seo',
    name: 'Technical SEO',
    icon: 'code',
    color: '#00c2a8',
    summary: 'We fix technical issues, improve site speed, indexing, and create a strong foundation for higher rankings.',
    tagline: 'A fast, crawlable, rank-ready foundation.',
    content: `
      <p>Placeholder content for Technical SEO. Replace this with your real copy.</p>
      <p>We audit and fix the technical foundation of your site — speed, crawlability, indexing, structured data, and Core Web Vitals — so search engines can find, understand, and rank your pages.</p>
      <h3>What's included</h3>
      <ul>
        <li>Full technical SEO audit</li>
        <li>Site speed &amp; Core Web Vitals optimization</li>
        <li>Crawl, index, and sitemap fixes</li>
        <li>Schema / structured data implementation</li>
      </ul>
      <p>Add more detail here about deliverables and timelines.</p>
    `
  },
  {
    slug: 'local-seo',
    name: 'Local SEO',
    icon: 'pin',
    color: '#ffb13c',
    summary: 'Dominate local search results with Google Business Profile optimization and local citation building.',
    tagline: 'Win the map pack in your area.',
    content: `
      <p>Placeholder content for Local SEO. Replace this with your real copy.</p>
      <p>We help local businesses dominate the map pack and "near me" searches through Google Business Profile optimization, local citations, and review strategy.</p>
      <h3>What's included</h3>
      <ul>
        <li>Google Business Profile optimization</li>
        <li>Local citation building &amp; cleanup</li>
        <li>Review generation strategy</li>
        <li>Local landing pages</li>
      </ul>
      <p>Add more detail here about your local SEO approach.</p>
    `
  },
  {
    slug: 'geo-ai-seo',
    name: 'GEO / AI SEO',
    icon: 'ai',
    color: '#7c5cff',
    summary: 'Optimize for AI search engines like ChatGPT, Gemini, Claude & Google AI Overviews to stay ahead.',
    tagline: 'Get cited by AI search engines.',
    content: `
      <p>Placeholder content for GEO / AI SEO. Replace this with your real copy.</p>
      <p>Generative Engine Optimization positions your brand to be referenced by AI answer engines — ChatGPT, Gemini, Claude, and Google's AI Overviews — not just traditional search results.</p>
      <h3>What's included</h3>
      <ul>
        <li>AI visibility &amp; citation audit</li>
        <li>Entity and topical authority building</li>
        <li>Content structured for AI extraction</li>
        <li>Tracking of AI answer mentions</li>
      </ul>
      <p>Add more detail here about how you optimize for AI search.</p>
    `
  },
  {
    slug: 'content-marketing',
    name: 'Content Marketing',
    icon: 'content',
    color: '#4aa8ff',
    summary: 'SEO-optimized content that attracts, engages, and converts your target audience into customers.',
    tagline: 'Content that ranks and converts.',
    content: `
      <p>Placeholder content for Content Marketing. Replace this with your real copy.</p>
      <p>We plan, write, and optimize content that ranks for the keywords your customers are searching — and turns that traffic into leads and sales.</p>
      <h3>What's included</h3>
      <ul>
        <li>Keyword &amp; topic research</li>
        <li>Editorial calendar &amp; content strategy</li>
        <li>SEO-optimized article writing</li>
        <li>Content refreshes &amp; optimization</li>
      </ul>
      <p>Add more detail here about your content process.</p>
    `
  },
  {
    slug: 'seo-consulting',
    name: 'SEO Consulting',
    icon: 'consulting',
    color: '#00c2a8',
    summary: 'Monthly strategy calls, detailed reports, and expert guidance to achieve your business goals.',
    tagline: 'Expert guidance, on tap.',
    content: `
      <p>Placeholder content for SEO Consulting. Replace this with your real copy.</p>
      <p>Prefer to keep SEO in-house? Our consulting gives your team a clear roadmap, regular strategy calls, and expert guidance to hit your growth goals.</p>
      <h3>What's included</h3>
      <ul>
        <li>Monthly strategy calls</li>
        <li>Custom SEO roadmap</li>
        <li>Detailed reporting &amp; insights</li>
        <li>Direct access to an SEO expert</li>
      </ul>
      <p>Add more detail here about your consulting packages.</p>
    `
  }
];

function getService(slug) {
  return SERVICES.find((s) => s.slug === slug) || null;
}

module.exports = { SERVICES, getService };
