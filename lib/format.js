// Small text helpers shared by views.

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Render plain-text blog content into safe HTML:
// blank lines → paragraphs, single newlines → <br>. No raw HTML allowed (XSS-safe).
function renderContent(text) {
  if (!text) return '';
  return String(text)
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
function truncate(text, n = 160) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n).trim() + '…' : t;
}

module.exports = { escapeHtml, renderContent, formatDate, truncate };
