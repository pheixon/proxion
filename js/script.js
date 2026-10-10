const pageContent = document.getElementById('page-content');
const embedContainer = document.querySelector('.embed-container');
const container = document.querySelector('.button-container');
const items = document.querySelectorAll('.item');
const firstItem = items[0];

const TRANSITION_MS = 350;

const scrollbarColors = {
  videos: [231, 76, 60],
  collection: [46, 204, 113],
  projects: [155, 89, 182],
  blog: [243, 156, 18],
  socials: [26, 188, 156],
  about: [232, 67, 147],
};

const menuItems = [
  null,
  { page: 'pages/videos.html', hash: 'videos', scripts: ['js/videos.js'] },
  { page: 'pages/collection.html', hash: 'collection', scripts: ['js/collection.js'] },
  { page: 'pages/projects.html', hash: 'projects', scripts: ['js/projects.js'] },
  { page: 'pages/blog.html', hash: 'blog', scripts: ['js/blog.js'] },
  { page: 'pages/socials.html', hash: 'socials', scripts: ['js/socials.js'] },
  { page: 'pages/about.html', hash: 'about', scripts: ['js/about.js'] },
];

let currentPage = null;
let loadedScripts = [];
let pageScope = null;

// Page scripts outlive their page; once it is replaced, their timers and fetches go silent.
function createPageScope() {
  let alive = true;
  const cleanups = [];
  const hang = new Promise(() => {});
  const gate = value => (alive ? value : hang);
  return {
    setTimeout: (fn, ms, ...args) => window.setTimeout(() => alive && fn(...args), ms),
    requestAnimationFrame: fn => window.requestAnimationFrame(time => alive && fn(time)),
    fetch: (...args) => window.fetch(...args).then(res => {
      ['json', 'text'].forEach(method => {
        const read = res[method].bind(res);
        res[method] = () => read().then(gate);
      });
      return gate(res);
    }, err => {
      if (alive) throw err;
      return hang;
    }),
    listen(target, type, fn, options) {
      EventTarget.prototype.addEventListener.call(target, type, fn, options);
      cleanups.push(() => target.removeEventListener(type, fn, options));
    },
    dispose() {
      alive = false;
      cleanups.forEach(cleanup => cleanup());
    },
  };
}

function wrapPageScript(code) {
  return `(function(scope) {
    var setTimeout = scope.setTimeout, requestAnimationFrame = scope.requestAnimationFrame, fetch = scope.fetch;
    document.addEventListener = function(type, fn, options) {
      if (type === 'DOMContentLoaded') return fn();
      scope.listen(document, type, fn, options);
    };
    window.addEventListener = function(type, fn, options) {
      scope.listen(window, type, fn, options);
    };
    try {
      ${code}
    } finally {
      delete document.addEventListener;
      delete window.addEventListener;
    }
  })(window.__pageScope);`;
}

async function loadPage(menuItem) {
  const [html, ...codes] = await Promise.all(
    [menuItem.page, ...menuItem.scripts.map(src => `${src}?t=${Date.now()}`)]
      .map(url => fetch(url).then(res => res.text()))
  );
  if (currentPage !== menuItem.page) return false;
  clearPage();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Extract inline styles from <head>
  const inlineStyles = doc.querySelectorAll('head style');
  if (inlineStyles.length) {
    const style = document.createElement('style');
    style.id = 'page-inline-styles';
    inlineStyles.forEach(s => (style.textContent += s.textContent));
    document.head.appendChild(style);
  }

  // Insert body content
  pageContent.innerHTML = doc.body.innerHTML;
  pageContent.className = doc.body.className || '';

  // Remove got-stuck containers (only needed for standalone access)
  pageContent.querySelectorAll('.got-stuck').forEach(el => el.remove());

  pageScope = createPageScope();
  window.__pageScope = pageScope;
  codes.forEach(code => {
    const script = document.createElement('script');
    script.textContent = wrapPageScript(code);
    document.body.appendChild(script);
    loadedScripts.push(script);
  });
  return true;
}

function clearPage() {
  pageScope?.dispose();
  pageScope = null;
  pageContent.innerHTML = '';
  pageContent.className = '';
  document.getElementById('page-inline-styles')?.remove();
  loadedScripts.forEach(s => s.remove());
  loadedScripts = [];
}

function updateBackdropWidth() {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbarWidth > 0) {
    document.documentElement.style.setProperty('--backdrop-width', `calc(100vw - ${scrollbarWidth}px)`);
  } else {
    document.documentElement.style.removeProperty('--backdrop-width');
  }
}

new ResizeObserver(updateBackdropWidth).observe(document.documentElement);

items.forEach((item, index) => {
  item.addEventListener('click', () => {
    const isSelectedMode = container.classList.contains('selected');
    const isAlreadySelected = item.classList.contains('selected');
    const isFirst = item.classList.contains('first');

    if (isSelectedMode && isAlreadySelected && !isFirst) return;

    if (isFirst && isSelectedMode) {
      document.querySelector('.sort-bar')?.classList.remove('visible');
      embedContainer.classList.remove('active');
      container.classList.remove('selected');
      items.forEach(i => {
        i.classList.remove('selected');
        i.classList.remove('active');
      });
      firstItem.classList.add('active');
      currentPage = null;
      document.documentElement.style.removeProperty('--scrollbar-thumb');

      setTimeout(() => {
        if (currentPage) return;
        clearPage();
        window.scrollTo({ top: 0 });
        if (location.hash) history.pushState(null, '', window.location.pathname);
        document.documentElement.style.removeProperty('--backdrop-width');
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
      document.querySelector('.sort-bar')?.classList.remove('visible');
      embedContainer.classList.remove('active');
      currentPage = menuItem.page;

      setTimeout(async () => {
        if (currentPage !== menuItem.page) return;
        document.body.style.overflow = 'hidden';
        window.scrollTo({ top: 0 });
        const rgb = scrollbarColors[menuItem.hash];
        if (rgb) {
          document.documentElement.style.setProperty('--scrollbar-thumb', `rgba(${rgb}, 1)`);
        }
        const loaded = await loadPage(menuItem);
        document.body.style.overflow = '';
        if (!loaded) return;
        embedContainer.classList.add('active');
        setTimeout(() => {
          document.querySelector('.sort-bar')?.classList.add('visible');
          updateBackdropWidth();
          setTimeout(updateBackdropWidth, 500);
        }, 350);
      }, TRANSITION_MS);

      if (location.hash !== `#${menuItem.hash}`) history.pushState(null, '', `#${menuItem.hash}`);
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

  const controls = document.getElementById('bottom-controls');
  const searchBtn = document.getElementById('global-search-btn');
  const searchInput = document.getElementById('global-search-input');
  const searchResults = document.getElementById('global-search-results');
  let searchTimeout = null;

  searchBtn?.addEventListener('click', () => {
    if (controls.classList.contains('searching')) {
      closeGlobalSearch();
    } else {
      controls.classList.add('searching');
      searchInput.focus();
    }
  });

  function closeGlobalSearch() {
    controls.classList.remove('searching');
    searchInput.value = '';
    searchResults.innerHTML = '';
    searchResults.classList.remove('active');
    searchResults.classList.remove('fade-out');
    container.style.opacity = '';
    container.style.pointerEvents = '';
  }

  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      const q = searchInput.value.trim();
      if (!q) {
        searchResults.innerHTML = '';
        searchResults.classList.remove('active');
        container.style.opacity = '';
        container.style.pointerEvents = '';
        return;
      }
      const res = await fetch(`api/search?q=${encodeURIComponent(q)}`);
      const results = await res.json();
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      setTimeout(() => {
        searchResults.classList.add('active');
        if (!results.length) {
          searchResults.innerHTML = '<div class="global-search-empty">no results</div>';
          return;
        }
        const sourceLabels = { post: 'blog', phone: 'collection', project: 'projects' };
        const sourceHashes = { post: 'blog', phone: 'collection', project: 'projects' };
        searchResults.innerHTML = results
          .map(r => {
            const detail = (r.detail || '')
              .replace(/\[button:([^\]]*)\]/g, '$1')
              .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
              .replace(/[#*_`>~\[\]]/g, '')
              .replace(/\n+/g, ' ')
              .trim()
              .slice(0, 100);
            return `
            <div class="global-search-result" data-source="${escapeHtml(r.source)}" data-id="${escapeHtml(r.id)}">
              <div class="global-search-result-info">
                <div class="global-search-result-title">${escapeHtml(r.title)}</div>
                ${detail ? `<div class="global-search-result-detail">${escapeHtml(detail)}${r.detail.length > 100 ? '...' : ''}</div>` : ''}
              </div>
              <span class="global-search-result-source">${escapeHtml(sourceLabels[r.source] || r.source)}</span>
            </div>
          `;
          })
          .join('');
        searchResults.querySelectorAll('.global-search-result').forEach(el => {
          el.addEventListener('click', () => {
            const hash = sourceHashes[el.dataset.source];
            searchResults.classList.add('fade-out');
            setTimeout(() => {
              closeGlobalSearch();
              if (hash) navigateToHash(hash);
            }, 300);
          });
        });
      }, 300);
    }, 250);
  });

  searchInput?.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeGlobalSearch();
  });

  searchInput?.addEventListener('blur', e => {
    if (e.relatedTarget === searchBtn) return;
    if (!searchInput.value) closeGlobalSearch();
  });

  const themeToggle = document.getElementById('theme-toggle');
  themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    if (next === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', next);
    }
    localStorage.setItem('proxion:theme', next);
  });

  const THEMES = ['proxion', 'retro', 'luna', 'aero', 'liquid-glass'];

  function loadLiquidGlass(theme) {
    if (theme !== 'liquid-glass' || document.getElementById('liquid-glass-js')) return;
    const script = document.createElement('script');
    script.id = 'liquid-glass-js';
    script.src = 'js/liquid-glass.js';
    document.head.appendChild(script);
  }

  function activateThemeSelect() {
    localStorage.setItem('proxion:konami', '1');
    if (document.getElementById('theme-select')) return;
    const select = document.createElement('select');
    select.id = 'theme-select';
    select.className = 'bottom-btn';
    THEMES.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
    const current = document.documentElement.getAttribute('data-theme');
    select.value = THEMES.includes(current) ? current : 'proxion';
    select.addEventListener('change', () => {
      const v = select.value;
      if (v === 'proxion') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('proxion:theme', 'dark');
        return;
      }
      const apply = () => {
        if (select.value !== v) return;
        document.documentElement.setAttribute('data-theme', v);
        localStorage.setItem('proxion:theme', v);
        loadLiquidGlass(v);
      };
      const link = loadThemeCss(v);
      if (link) link.onload = apply;
      else apply();
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'bottom-btn';
    closeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';
    closeBtn.addEventListener('click', () => {
      localStorage.removeItem('proxion:konami');
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('proxion:theme', 'dark');
      select.replaceWith(themeToggle);
      closeBtn.remove();
    });

    themeToggle.replaceWith(select);
    select.after(closeBtn);
  }

  if (localStorage.getItem('proxion:konami')) {
    activateThemeSelect();
  }
  loadLiquidGlass(document.documentElement.getAttribute('data-theme'));

  const konamiSequence = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','KeyB','KeyA'];
  let konamiIndex = 0;
  document.addEventListener('keydown', e => {
    if (e.code === konamiSequence[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiSequence.length) {
        konamiIndex = 0;
        document.body.style.transition = 'filter 0.3s';
        document.body.style.filter = 'brightness(2)';
        setTimeout(() => { document.body.style.filter = ''; }, 300);
        activateThemeSelect();
      }
    } else {
      konamiIndex = 0;
    }
  });
});

window.addEventListener('popstate', () => {
  if (!navigateToHash(window.location.hash.replace('#', ''))) {
    firstItem.click();
  }
});
