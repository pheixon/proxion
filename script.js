const embedFrame = document.getElementById('embed-frame');
const embedContainer = document.querySelector('.embed-container');

const pages = {
  1: './videos.html',
  2: './collection.html',
  3: './projects.html',
  4: './blog.html',
  5: './socials.html',
  6: './about.html',
};

const pageHashes = {
  1: 'videos',
  2: 'collection',
  3: 'projects',
  4: 'blog',
  5: 'socials',
  6: 'about',
};

const container = document.querySelector('.button-container');
const items = document.querySelectorAll('.item');
const firstItem = items[0];

const TRANSITION_MS = 350;

items.forEach((item, index) => {
  item.addEventListener('mouseenter', () => {
    if (!item.classList.contains('first') && !container.classList.contains('selected')) {
      firstItem.classList.add('collapsed');
    }
  });

  item.addEventListener('mouseleave', () => {
    if (!item.classList.contains('first') && !container.classList.contains('selected')) {
      firstItem.classList.remove('collapsed');
    }
  });

  item.addEventListener('click', () => {
    const isSelectedMode = container.classList.contains('selected');
    const isAlreadySelected = item.classList.contains('selected');
    const isFirst = item.classList.contains('first');

    if (isSelectedMode && isAlreadySelected && !isFirst) return;

    // Home button — return to center
    if (isFirst && isSelectedMode) {
      embedContainer.classList.remove('active');
      container.classList.remove('selected');
      items.forEach(i => {
        i.classList.remove('selected');
        i.classList.remove('active');
      });
      firstItem.classList.add('active');

      setTimeout(() => {
        embedFrame.src = '';
        history.pushState(null, '', window.location.pathname);
      }, TRANSITION_MS);

      return;
    }

    if (isFirst) return;

    // Select a menu item
    container.classList.add('selected');
    items.forEach(i => {
      i.classList.remove('selected');
      i.classList.remove('active');
    });
    item.classList.add('selected');

    if (pages[index] && embedFrame.src !== pages[index]) {
      embedContainer.classList.remove('active');

      setTimeout(() => {
        embedFrame.src = pages[index];
        embedContainer.classList.add('active');
      }, TRANSITION_MS);

      const hash = pageHashes[index];
      if (hash) history.pushState(null, '', `#${hash}`);
    }
  });
});

// Open correct page on load with hash
document.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash.replace('#', '');
  if (!hash) return;
  const index = Object.values(pageHashes).indexOf(hash);
  if (index !== -1) {
    const item = items[index + 1];
    if (item) item.click();
  }
});

// Browser back/forward
window.addEventListener('popstate', () => {
  const hash = window.location.hash.replace('#', '');
  const index = Object.values(pageHashes).indexOf(hash);
  if (index !== -1) {
    const item = items[index + 1];
    if (item) item.click();
  } else {
    firstItem.click();
  }
});
