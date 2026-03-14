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
  )
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

app.get('/api/posts', (req, res) => {
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
