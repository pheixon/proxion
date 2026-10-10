require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');

const path = require('path');

const app = express();
const db = new Database(process.env.DB_PATH || 'blog.db');
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = path.join(__dirname, '..');

app.disable('x-powered-by');
app.set('trust proxy', 'loopback');
['css', 'js', 'pages', 'assets'].forEach(dir => app.use(`/${dir}`, express.static(path.join(ROOT, dir))));
app.get(['/', '/:page.html'], (req, res, next) =>
  res.sendFile(`${req.params.page || 'index'}.html`, { root: ROOT }, err => err && next())
);

function rateLimit(windowMs, max) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [ip, hit] of hits) if (now - hit.start > windowMs) hits.delete(ip);
    const hit = hits.get(req.ip) || { start: now, count: 0 };
    hits.set(req.ip, hit);
    if (++hit.count > max) return res.status(429).json({ error: 'Too many requests' });
    next();
  };
}

db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_at TEXT
  );
  CREATE TABLE IF NOT EXISTS phones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    type TEXT,
    year INTEGER,
    image TEXT,
    article INTEGER DEFAULT 0,
    clone INTEGER DEFAULT 0,
    aka TEXT
  );
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT,
    year TEXT,
    image TEXT,
    images TEXT,
    url TEXT,
    description TEXT
  );
`);

app.get('/api/posts', (_req, res) => {
  res.json(db.prepare('SELECT * FROM posts ORDER BY date DESC').all());
});

app.get('/api/posts/:id', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json(post);
});

function stripDotZero(v) {
  if (typeof v === 'string' && v.endsWith('.0')) return v.slice(0, -2);
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  if (typeof v === 'number') return Math.round(v);
  return v;
}

app.get('/api/phones', (_req, res) => {
  const rows = db.prepare('SELECT * FROM phones ORDER BY brand, model').all();
  res.json(rows.map(r => ({ ...r, model: stripDotZero(r.model), year: stripDotZero(r.year), article: !!r.article, clone: !!r.clone })));
});

app.get('/api/projects', (_req, res) => {
  const rows = db.prepare('SELECT * FROM projects').all();
  res.json(rows.map(r => ({ ...r, year: stripDotZero(r.year), images: r.images ? JSON.parse(r.images) : [] })));
});

app.get('/api/search', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) return res.json([]);
  const like = `%${q}%`;
  const posts = db.prepare("SELECT id, title, content as detail, 'post' as source FROM posts WHERE title LIKE ? OR content LIKE ?").all(like, like);
  const phones = db.prepare(`SELECT id, brand || ' ' || model as title,
    CASE WHEN aka IS NOT NULL AND aka != '' THEN 'aka ' || brand || ' ' || aka || ' · ' ELSE '' END
    || COALESCE(year,'')
    || ' · ' || type
    || CASE WHEN clone = 1 THEN ' · clone' ELSE '' END
    as detail, 'phone' as source
    FROM phones WHERE brand LIKE ? OR model LIKE ? OR aka LIKE ?`).all(like, like, like);
  const projects = db.prepare("SELECT id, title, description as detail, 'project' as source FROM projects WHERE title LIKE ? OR description LIKE ?").all(like, like);
  const all = [...posts, ...phones, ...projects].map(r => ({
    ...r,
    title: stripDotZero(r.title),
    detail: r.source === 'phone' ? r.detail.replace(/\b(\d+)\.0\b/g, '$1') : r.detail,
  }));
  res.json(all);
});

const YT_KEY = process.env.YOUTUBE_API_KEY;
const YT_CHANNELS = ['UCalOFAYtXcoCeVj48OB_w9w'];
const YT_PLAYLISTS = YT_CHANNELS.map(id => 'UU' + id.slice(2));
const YT_VIDEO_IDS = /^[\w-]{11}(,[\w-]{11}){0,49}$/;
const YT_PAGE_TOKEN = /^[\w-]*$/;
const YT_TTL = 10 * 60 * 1000;
const YT_CACHE_SIZE = 500;
const ytCache = new Map();
const ytLimit = rateLimit(60 * 1000, 60);

async function youtube(res, endpoint, params) {
  const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${new URLSearchParams({ ...params, key: YT_KEY })}`;
  const cached = ytCache.get(url);
  if (cached && Date.now() - cached.time < YT_TTL) return res.json(cached.data);
  try {
    const r = await fetch(url);
    const data = await r.json();
    if (r.ok) {
      if (ytCache.size >= YT_CACHE_SIZE) ytCache.delete(ytCache.keys().next().value);
      ytCache.set(url, { time: Date.now(), data });
    }
    if (!r.ok && cached) return res.json(cached.data);
    res.status(r.status).json(data);
  } catch {
    if (cached) return res.json(cached.data);
    res.status(502).json({ error: 'YouTube unavailable' });
  }
}

app.get('/api/youtube/playlist', ytLimit, (req, res) => {
  const { playlistId, pageToken = '' } = req.query;
  if (!YT_PLAYLISTS.includes(playlistId) || !YT_PAGE_TOKEN.test(pageToken)) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  youtube(res, 'playlistItems', { part: 'snippet', playlistId, maxResults: 50, pageToken });
});

app.get('/api/youtube/videos', ytLimit, (req, res) => {
  const { ids } = req.query;
  if (typeof ids !== 'string' || !YT_VIDEO_IDS.test(ids)) return res.status(400).json({ error: 'Invalid request' });
  youtube(res, 'videos', { part: 'liveStreamingDetails', id: ids });
});

app.get('/api/youtube/channels', ytLimit, (req, res) => {
  const { id } = req.query;
  if (!YT_CHANNELS.includes(id)) return res.status(400).json({ error: 'Invalid request' });
  youtube(res, 'channels', { part: 'statistics', id });
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.status(404).sendFile('404.html', { root: ROOT });
});

app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  if (req.path.startsWith('/api/')) return res.status(status).json({ error: status < 500 ? 'Bad request' : 'Server error' });
  res.status(status).sendFile(`${[403, 404].includes(status) ? status : 500}.html`, { root: ROOT });
});

app.listen(PORT, HOST, () => console.log(`Server running on http://${HOST}:${PORT}`));
