// Small text helpers shared by views.

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Render blog content for display.
// - WYSIWYG posts store HTML → render as-is (authored by trusted admins).
// - Legacy plain-text posts → blank lines become paragraphs, newlines become <br>.
function renderContent(text) {
  if (!text) return '';
  const str = String(text);
  // If it already contains HTML tags (from the rich-text editor), trust it.
  if (/<\/?[a-z][\s\S]*>/i.test(str)) return str;
  return str
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function formatDate(s) {
  if (!s) return '';
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
  return isNaN(d) ? s : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// First N characters of plain text, for auto-excerpts.
// Strips any HTML so excerpts from rich-text content stay clean.
function truncate(text, n = 160) {
  const t = String(text || '')
    .replace(/<[^>]*>/g, ' ')   // remove HTML tags
    .replace(/&[a-z]+;/gi, ' ') // collapse entities like &nbsp;
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > n ? t.slice(0, n).trim() + '…' : t;
}

module.exports = { escapeHtml, renderContent, formatDate, truncate };
