const typeList = (name, title) => ({
  name,
  title,
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: r => r.required().custom(async (value, { document, getClient }) => {
        if (!value) return true;
        const id = document._id.replace(/^drafts\./, '');
        const taken = await getClient({ apiVersion: '2025-01-01' }).fetch(
          'count(*[_type == $type && lower(name) == lower($value) && !(_id in [$id, "drafts." + $id])])',
          { type: name, value, id },
        );
        return taken ? 'This type already exists' : true;
      }),
    },
  ],
  orderings: [{ title: 'Name', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] }],
});

export const phoneType = typeList('phoneType', 'Phone type');
export const projectType = typeList('projectType', 'Project type');
