const pageContent = document.getElementById('page-content');
const embedContainer = document.querySelector('.embed-container');
const container = document.querySelector('.button-container');
const items = document.querySelectorAll('.item');
const firstItem = items[0];

const TRANSITION_MS = 350;

const menuItems = [
  null,
  { page: 'pages/videos.html', hash: 'videos', scripts: ['js/videos.js'] },
  { page: 'pages/collection.html', hash: 'collection', scripts: ['js/collection.js'] },
  { page: 'pages/projects.html', hash: 'projects', scripts: ['js/projects.js'] },
  { page: 'pages/blog.html', hash: 'blog', scripts: ['js/blog.js'] },
  { page: 'pages/socials.html', hash: 'socials', scripts: [] },
  { page: 'pages/about.html', hash: 'about', scripts: [] },
];

let currentPage = null;
let loadedScripts = [];

async function loadPage(menuItem) {
  const res = await fetch(menuItem.page);
  const html = await res.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Extract inline styles from <head>
  const inlineStyles = doc.querySelectorAll('head style');
  const styleId = 'page-inline-styles';
  document.getElementById(styleId)?.remove();
  if (inlineStyles.length) {
    const style = document.createElement('style');
    style.id = styleId;
    inlineStyles.forEach(s => style.textContent += s.textContent);
    document.head.appendChild(style);
  }

  // Insert body content
  pageContent.innerHTML = doc.body.innerHTML;
  pageContent.className = doc.body.className || '';

  // Remove got-stuck containers (only needed for standalone access)
  pageContent.querySelectorAll('.got-stuck').forEach(el => el.remove());

  // Remove old page scripts
  loadedScripts.forEach(s => s.remove());
  loadedScripts = [];

  // Load and execute scripts in isolated scope
  for (const src of menuItem.scripts) {
    const scriptRes = await fetch(src + '?t=' + Date.now());
    const code = await scriptRes.text();

    const wrapped = `(function() {
      var _orig = document.addEventListener;
      document.addEventListener = function(type, fn) {
        if (type === 'DOMContentLoaded') { fn(); return; }
        _orig.apply(document, arguments);
      };
      ${code}
      document.addEventListener = _orig;
    })();`;

    const script = document.createElement('script');
    script.textContent = wrapped;
    document.body.appendChild(script);
    loadedScripts.push(script);
  }
}

function clearPage() {
  pageContent.innerHTML = '';
  pageContent.className = '';
  document.getElementById('page-inline-styles')?.remove();
  loadedScripts.forEach(s => s.remove());
  loadedScripts = [];
}

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
        clearPage();
        window.scrollTo({ top: 0 });
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

      setTimeout(async () => {
        await loadPage(menuItem);
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
