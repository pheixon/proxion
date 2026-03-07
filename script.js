const embedFrame = document.getElementById('embed-frame');
const embedContainer = document.querySelector('.embed-container');
const container = document.querySelector('.button-container');
const items = document.querySelectorAll('.item');
const firstItem = items[0];

const TRANSITION_MS = 350;

const menuItems = [
  null,
  { page: './videos.html', hash: 'videos' },
  { page: './collection.html', hash: 'collection' },
  { page: './projects.html', hash: 'projects' },
  { page: './blog.html', hash: 'blog' },
  { page: './socials.html', hash: 'socials' },
  { page: './about.html', hash: 'about' },
];

let currentPage = null;

items.forEach((item, index) => {
  item.addEventListener('click', () => {
    const isSelectedMode = container.classList.contains('selected');
    const isAlreadySelected = item.classList.contains('selected');
    const isFirst = item.classList.contains('first');

    if (isSelectedMode && isAlreadySelected && !isFirst) return;

    if (isFirst && isSelectedMode) {
      embedContainer.classList.remove('active');
      container.classList.remove('selected');
      items.forEach(i => {
        i.classList.remove('selected');
        i.classList.remove('active');
      });
      firstItem.classList.add('active');
      currentPage = null;

      setTimeout(() => {
        embedFrame.src = '';
        history.pushState(null, '', window.location.pathname);
      }, TRANSITION_MS);

      return;
    }

    if (isFirst) return;

    const menuItem = menuItems[index];
    if (!menuItem) return;

    container.classList.add('selected');
    items.forEach(i => {
      i.classList.remove('selected');
      i.classList.remove('active');
    });
    item.classList.add('selected');

    if (menuItem.page !== currentPage) {
      embedContainer.classList.remove('active');
      currentPage = menuItem.page;

      setTimeout(() => {
        embedFrame.src = menuItem.page;
        embedContainer.classList.add('active');
      }, TRANSITION_MS);

      history.pushState(null, '', `#${menuItem.hash}`);
    }
  });
});

function navigateToHash(hash) {
  if (!hash) return false;
  const index = menuItems.findIndex(m => m && m.hash === hash);
  if (index !== -1) {
    items[index]?.click();
    return true;
  }
  return false;
}

document.addEventListener('DOMContentLoaded', () => {
  navigateToHash(window.location.hash.replace('#', ''));
});

window.addEventListener('popstate', () => {
  if (!navigateToHash(window.location.hash.replace('#', ''))) {
    firstItem.click();
  }
});
