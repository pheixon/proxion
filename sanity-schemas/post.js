export default {
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: r => r.required() },
    { name: 'date', title: 'Date', type: 'datetime', validation: r => r.required() },
    { name: 'content', title: 'Content (Markdown)', type: 'text', rows: 20 },
    { name: 'updatedAt', title: 'Last edited', type: 'datetime' },
  ],
  orderings: [
    { title: 'Newest first', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] },
  ],
};
