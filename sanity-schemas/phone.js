export default {
  name: 'phone',
  title: 'Phone',
  type: 'document',
  fields: [
    { name: 'brand', title: 'Brand', type: 'string', validation: r => r.required() },
    { name: 'model', title: 'Model', type: 'string', validation: r => r.required() },
    { name: 'type', title: 'Type', type: 'string', options: { list: ['bar', 'flip', 'slider', 'qwerty', 'smartphone', 'other'] } },
    { name: 'year', title: 'Year', type: 'number' },
    { name: 'image', title: 'Image URL', type: 'string' },
    { name: 'article', title: 'Has Article', type: 'boolean', initialValue: false },
    { name: 'clone', title: 'Clone', type: 'boolean', initialValue: false },
    { name: 'aka', title: 'Also Known As', type: 'string' },
  ],
  preview: {
    select: { title: 'model', subtitle: 'brand', year: 'year' },
    prepare: ({ title, subtitle, year }) => ({ title: `${subtitle} ${title}`, subtitle: year }),
  },
};
