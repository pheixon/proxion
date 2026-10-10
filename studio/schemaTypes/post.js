export default {
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  fields: [
    {
      name: 'number',
      title: 'Post number',
      description: 'Shown as "post #N" and used in share links',
      type: 'number',
      validation: r => r.required().integer().positive(),
      initialValue: async (_params, { getClient }) =>
        (await getClient({ apiVersion: '2025-01-01' }).fetch('coalesce(math::max(*[_type == "post"].number), 0)')) + 1,
    },
    { name: 'title', title: 'Title', type: 'string', validation: r => r.required() },
    { name: 'date', title: 'Date', type: 'datetime', initialValue: () => new Date().toISOString(), validation: r => r.required() },
    { name: 'content', title: 'Content (Markdown)', type: 'text', rows: 20, validation: r => r.required() },
    { name: 'updatedAt', title: 'Last edited', type: 'datetime' },
  ],
  orderings: [
    { title: 'Newest first', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'title', number: 'number' },
    prepare: ({ title, number }) => ({ title, subtitle: `post #${number}` }),
  },
};
