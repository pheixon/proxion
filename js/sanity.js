// Sanity-ready data layer (read-only). Inactive until config below is filled in.
// 1. Create a free Sanity project at https://www.sanity.io/manage
// 2. Fill in projectId + dataset below
// 3. Set window.__SANITY__.enabled = true at the top of any page that should use Sanity
// 4. Existing fetch('api/posts') etc. calls can then be swapped for sanity.getPosts() etc.
// Content is edited in Sanity Studio: a write token must never ship in public JS.

window.__SANITY__ = {
  projectId: '',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
  enabled: false,
};

(function () {
  const cfg = window.__SANITY__;

  function url(query, params) {
    if (!cfg.projectId) throw new Error('Sanity projectId not set');
    const host = cfg.useCdn ? 'apicdn.sanity.io' : 'api.sanity.io';
    const base = `https://${cfg.projectId}.${host}/v${cfg.apiVersion}/data/query/${cfg.dataset}`;
    const qs = new URLSearchParams({ query });
    for (const k in params || {}) qs.append(`$${k}`, JSON.stringify(params[k]));
    return `${base}?${qs.toString()}`;
  }

  async function query(q, params) {
    const res = await fetch(url(q, params));
    const { result } = await res.json();
    return result;
  }

  const POST_PROJ = '{ "id": _id, title, date, "content": content, "updated_at": updatedAt }';
  const PHONE_PROJ = '{ "id": _id, brand, model, type, year, image, article, clone, aka }';
  const PROJECT_PROJ = '{ "id": _id, title, type, year, image, images, url, description }';

  window.sanity = {
    enabled: () => cfg.enabled && !!cfg.projectId,

    getPosts: () => query(`*[_type=="post"] | order(date desc) ${POST_PROJ}`),
    getPhones: () => query(`*[_type=="phone"] | order(year asc) ${PHONE_PROJ}`),
    getProjects: () => query(`*[_type=="project"] | order(year desc) ${PROJECT_PROJ}`),
  };
})();
