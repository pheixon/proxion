function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
}

function matchesSearch(query, ...fields) {
  const text = fields.join(' ').toLowerCase();
  return query.toLowerCase().split(/\s+/).every(word => text.includes(word));
}

document.addEventListener('error', e => {
  const img = e.target;
  if (!img.matches?.('img.thumbnail') || img.src.endsWith('/placeholder.svg')) return;
  img.removeAttribute('srcset');
  img.src = 'assets/images/placeholder.svg';
}, true);
