export default {
  name: 'phone',
  title: 'Phone',
  type: 'document',
  fields: [
    { name: 'brand', title: 'Brand', type: 'string', validation: r => r.required() },
    { name: 'model', title: 'Model', type: 'string', validation: r => r.required() },
    { name: 'type', title: 'Type', description: 'e.g. bar, flip, slider, qwerty bar, flip smartphone', type: 'string' },
    { name: 'year', title: 'Year', description: '2004, or 2004? if approximate', type: 'string' },
    { name: 'image', title: 'Image URL', type: 'string' },
    { name: 'aka', title: 'Also Known As', type: 'string' },
    { name: 'article', title: 'Has wiki article', description: 'Updated automatically every Monday from lpcwiki', type: 'boolean', initialValue: false, readOnly: true },
    { name: 'clone', title: 'Clone', type: 'boolean', initialValue: false },
  ],
  orderings: [
    { title: 'Brand, model', name: 'brandModel', by: [{ field: 'brand', direction: 'asc' }, { field: 'model', direction: 'asc' }] },
  ],
  preview: {
    select: { brand: 'brand', model: 'model', year: 'year' },
    prepare: ({ brand, model, year }) => ({ title: `${brand} ${model}`, subtitle: year }),
  },
};
