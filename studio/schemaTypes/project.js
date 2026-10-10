export default {
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: r => r.required() },
    {
      name: 'slug',
      title: 'ID',
      description: 'Used in links (?id=...)',
      type: 'slug',
      options: { source: 'title' },
      validation: r => r.required(),
    },
    { name: 'type', title: 'Type', type: 'string' },
    { name: 'year', title: 'Year', description: '2024, or 2024? if approximate', type: 'string' },
    { name: 'image', title: 'Cover Image URL', type: 'string' },
    { name: 'images', title: 'Gallery Image URLs', type: 'array', of: [{ type: 'string' }] },
    { name: 'url', title: 'Project URL', type: 'string' },
    { name: 'description', title: 'Description', type: 'text', rows: 10 },
  ],
  preview: {
    select: { title: 'title', subtitle: 'type' },
  },
};
