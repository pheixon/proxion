function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
}
