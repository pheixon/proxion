function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
}

document.addEventListener('error', e => {
  const img = e.target;
  if (img.matches?.('img.thumbnail') && !img.src.endsWith('/placeholder.png')) img.src = 'assets/images/placeholder.png';
}, true);
