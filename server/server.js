require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const path = require('path');

const app = express();
const db = new Database(process.env.DB_PATH || 'blog.db');
const SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

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

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(header.slice(7), SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/auth', (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong password' });
  const token = jwt.sign({ admin: true }, SECRET, { expiresIn: '7d' });
  res.json({ token });
});

app.get('/api/posts', (_req, res) => {
  res.json(db.prepare('SELECT * FROM posts ORDER BY date DESC').all());
});

app.get('/api/posts/:id', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json(post);
});

app.post('/api/posts', auth, (req, res) => {
  const { title, date, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title, content required' });
  const { lastInsertRowid } = db.prepare('INSERT INTO posts (title, date, content) VALUES (?, ?, ?)').run(
    title, date || new Date().toISOString(), content
  );
  res.json({ ok: true, id: lastInsertRowid });
});

app.put('/api/posts/:id', auth, (req, res) => {
  const { title, content } = req.body;
  db.prepare('UPDATE posts SET title = ?, content = ?, updated_at = ? WHERE id = ?').run(
    title, content, new Date().toISOString(), req.params.id
  );
  res.json({ ok: true });
});

app.delete('/api/posts/:id', auth, (req, res) => {
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/phones', auth, (req, res) => {
  const { brand, model, type, year, image, article, clone, aka } = req.body;
  if (!brand || !model) return res.status(400).json({ error: 'brand and model required' });
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO phones (brand, model, type, year, image, article, clone, aka) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(brand, model, type || null, year || null, image || '', article ? 1 : 0, clone ? 1 : 0, aka || '');
  res.json({ ok: true, id: lastInsertRowid });
});

app.put('/api/phones/:id', auth, (req, res) => {
  const { brand, model, type, year, image, article, clone, aka } = req.body;
  db.prepare(
    'UPDATE phones SET brand=?, model=?, type=?, year=?, image=?, article=?, clone=?, aka=? WHERE id=?'
  ).run(brand, model, type || null, year || null, image || '', article ? 1 : 0, clone ? 1 : 0, aka || '', req.params.id);
  res.json({ ok: true });
});

app.delete('/api/phones/:id', auth, (req, res) => {
  db.prepare('DELETE FROM phones WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/phones', (_req, res) => {
  const rows = db.prepare('SELECT * FROM phones ORDER BY brand, model').all();
  res.json(rows.map(r => ({ ...r, article: !!r.article, clone: !!r.clone })));
});

app.get('/api/projects', (_req, res) => {
  const rows = db.prepare('SELECT * FROM projects').all();
  res.json(rows.map(r => ({ ...r, images: r.images ? JSON.parse(r.images) : [] })));
});

app.post('/api/projects', auth, (req, res) => {
  const { id, title, type, year, image, images, url, description } = req.body;
  if (!id || !title) return res.status(400).json({ error: 'id and title required' });
  db.prepare(
    'INSERT INTO projects (id, title, type, year, image, images, url, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, title, type || null, year || null, image || '', images ? JSON.stringify(images) : null, url || '', description || '');
  res.json({ ok: true, id });
});

app.put('/api/projects/:id', auth, (req, res) => {
  const { title, type, year, image, images, url, description } = req.body;
  db.prepare(
    'UPDATE projects SET title=?, type=?, year=?, image=?, images=?, url=?, description=? WHERE id=?'
  ).run(title, type || null, year || null, image || '', images ? JSON.stringify(images) : null, url || '', description || '', req.params.id);
  res.json({ ok: true });
});

app.delete('/api/projects/:id', auth, (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
