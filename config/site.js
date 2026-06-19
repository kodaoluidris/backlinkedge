// Site-wide data shared across all public pages (landing, blog, etc.)
// Nav hrefs are root-absolute (e.g. "/#services") so they work from any page.

const site = {
  name: 'Backlinkedge',
  brand: 'Backlinkedge SEO',
  get year() { return new Date().getFullYear(); },
  nav: [
    { label: 'Home', href: '/' },
    { label: 'About Us', href: '/#about' },
    { label: 'Services', href: '/#services' },
    { label: 'Case Studies', href: '/#results' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'Contact', href: '/#contact' },
    { label: 'Blog', href: '/blog' }
  ]
};

module.exports = site;
