// Usage: node export-sanity.js > content.ndjson   (then: npx sanity datasets import content.ndjson --dataset production --replace)
require('dotenv').config();
const Database = require('better-sqlite3');

const db = new Database(process.env.DB_PATH || 'blog.db', { readonly: true });
const text = value => (value === null || value === undefined || value === '' ? undefined : String(value).replace(/\.0$/, ''));
const emit = doc => process.stdout.write(JSON.stringify(doc) + '\n');

db.prepare('SELECT * FROM posts').all().forEach(p => emit({
  _id: `post-${p.id}`,
  _type: 'post',
  number: p.id,
  title: p.title,
  date: p.date,
  content: p.content,
  updatedAt: p.updated_at || undefined,
}));

db.prepare('SELECT * FROM phones').all().forEach(p => emit({
  _id: `phone-${p.id}`,
  _type: 'phone',
  brand: p.brand,
  model: text(p.model),
  type: text(p.type),
  year: text(p.year),
  image: text(p.image),
  article: !!p.article,
  clone: !!p.clone,
  aka: text(p.aka),
}));

db.prepare('SELECT * FROM projects').all().forEach(p => emit({
  _id: `project-${p.id}`,
  _type: 'project',
  slug: { _type: 'slug', current: p.id },
  title: p.title,
  type: text(p.type),
  year: text(p.year),
  image: text(p.image),
  images: p.images ? JSON.parse(p.images) : undefined,
  url: text(p.url),
  description: text(p.description),
}));
