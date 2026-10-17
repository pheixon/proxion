// Usage: node sync-wiki.js [--dry-run]   (writing needs SANITY_TOKEN, an Editor token)
// Sets each phone's "article" flag to whether lpcwiki has a page (or a redirect) titled "<brand> <model>".
const { projectId, dataset, apiVersion } = require('./sanity-config');

const token = process.env.SANITY_TOKEN;
const dryRun = process.argv.includes('--dry-run');
if (!token && !dryRun) throw new Error('SANITY_TOKEN is not set');

const API = `https://${projectId}.api.sanity.io/v${apiVersion}/data`;
const WIKI_API = 'https://lpcwiki.miraheze.org/w/api.php';
const auth = token ? { Authorization: `Bearer ${token}` } : {};

async function getJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${res.status} ${url}\n${(await res.text()).slice(0, 500)}`);
  return res.json();
}

async function existingTitles(titles) {
  const found = new Set();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const params = new URLSearchParams({ action: 'query', titles: batch.join('|'), redirects: 1, format: 'json', formatversion: 2 });
    const { query } = await getJson(`${WIKI_API}?${params}`, { headers: { 'User-Agent': 'proxion-wiki-sync (https://wideprism.pro/nodes/proxion/)' } });
    const normalized = new Map((query.normalized || []).map(n => [n.from, n.to]));
    const redirects = new Map((query.redirects || []).map(r => [r.from, r.to]));
    const pages = new Set(query.pages.filter(p => !p.missing && !p.invalid).map(p => p.title));
    batch.forEach(title => {
      let target = normalized.get(title) ?? title;
      for (let hops = 0; hops < 5 && redirects.has(target); hops++) target = redirects.get(target);
      if (pages.has(target)) found.add(title);
    });
  }
  return found;
}

(async () => {
  const params = new URLSearchParams({ query: '*[_type == "phone"] { _id, brand, model, article }', perspective: 'raw' });
  const { result: phones } = await getJson(`${API}/query/${dataset}?${params}`, { headers: auth });
  const title = p => `${p.brand} ${p.model}`;
  const found = await existingTitles([...new Set(phones.map(title))]);
  const changes = phones.filter(p => Boolean(p.article) !== found.has(title(p)));

  changes.forEach(p => console.log(`${found.has(title(p)) ? '+' : '-'} ${title(p)} (${p._id})`));
  if (dryRun || !changes.length) return console.log(`${changes.length} change(s)${dryRun ? ', dry run' : ''}`);

  await getJson(`${API}/mutate/${dataset}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations: changes.map(p => ({ patch: { id: p._id, set: { article: found.has(title(p)) } } })) }),
  });
  console.log(`updated ${changes.length} phone(s)`);
})();
