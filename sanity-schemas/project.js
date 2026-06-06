export default {
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: r => r.required() },
    { name: 'type', title: 'Type', type: 'string' },
    { name: 'year', title: 'Year', type: 'string' },
    { name: 'image', title: 'Cover Image URL', type: 'string' },
    { name: 'images', title: 'Gallery Images', type: 'array', of: [{ type: 'string' }] },
    { name: 'url', title: 'Project URL', type: 'string' },
    { name: 'description', title: 'Description (Markdown)', type: 'text', rows: 10 },
  ],
};
