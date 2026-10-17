window.siteData = (() => {
  const config = window.SITE_CONFIG;

  const json = res => {
    if (!res.ok) throw new Error(`${res.status} ${res.url}`);
    return res.json();
  };

  const WIKI_CACHE = 'proxion:wiki';
  const WIKI_TTL = 24 * 60 * 60 * 1000;

  const wikiBatch = async titles => {
    const params = new URLSearchParams({ action: 'query', titles: titles.join('|'), redirects: 1, format: 'json', formatversion: 2, origin: '*' });
    const { query } = await fetch(`https://lpcwiki.miraheze.org/w/api.php?${params}`, { signal: AbortSignal.timeout(4000) }).then(json);
    const normalized = new Map((query.normalized || []).map(n => [n.from, n.to]));
    const redirects = new Map((query.redirects || []).map(r => [r.from, r.to]));
    const pages = new Set(query.pages.filter(p => !p.missing && !p.invalid).map(p => p.title));
    return titles.map(title => {
      let target = normalized.get(title) ?? title;
      for (let hops = 0; hops < 5 && redirects.has(target); hops++) target = redirects.get(target);
      return [title, pages.has(target)];
    });
  };

  const wikiArticles = async titles => {
    try {
      const cached = JSON.parse(localStorage.getItem(WIKI_CACHE));
      if (Date.now() - cached.time < WIKI_TTL) return cached.articles;
    } catch {}
    const batches = [];
    for (let i = 0; i < titles.length; i += 50) batches.push(wikiBatch(titles.slice(i, i + 50)).catch(() => null));
    const results = await Promise.all(batches);
    const articles = Object.fromEntries(results.filter(Boolean).flat());
    if (results.every(Boolean)) {
      try { localStorage.setItem(WIKI_CACHE, JSON.stringify({ time: Date.now(), articles })); } catch {}
    }
    return articles;
  };

  const withWikiArticles = async data => {
    const title = p => `${p.brand} ${p.model}`;
    const articles = await wikiArticles([...new Set(data.items.map(title))]);
    data.items.forEach(p => { p.article = articles[title(p)] ?? p.article; });
    return data;
  };

  const UPLOADS_CACHE = 'proxion:youtube_full_channel_cache_v3';
  const UPLOADS_TTL = 6 * 60 * 60 * 1000;

  const withUploads = api => ({
    ...api,
    uploads: async () => {
      try {
        const cached = JSON.parse(localStorage.getItem(UPLOADS_CACHE));
        if (Date.now() - cached.timestamp < UPLOADS_TTL) return cached.items;
      } catch {}
      const playlistId = 'UU' + config.youtubeChannelId.slice(2);
      let items = [];
      let pageToken = '';
      do {
        const data = await api.playlist(playlistId, pageToken);
        items = items.concat(data.items.filter(item => item.snippet.resourceId?.videoId));
        pageToken = data.nextPageToken || '';
      } while (pageToken);
      try { localStorage.setItem(UPLOADS_CACHE, JSON.stringify({ timestamp: Date.now(), items })); } catch {}
      return items;
    },
  });

  if (config.dataSource !== 'sanity') {
    const get = path => fetch(`api/${path}`, { cache: 'no-store' });
    const withUpdatedAt = path => get(path).then(async res => ({ items: await json(res), updatedAt: res.headers.get('Last-Modified') }));
    return {
      posts: () => get('posts').then(json),
      phones: () => withUpdatedAt('phones').then(withWikiArticles),
      projects: () => withUpdatedAt('projects'),
      search: q => get(`search?q=${encodeURIComponent(q)}`).then(json),
      youtube: withUploads({
        channel: id => get(`youtube/channels?id=${id}`).then(json),
        playlist: (playlistId, pageToken = '') => get(`youtube/playlist?playlistId=${playlistId}&pageToken=${pageToken}`).then(json),
        videos: ids => get(`youtube/videos?ids=${ids}`).then(json),
      }),
    };
  }

  const { projectId, dataset, apiVersion } = config.sanity;
  const query = (groq, params = {}) => {
    const url = new URL(`https://${projectId}.apicdn.sanity.io/v${apiVersion}/data/query/${dataset}`);
    url.searchParams.set('query', groq);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(`$${key}`, JSON.stringify(value)));
    return fetch(url).then(json).then(res => res.result);
  };
  const youtube = (endpoint, params) =>
    fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${new URLSearchParams({ ...params, key: config.youtubeApiKey })}`).then(json);
  const latest = type => `*[_type == "${type}"] | order(_updatedAt desc)[0]._updatedAt`;

  return {
    posts: () => query(`*[_type == "post"] | order(date desc) { "id": number, title, date, content, "updated_at": updatedAt }`),
    phones: () => query(`{
      "items": *[_type == "phone"] | order(brand asc, model asc) { "id": _id, brand, model, type, year, image, "images": photos[]{ "url": asset->url + "?w=480&h=640&fit=crop&auto=format" }[].url, "article": article == true, "clone": clone == true, aka },
      "updatedAt": ${latest('phone')}
    }`).then(withWikiArticles),
    projects: () => query(`{
      "items": *[_type == "project"] { "id": slug.current, title, type, year, image, "images": coalesce(images, []), url, description },
      "updatedAt": ${latest('project')}
    }`),
    search: q => query(`*[_type in ["post", "phone", "project"] && array::join(array::compact([title, content, description, brand, model, aka]), " ") match $q] {
      "source": _type,
      "id": select(_type == "post" => number, _type == "project" => slug.current, _id),
      "title": select(_type == "phone" => brand + " " + model, title),
      "detail": select(
        _type == "post" => content,
        _type == "project" => description,
        select(aka != null && aka != "" => "aka " + brand + " " + aka + " · ", "") + coalesce(string(year), "") + " · " + coalesce(type, "") + select(clone == true => " · clone", "")
      )
    }`, { q: q.trim().split(/\s+/).map(word => `${word}*`).join(' ') }),
    youtube: withUploads({
      channel: id => youtube('channels', { part: 'statistics', id }),
      playlist: (playlistId, pageToken = '') => youtube('playlistItems', { part: 'snippet', playlistId, maxResults: 50, pageToken }),
      videos: ids => youtube('videos', { part: 'liveStreamingDetails', id: ids }),
    }),
  };
})();
