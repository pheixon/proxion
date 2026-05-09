const API_BASE = '/api';
const params = new URLSearchParams(window.location.search);
const adminMode = params.get('admin') === '1';

document.addEventListener('DOMContentLoaded', () => {
  const page = document.getElementById('page-fade');

  page.classList.add('fade-out');
  requestAnimationFrame(() => {
    page.classList.remove('fade-out');
    page.classList.add('fade-in');
  });

  loadBlog();

  if (adminMode) {
    adminLogin().then(ok => {
      if (ok) document.getElementById('editor').classList.remove('hidden');
    });
  }
});

async function adminLogin() {
  const existing = sessionStorage.getItem('blog_token');
  if (existing) return true;

  const pass = prompt('Enter admin password');
  if (!pass) return false;

  const res = await fetch(`${API_BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pass }),
  });

  if (!res.ok) {
    alert('Access denied');
    return false;
  }

  const { token } = await res.json();
  sessionStorage.setItem('blog_token', token);
  return true;
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${sessionStorage.getItem('blog_token')}`,
  };
}

let allPosts = [];

async function loadBlog() {
  try {
    const res = await fetch(`${API_BASE}/posts`);
    allPosts = await res.json();

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const from = urlParams.get('from');

    if (id) {
      const post = allPosts.find(p => String(p.id) === id);
      if (post) {
        renderSinglePost(post, from);
        return;
      }
    }

    injectSortBar();
    renderPosts(allPosts);
  } catch (err) {
    console.error('Failed to load posts', err);
    renderError();
  }
}

function injectSortBar() {
  const container = document.querySelector('.sort-bar-container');
  container.innerHTML = `
    <div class="sort-bar">
      <div class="blog-search-wrap">
        <input id="blogSearchInput" class="blog-search-input" type="text" placeholder="search posts..." />
        <button id="blogSearchBtn" class="blog-search-btn" aria-label="Search" tabindex="0">
          <svg class="icon-search" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/>
            <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <svg class="icon-cancel" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <span class="sort-label">sort by</span>
      <select id="sortSelect">
        <option value="newest" selected>newest first</option>
        <option value="oldest">oldest first</option>
      </select>
    </div>
  `;

  document.getElementById('sortSelect').addEventListener('change', () => {
    applyFilters();
  });

  document.getElementById('blogSearchBtn').addEventListener('click', () => {
    const input = document.getElementById('blogSearchInput');
    const btn = document.getElementById('blogSearchBtn');
    if (btn.classList.contains('cancel')) {
      closeSearch();
    } else {
      input.classList.add('active');
      btn.classList.add('cancel');
      input.focus();
    }
  });

  document.getElementById('blogSearchInput').addEventListener('input', () => applyFilters());

  document.getElementById('blogSearchInput').addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
  });

  document.getElementById('blogSearchInput').addEventListener('blur', e => {
    if (e.relatedTarget === document.getElementById('blogSearchBtn')) return;
    if (!document.getElementById('blogSearchInput').value) closeSearch();
  });
}

function closeSearch() {
  const input = document.getElementById('blogSearchInput');
  const btn = document.getElementById('blogSearchBtn');
  if (!input) return;
  input.value = '';
  input.classList.remove('active');
  btn.classList.remove('cancel');
  applyFilters();
}

function applyFilters() {
  const query = (document.getElementById('blogSearchInput')?.value || '').toLowerCase();
  const order = document.getElementById('sortSelect')?.value || 'newest';
  const container = document.getElementById('blog-container');
  const posts = container.querySelectorAll('.blog-post');

  if (!posts.length) {
    let filtered = query
      ? allPosts.filter(p => p.title.toLowerCase().includes(query) || p.content.toLowerCase().includes(query))
      : [...allPosts];
    filtered.sort((a, b) => (order === 'newest' ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date)));
    renderPosts(filtered);
    return;
  }

  const matchIds = new Set(
    (query ? allPosts.filter(p => p.title.toLowerCase().includes(query) || p.content.toLowerCase().includes(query)) : allPosts)
      .map(p => String(p.id))
  );

  posts.forEach(el => {
    const id = el.querySelector('.blog-id')?.textContent.replace('post #', '');
    el.style.display = matchIds.has(id) ? '' : 'none';
  });

  const visible = [...posts].filter(el => el.style.display !== 'none');
  if (order === 'oldest') {
    visible.reverse().forEach(el => container.appendChild(el));
  } else {
    visible.forEach(el => container.appendChild(el));
  }

  const loadBtn = document.getElementById('load-more-btn');
  if (loadBtn) container.appendChild(loadBtn);
}

function formatDate(iso) {
  return new Date(iso)
    .toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .replace(',', '')
    .replace(', ', ' at ');
}

const PAGE_SIZE = 5;

function renderPosts(posts, append = false) {
  const container = document.getElementById('blog-container');
  if (!append) container.innerHTML = '';

  const existing = container.querySelectorAll('.blog-post').length;
  const slice = posts.slice(existing, existing + PAGE_SIZE);

  slice.forEach(post => {
    const el = document.createElement('section');
    el.className = 'category blog-post';

    const dateStr = `posted ${formatDate(post.date)}${post.updated_at ? ` · last edited ${formatDate(post.updated_at)}` : ''}`;
    const html = renderMarkdownWithButtons(post.content);

    el.innerHTML = `
      <div class="blog-meta">
        <div class="blog-id">post #${post.id}</div>
        <div class="blog-share" data-id="${post.id}">share</div>
      </div>
      <h2 class="blog-title">${post.title}</h2>
      <div class="blog-date">${dateStr}</div>
      <div class="blog-content">${html}</div>
    `;

    container.appendChild(el);

    el.querySelector('.blog-id').addEventListener('click', () => {
      history.pushState(null, '', `?id=${post.id}`);
      renderSinglePost(post);
    });

    if (adminMode) {
      const editBtn = document.createElement('div');
      editBtn.className = 'blog-admin-btn';
      editBtn.textContent = 'edit';
      editBtn.onclick = () => editPost(post, el);

      const deleteBtn = document.createElement('div');
      deleteBtn.className = 'blog-admin-btn delete';
      deleteBtn.textContent = 'delete';
      deleteBtn.onclick = () => deletePost(post.id);

      el.appendChild(editBtn);
      el.appendChild(deleteBtn);
    }
  });

  wireBlogButtons();
  wireShareButtons();

  const oldBtn = document.getElementById('load-more-btn');
  if (oldBtn) oldBtn.remove();

  const shown = container.querySelectorAll('.blog-post').length;
  if (shown < posts.length) {
    const btn = document.createElement('div');
    btn.id = 'load-more-btn';
    btn.className = 'load-more label orange blog-load-more';
    btn.textContent = 'load more';
    btn.onclick = () => renderPosts(posts, true);
    container.appendChild(btn);
  }
}

function renderMarkdownWithButtons(md) {
  md = md.replace(/\[button:(.*?)\]/gi, (_, label) => {
    const key = label.trim().toLowerCase();

    const map = {
      'my videos': { hash: '#videos', color: 'red' },
      'my collection': { hash: '#collection', color: 'green' },
      'my projects': { hash: '#projects', color: 'purple' },
      'my blog': { hash: '#blog', color: 'orange' },
    };

    const btn = map[key];
    if (!btn) return label;

    return `<span class="watch-btn ${btn.color} blog-inline-btn" data-hash="${btn.hash}">${label} →</span>`;
  });

  return marked.parse(md);
}

function wireBlogButtons() {
  document.querySelectorAll('.blog-inline-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const hash = btn.dataset.hash;
      if (window.parent && window.parent !== window) {
        window.parent.location.hash = hash;
      } else {
        window.location.hash = hash;
      }
    });
  });
}

function wireShareButtons() {
  document.querySelectorAll('.blog-share').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const shareUrl = `${window.location.origin}/pages/blog.html?id=${id}&from=share`;

      try {
        await navigator.clipboard.writeText(shareUrl);
        btn.textContent = 'copied!';
        setTimeout(() => (btn.textContent = 'share'), 1200);
      } catch (err) {
        console.error('Clipboard failed', err);
      }
    });
  });
}

function wireSingleNav() {
  const btn = document.querySelector('.blog-nav-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const action = btn.dataset.action;

    if (action === 'back') {
      history.pushState(null, '', window.location.pathname);
      loadBlog();
    }

    if (action === 'home') {
      const baseUrl =
        window.parent && window.parent !== window
          ? window.parent.location.origin + window.parent.location.pathname
          : window.location.origin + '/index.html';
      window.location.href = baseUrl;
    }
  });
}

function renderError() {
  const container = document.getElementById('blog-container');
  container.innerHTML = `
    <section class="category">
      <h2>oops</h2>
      <div class="video-info">Failed to load blog posts.</div>
    </section>
  `;
}

function renderSinglePost(post, from) {
  const container = document.getElementById('blog-container');
  container.innerHTML = '';

  const dateStr = `posted ${formatDate(post.date)}${post.updated_at ? ` · last edited ${formatDate(post.updated_at)}` : ''}`;
  const html = renderMarkdownWithButtons(post.content);

  const brandSVG = `
  <svg class="brand-svg" width="1951" height="446" viewBox="0 0 1951 446" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1228.32 53.76V0L1294.56 0V53.76L1228.32 53.76ZM1228.32 348.48V94.08H1294.56V348.48H1228.32Z" fill="#f5f5f5"/>
    <path d="M884.453 348.463L998.693 217.423L892.613 94.0625H978.053L1043.33 176.623L1110.05 94.0625H1195.49L1088.45 217.423L1203.17 348.463H1114.85L1043.33 258.223L969.893 348.463H884.453Z" fill="#f5f5f5"/>
    <path d="M557.734 221.292C557.734 151.212 601.414 84.4922 715.174 84.4922C828.934 84.4922 872.614 151.212 872.614 221.292C872.614 291.852 828.934 358.092 715.174 358.092C601.414 358.092 557.734 291.852 557.734 221.292ZM626.854 221.292C626.854 265.452 651.334 307.212 715.174 307.212C779.014 307.212 803.494 265.452 803.494 221.292C803.494 177.132 779.014 135.372 715.174 135.372C651.334 135.372 626.854 177.132 626.854 221.292Z" fill="#f5f5f5"/>
    <path d="M346.562 348.464V94.0637H412.803V143.504H413.763C432.003 114.704 458.403 87.3438 509.763 87.3438C519.843 87.3438 527.043 88.3037 536.163 89.7437V155.024C517.443 149.264 505.443 148.784 493.923 148.784C460.323 148.784 412.803 166.064 412.803 225.584V348.464H346.562Z" fill="#f5f5f5"/>
    <path d="M0.15625 445.424L0.15625 94.0637H66.3962V130.544H67.3563C87.0363 99.8238 124.476 87.3438 164.796 87.3438C261.756 87.3438 303.996 157.904 303.996 222.224C303.996 287.504 261.756 358.064 164.796 358.064C111.996 358.064 72.6363 328.784 67.3563 313.424H66.3962L66.3962 445.424H0.15625ZM148.956 138.224C87.0363 138.224 63.5163 179.984 63.5163 222.224C63.5163 265.904 87.0363 307.184 148.956 307.184C211.836 307.184 234.876 265.904 234.876 222.224C234.876 179.984 211.836 138.224 148.956 138.224Z" fill="#f5f5f5"/>
    <path d="M1674.82 348.464V94.0637H1741.06V132.464H1742.02C1763.62 105.104 1796.74 87.3438 1842.34 87.3438C1897.54 87.3438 1950.34 106.544 1950.34 175.664V348.464H1884.1V196.784C1884.1 169.424 1874.98 138.224 1820.26 138.224C1785.7 138.224 1741.06 157.424 1741.06 211.664V348.464H1674.82Z" fill="#f5f5f5"/>
    <path d="M1327.19 221.292C1327.19 151.212 1370.87 84.4922 1484.63 84.4922C1598.39 84.4922 1642.07 151.212 1642.07 221.292C1642.07 291.852 1598.39 358.092 1484.63 358.092C1370.87 358.092 1327.19 291.852 1327.19 221.292ZM1396.31 221.292C1396.31 265.452 1420.79 307.212 1484.63 307.212C1548.47 307.212 1572.95 265.452 1572.95 221.292C1572.95 177.132 1548.47 135.372 1484.63 135.372C1420.79 135.372 1396.31 177.132 1396.31 221.292Z" fill="#f5f5f5"/>
  </svg>
  `;

  const actionButton =
    from === 'share'
      ? `<div class="watch-btn orange blog-nav-btn" data-action="home">visit ${brandSVG}'s website</div>`
      : `<div class="watch-btn orange blog-nav-btn" data-action="back">← back to blog</div>`;

  container.innerHTML = `
    <section class="category blog-post single">
      <div class="blog-meta">
        <span class="blog-id">post #${post.id}</span>
        <span class="blog-share" data-id="${post.id}">share</span>
      </div>
      <h2 class="blog-title">${post.title}</h2>
      <div class="blog-date">${dateStr}</div>
      <div class="blog-content">${html}</div>
      <div class="blog-nav">
        ${actionButton}
      </div>
    </section>
  `;

  wireBlogButtons();
  wireShareButtons();
  wireSingleNav();
}

window.addEventListener('popstate', () => {
  loadBlog();
});

document.getElementById('publish-post')?.addEventListener('click', publishPost);

async function publishPost() {
  const title = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();

  if (!title || !content) {
    alert('Title and content required');
    return;
  }

  await fetch(`${API_BASE}/posts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ title, content }),
  });

  document.getElementById('post-title').value = '';
  document.getElementById('post-content').value = '';
  document.getElementById('preview').innerHTML = '';

  loadBlog();
}

function editPost(post, el) {
  el.innerHTML = `
    <div class="blog-meta">
      <div class="blog-id">post #${post.id}</div>
    </div>
    <input class="inline-edit-title" type="text" value="${post.title.replace(/"/g, '&quot;')}">
    <textarea class="inline-edit-content">${post.content}</textarea>
    <div class="post-preview inline-edit-preview"></div>
    <div class="inline-edit-actions">
      <span class="blog-admin-btn inline-save">save</span>
      <span class="blog-admin-btn inline-cancel">cancel</span>
    </div>
  `;

  const textarea = el.querySelector('.inline-edit-content');
  const preview = el.querySelector('.inline-edit-preview');

  preview.innerHTML = marked.parse(textarea.value);
  textarea.addEventListener('input', () => {
    preview.innerHTML = marked.parse(textarea.value);
  });

  el.querySelector('.inline-save').onclick = async () => {
    const title = el.querySelector('.inline-edit-title').value.trim();
    const content = textarea.value.trim();
    if (!title || !content) return;
    await fetch(`${API_BASE}/posts/${post.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ title, content }),
    });
    loadBlog();
  };

  el.querySelector('.inline-cancel').onclick = () => loadBlog();
}

async function deletePost(id) {
  if (!confirm('Delete this post?')) return;

  await fetch(`${API_BASE}/posts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  loadBlog();
}

const contentInput = document.getElementById('post-content');
const preview = document.getElementById('preview');

contentInput?.addEventListener('input', () => {
  preview.innerHTML = marked.parse(contentInput.value);
});
