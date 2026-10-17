function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
}

function matchesSearch(query, ...fields) {
  const text = fields.join(' ').toLowerCase();
  return query.toLowerCase().split(/\s+/).every(word => text.includes(word));
}

function wirePageSearch(onSearch) {
  const input = document.getElementById('pageSearchInput');
  const btn = document.getElementById('pageSearchBtn');
  const toggle = open => {
    input.classList.toggle('active', open);
    btn.classList.toggle('cancel', open);
  };
  const search = value => {
    const url = new URL(location.href);
    if (value) url.searchParams.set('q', value);
    else url.searchParams.delete('q');
    history.replaceState(history.state, '', url);
    onSearch(value.toLowerCase());
  };
  const clear = () => {
    toggle(false);
    if (!input.value) return;
    input.value = '';
    search('');
  };

  btn.addEventListener('click', () => {
    if (btn.classList.contains('cancel')) return clear();
    toggle(true);
    input.focus();
  });
  input.addEventListener('input', () => {
    if (input.value) toggle(true);
    search(input.value);
  });
  input.addEventListener('keydown', e => e.key === 'Escape' && clear());
  input.addEventListener('blur', e => {
    if (e.relatedTarget !== btn && !input.value) toggle(false);
  });

  const query = new URLSearchParams(location.search).get('q') || '';
  if (query) {
    input.value = query;
    toggle(true);
  }
  return query.toLowerCase();
}

function findPhone(title, phones) {
  const words = text => ` ${String(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
  const haystack = words(title);
  let match = null;
  phones.forEach(phone => {
    [`${phone.brand} ${phone.model}`, phone.aka && `${phone.brand} ${phone.aka}`].forEach(name => {
      if (name && name.length > (match?.name.length ?? 0) && haystack.includes(words(name))) match = { phone, name };
    });
  });
  return match;
}

document.addEventListener('error', e => {
  const img = e.target;
  if (!img.matches?.('img.thumbnail') || img.src.endsWith('/placeholder.svg')) return;
  img.removeAttribute('srcset');
  img.src = 'assets/images/placeholder.svg';
}, true);
