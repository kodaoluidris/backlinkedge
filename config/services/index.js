// Services registry.
// Each service lives in its own file in this folder — edit one service at a
// time without touching the others. To add a new service: create a file that
// exports a service object (see any existing file for the shape) and add a
// require() for it to the SERVICES array below, in the order it should appear.
//
// Service object shape:
//   slug, name, icon, color, summary, tagline   — used everywhere (nav, cards, hero)
//   heading      – service-page H1 (falls back to name)
//   intro        – service-page hero sub-paragraph
//   heroPoints   – 3 quick value props under the hero  [ [title, sub], ... ]
//   why          – "Why X Matters"        { title, sub, items:[{icon,title,text}] }
//   offerings    – "Our X Services"        { title, sub, items:[{icon,title,text}] }
//   process      – "Our X Process"         { title, sub, items:[{title,text}] }  (numbered)
//   guide        – "What You Need to Know" { title, sub, items:[{title,text}] }  (numbered)
// The service-page template renders whatever sections exist and skips the rest.

// Shown only if a service doesn't define its own heroPoints.
const DEFAULT_HERO_POINTS = [
  ['White-Hat Strategies', '100% Google-Safe'],
  ['Real Results', 'Measurable Growth'],
  ['Long-Term Growth', 'Sustainable Rankings']
];

const SERVICES = [
  require('./link-building'),
  require('./technical-seo'),
  require('./local-seo'),
  require('./geo-ai-seo'),
  require('./content-marketing'),
  require('./seo-consulting')
];

function getService(slug) {
  return SERVICES.find((s) => s.slug === slug) || null;
}

module.exports = { SERVICES, getService, DEFAULT_HERO_POINTS };
