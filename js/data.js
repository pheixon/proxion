window.siteData = (() => {
  const config = window.SITE_CONFIG;

  const json = res => {
    if (!res.ok) throw new Error(`${res.status} ${res.url}`);
    return res.json();
  };

  if (config.dataSource !== 'sanity') {
    const get = path => fetch(`api/${path}`, { cache: 'no-store' });
    const withUpdatedAt = path => get(path).then(async res => ({ items: await json(res), updatedAt: res.headers.get('Last-Modified') }));
    return {
      posts: () => get('posts').then(json),
      phones: () => withUpdatedAt('phones'),
      projects: () => withUpdatedAt('projects'),
      search: q => get(`search?q=${encodeURIComponent(q)}`).then(json),
      youtube: {
        channel: id => get(`youtube/channels?id=${id}`).then(json),
        playlist: (playlistId, pageToken = '') => get(`youtube/playlist?playlistId=${playlistId}&pageToken=${pageToken}`).then(json),
        videos: ids => get(`youtube/videos?ids=${ids}`).then(json),
      },
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
      "items": *[_type == "phone"] | order(brand asc, model asc) { "id": _id, brand, model, type, year, image, "article": article == true, "clone": clone == true, aka },
      "updatedAt": ${latest('phone')}
    }`),
    projects: () => query(`{
      "items": *[_type == "project"] { "id": slug.current, title, type, year, image, "images": coalesce(images, []), url, description },
      "updatedAt": ${latest('project')}
    }`),
    search: q => query(`*[_type in ["post", "phone", "project"] && [title, content, description, brand, model, aka] match $q] {
      "source": _type,
      "id": select(_type == "post" => number, _type == "project" => slug.current, _id),
      "title": select(_type == "phone" => brand + " " + model, title),
      "detail": select(
        _type == "post" => content,
        _type == "project" => description,
        select(aka != null && aka != "" => "aka " + brand + " " + aka + " · ", "") + coalesce(string(year), "") + " · " + coalesce(type, "") + select(clone == true => " · clone", "")
      )
    }`, { q: `${q}*` }),
    youtube: {
      channel: id => youtube('channels', { part: 'statistics', id }),
      playlist: (playlistId, pageToken = '') => youtube('playlistItems', { part: 'snippet', playlistId, maxResults: 50, pageToken }),
      videos: ids => youtube('videos', { part: 'liveStreamingDetails', id: ids }),
    },
  };
})();
