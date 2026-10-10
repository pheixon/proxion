// Usage: node import-sanity.js
// Replaces posts, phones and projects in blog.db with the published Sanity content (backs up blog.db first).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Database = require('better-sqlite3');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8'), context);
const { projectId, dataset, apiVersion } = context.window.SITE_CONFIG.sanity;
const DB_PATH = process.env.DB_PATH || 'blog.db';

const QUERY = `{
  "posts": *[_type == "post"] { number, title, date, content, updatedAt },
  "phones": *[_type == "phone"] { _id, brand, model, type, year, image, article, clone, aka },
  "projects": *[_type == "project"] { "id": slug.current, title, type, year, image, images, url, description }
}`;

(async () => {
  const res = await fetch(`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(QUERY)}`);
  if (!res.ok) throw new Error(`Sanity responded ${res.status}`);
  const { posts, phones, projects } = (await res.json()).result;

  const phoneId = id => Number(/^phone-(\d+)$/.exec(id)?.[1]) || null;
  phones.sort((a, b) => (phoneId(a._id) === null) - (phoneId(b._id) === null));

  fs.copyFileSync(DB_PATH, `${DB_PATH}.bak`);
  const db = new Database(DB_PATH);
  db.transaction(() => {
    db.exec('DELETE FROM posts; DELETE FROM phones; DELETE FROM projects;');
    const post = db.prepare('INSERT INTO posts (id, title, date, content, updated_at) VALUES (?, ?, ?, ?, ?)');
    posts.forEach(p => post.run(p.number, p.title, p.date, p.content, p.updatedAt ?? null));
    const phone = db.prepare('INSERT INTO phones (id, brand, model, type, year, image, article, clone, aka) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    phones.forEach(p => phone.run(phoneId(p._id), p.brand, p.model, p.type ?? null, p.year ?? null, p.image ?? '', p.article ? 1 : 0, p.clone ? 1 : 0, p.aka ?? ''));
    const project = db.prepare('INSERT INTO projects (id, title, type, year, image, images, url, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    projects.forEach(p => project.run(p.id, p.title, p.type ?? null, p.year ?? null, p.image ?? '', p.images ? JSON.stringify(p.images) : null, p.url ?? '', p.description ?? ''));
  })();

  console.log(`imported ${posts.length} posts, ${phones.length} phones, ${projects.length} projects (backup: ${DB_PATH}.bak)`);
})();
