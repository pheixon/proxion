// Sanity-ready data layer. Inactive until config below is filled in.
// 1. Create a free Sanity project at https://www.sanity.io/manage
// 2. Fill in projectId + dataset below
// 3. Set window.__SANITY__.enabled = true at the top of any page that should use Sanity
// 4. Existing fetch('/api/posts') etc. calls can then be swapped for sanity.getPosts() etc.

window.__SANITY__ = {
  projectId: '',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
  token: '',
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
    const headers = {};
    if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`;
    const res = await fetch(url(q, params), { headers });
    const { result } = await res.json();
    return result;
  }

  async function mutate(mutations) {
    if (!cfg.token) throw new Error('Sanity token required for writes');
    const res = await fetch(
      `https://${cfg.projectId}.api.sanity.io/v${cfg.apiVersion}/data/mutate/${cfg.dataset}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.token}` },
        body: JSON.stringify({ mutations }),
      }
    );
    return res.json();
  }

  const POST_PROJ = '{ "id": _id, title, date, "content": content, "updated_at": updatedAt }';
  const PHONE_PROJ = '{ "id": _id, brand, model, type, year, image, article, clone, aka }';
  const PROJECT_PROJ = '{ "id": _id, title, type, year, image, images, url, description }';

  window.sanity = {
    enabled: () => cfg.enabled && !!cfg.projectId,

    getPosts: () => query(`*[_type=="post"] | order(date desc) ${POST_PROJ}`),
    getPhones: () => query(`*[_type=="phone"] | order(year asc) ${PHONE_PROJ}`),
    getProjects: () => query(`*[_type=="project"] | order(year desc) ${PROJECT_PROJ}`),

    createPost: doc => mutate([{ create: { _type: 'post', ...doc } }]),
    updatePost: (id, patch) => mutate([{ patch: { id, set: patch } }]),
    deletePost: id => mutate([{ delete: { id } }]),

    createPhone: doc => mutate([{ create: { _type: 'phone', ...doc } }]),
    updatePhone: (id, patch) => mutate([{ patch: { id, set: patch } }]),
    deletePhone: id => mutate([{ delete: { id } }]),

    createProject: doc => mutate([{ create: { _type: 'project', ...doc } }]),
    updateProject: (id, patch) => mutate([{ patch: { id, set: patch } }]),
    deleteProject: id => mutate([{ delete: { id } }]),
  };
})();
