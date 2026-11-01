export default {
  name: 'phone',
  title: 'Phone',
  type: 'document',
  fields: [
    { name: 'brand', title: 'Brand', type: 'string', validation: r => r.required() },
    { name: 'model', title: 'Model', type: 'string', validation: r => r.required() },
    { name: 'type', title: 'Type', type: 'reference', to: [{ type: 'phoneType' }] },
    { name: 'year', title: 'Year', description: '2004, or 2004? if approximate', type: 'string' },
    {
      name: 'photos',
      title: 'Photos',
      description: 'The first photo is shown on the card, tapping it cycles through the rest',
      type: 'array',
      of: [{ type: 'image' }],
      options: { layout: 'grid' },
    },
    { name: 'image', title: 'Image URL', description: 'Only used when no photos are uploaded', type: 'string' },
    { name: 'aka', title: 'Also Known As', type: 'string' },
    { name: 'article', title: 'Has wiki article', description: 'Only a fallback: the site checks lpcwiki itself', type: 'boolean', initialValue: false },
    { name: 'clone', title: 'Clone', type: 'boolean', initialValue: false },
  ],
  orderings: [
    { title: 'Brand, model', name: 'brandModel', by: [{ field: 'brand', direction: 'asc' }, { field: 'model', direction: 'asc' }] },
  ],
  preview: {
    select: { brand: 'brand', model: 'model', year: 'year', media: 'photos.0' },
    prepare: ({ brand, model, year, media }) => ({ title: `${brand} ${model}`, subtitle: year, media }),
  },
};
