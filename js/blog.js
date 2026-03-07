const BLOG_URL = "data/blog.json";
const params = new URLSearchParams(window.location.search);
const adminMode = params.get("admin") === "1";

document.addEventListener("DOMContentLoaded", () => {
  const page = document.getElementById("page-fade");

  page.classList.add("fade-out");
  requestAnimationFrame(() => {
    page.classList.remove("fade-out");
    page.classList.add("fade-in");
  });

  loadBlog();

  if (adminMode) {

    const alreadyLogged = sessionStorage.getItem("blog_admin");

    if (!alreadyLogged) {
      const pass = prompt("Enter admin password");

      if (pass !== "your-secret-password") {
        alert("Access denied");
        return;
      }

      sessionStorage.setItem("blog_admin", "true");
    }

    document.getElementById("editor").classList.remove("hidden");

  }

});

async function loadBlog() {
  try {
    const res = await fetch(BLOG_URL, { cache: "no-store" });
    const posts = await res.json();

    posts.sort((a, b) => b.id - a.id);

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const from = params.get("from");

    if (id) {
      const post = posts.find(p => String(p.id) === id);
      if (post) {
        renderSinglePost(post, from);
        return;
      }
    }

    renderPosts(posts);

  } catch (err) {
    console.error("Failed to load blog.json", err);
    renderError();
  }
}

function renderPosts(posts) {
  const container = document.getElementById("blog-container");
  container.innerHTML = "";

  posts.forEach(post => {
    const el = document.createElement("section");
    el.className = "category blog-post";

    const formatted = new Date(post.date).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric"
    });

    const html = renderMarkdownWithButtons(post.content);

    el.innerHTML = `
      <div class="blog-meta">
        <div class="blog-id">post #${post.id}</div>
        <div class="blog-share" data-id="${post.id}">share</div>
      </div>
      <h2 class="blog-title">${post.title}</h2>
      <div class="blog-date">posted ${formatted}</div>
      <div class="blog-content">${html}</div>
    `;

    container.appendChild(el);

    el.querySelector(".blog-id").addEventListener("click", () => {
      history.pushState(null, "", `?id=${post.id}`);
      renderSinglePost(post);

    if (adminMode) {

      const editBtn = document.createElement("div");
      editBtn.className = "blog-admin-btn";
      editBtn.textContent = "edit";

      editBtn.onclick = () => editPost(post.id);

      const deleteBtn = document.createElement("div");
      deleteBtn.className = "blog-admin-btn delete";
      deleteBtn.textContent = "delete";

      deleteBtn.onclick = () => deletePost(post.id);

      el.appendChild(editBtn);
      el.appendChild(deleteBtn);
    }

    });

  });

  wireBlogButtons();
  wireShareButtons();
}

function renderMarkdownWithButtons(md) {

  // 🔥 Replace BEFORE markdown parsing
  md = md.replace(/\[button:(.*?)\]/gi, (_, label) => {
    const key = label.trim().toLowerCase();

    const map = {
      "my videos":     { hash: "#videos",     color: "red"    },
      "my collection": { hash: "#collection", color: "green"  },
      "my projects":   { hash: "#projects",   color: "purple" },
      "my blog":       { hash: "#blog",       color: "orange" }
    };

    const btn = map[key];
    if (!btn) return label;

    // IMPORTANT: inline span, not div
    return `<span class="watch-btn ${btn.color} blog-inline-btn" data-hash="${btn.hash}">${label} →</span>`;
  });

  // Now parse markdown
  return marked.parse(md);
}

function wireBlogButtons() {
  document.querySelectorAll(".blog-inline-btn").forEach(btn => {
    btn.addEventListener("click", () => {
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
  document.querySelectorAll(".blog-share").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      // Build correct URL (works in iframe too)
      const baseUrl =
        window.location.origin + window.location.pathname;

      const shareUrl = `${baseUrl}?id=${id}&from=share`;

      try {
        await navigator.clipboard.writeText(shareUrl);
        btn.textContent = "copied!";
        setTimeout(() => btn.textContent = "share", 1200);
      } catch (err) {
        console.error("Clipboard failed", err);
      }
    });
  });
}

function wireSingleNav() {
  const btn = document.querySelector(".blog-nav-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const action = btn.dataset.action;

    if (action === "back") {
      history.pushState(null, "", window.location.pathname);
      loadBlog();
    }

    if (action === "home") {
      const baseUrl =
        window.parent && window.parent !== window
          ? window.parent.location.origin + window.parent.location.pathname
          : window.location.origin + "/index.html";

      window.location.href = baseUrl;
    }
  });
}

function renderError() {
  const container = document.getElementById("blog-container");
  container.innerHTML = `
    <section class="category">
      <h2>oops</h2>
      <div class="video-info">Failed to load blog posts.</div>
    </section>
  `;
}

function renderSinglePost(post, from) {
  const container = document.getElementById("blog-container");
  container.innerHTML = "";

  const formatted = new Date(post.date).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });

  const html = renderMarkdownWithButtons(post.content);

  // Detect entry method
  const cameFromSamePage =
    document.referrer &&
    document.referrer.includes(window.location.pathname);

  const brandSVG = `
  <svg width="1951" height="446" viewBox="0 0 1951 446" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1228.32 53.76V0L1294.56 0V53.76L1228.32 53.76ZM1228.32 348.48V94.08H1294.56V348.48H1228.32Z" fill="#f5f5f5"/>
    <path d="M884.453 348.463L998.693 217.423L892.613 94.0625H978.053L1043.33 176.623L1110.05 94.0625H1195.49L1088.45 217.423L1203.17 348.463H1114.85L1043.33 258.223L969.893 348.463H884.453Z" fill="#f5f5f5"/>
    <path d="M557.734 221.292C557.734 151.212 601.414 84.4922 715.174 84.4922C828.934 84.4922 872.614 151.212 872.614 221.292C872.614 291.852 828.934 358.092 715.174 358.092C601.414 358.092 557.734 291.852 557.734 221.292ZM626.854 221.292C626.854 265.452 651.334 307.212 715.174 307.212C779.014 307.212 803.494 265.452 803.494 221.292C803.494 177.132 779.014 135.372 715.174 135.372C651.334 135.372 626.854 177.132 626.854 221.292Z" fill="#f5f5f5"/>
    <path d="M346.562 348.464V94.0637H412.803V143.504H413.763C432.003 114.704 458.403 87.3438 509.763 87.3438C519.843 87.3438 527.043 88.3037 536.163 89.7437V155.024C517.443 149.264 505.443 148.784 493.923 148.784C460.323 148.784 412.803 166.064 412.803 225.584V348.464H346.562Z" fill="#f5f5f5"/>
    <path d="M0.15625 445.424L0.15625 94.0637H66.3962V130.544H67.3563C87.0363 99.8238 124.476 87.3438 164.796 87.3438C261.756 87.3438 303.996 157.904 303.996 222.224C303.996 287.504 261.756 358.064 164.796 358.064C111.996 358.064 72.6363 328.784 67.3563 313.424H66.3962L66.3962 445.424H0.15625ZM148.956 138.224C87.0363 138.224 63.5163 179.984 63.5163 222.224C63.5163 265.904 87.0363 307.184 148.956 307.184C211.836 307.184 234.876 265.904 234.876 222.224C234.876 179.984 211.836 138.224 148.956 138.224Z" fill="#f5f5f5"/>
    <path d="M1674.82 348.464V94.0637H1741.06V132.464H1742.02C1763.62 105.104 1796.74 87.3438 1842.34 87.3438C1897.54 87.3438 1950.34 106.544 1950.34 175.664V348.464H1884.1V196.784C1884.1 169.424 1874.98 138.224 1820.26 138.224C1785.7 138.224 1741.06 157.424 1741.06 211.664V348.464H1674.82Z" fill="#f5f5f5"/>
    <path d="M1327.19 221.292C1327.19 151.212 1370.87 84.4922 1484.63 84.4922C1598.39 84.4922 1642.07 151.212 1642.07 221.292C1642.07 291.852 1598.39 358.092 1484.63 358.092C1370.87 358.092 1327.19 291.852 1327.19 221.292ZM1396.31 221.292C1396.31 265.452 1420.79 307.212 1484.63 307.212C1548.47 307.212 1572.95 265.452 1572.95 221.292C1572.95 177.132 1548.47 135.372 1484.63 135.372C1420.79 135.372 1396.31 177.132 1396.31 221.292Z" fill="#f5f5f5"/>
  </svg>
  `;

  const actionButton = from === "share"
    ? `
      <div class="watch-btn orange blog-nav-btn" data-action="home">
        visit ${brandSVG}'s website
      </div>
      `
    : `
      <div class="watch-btn orange blog-nav-btn" data-action="back">
        ← back to blog
      </div>
      `;

  container.innerHTML = `
    <section class="category blog-post single">
      <div class="blog-meta">
        <span class="blog-id">post #${post.id}</span>
        <span class="blog-share" data-id="${post.id}">share</span>
      </div>
      <h2 class="blog-title">${post.title}</h2>
      <div class="blog-date">posted ${formatted}</div>
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

window.addEventListener("popstate", () => {
  loadBlog();
});

document.getElementById("publish-post")?.addEventListener("click", publishPost);

async function publishPost(){

const title = document.getElementById("post-title").value.trim();
const content = document.getElementById("post-content").value.trim();

if(!title || !content){
alert("Title and content required");
return;
}

const res = await fetch(BLOG_URL,{cache:"no-store"});
const posts = await res.json();

if(editingId){

const post = posts.find(p => p.id === editingId);

post.title = title;
post.content = content;

editingId = null;

}else{

const nextId = posts.length
? Math.max(...posts.map(p => p.id)) + 1
: 1;

posts.push({
id: nextId,
title,
date: new Date().toISOString(),
content
});

}

downloadJSON(posts);

}

function downloadJSON(data) {

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "blog.json";
  a.click();

  URL.revokeObjectURL(url);
}

const contentInput = document.getElementById("post-content");
const preview = document.getElementById("preview");

contentInput?.addEventListener("input", () => {
  preview.innerHTML = marked.parse(contentInput.value);
});

let editingId = null;

function editPost(id){

const post = blogPosts.find(p => p.id === id);

document.getElementById("post-title").value = post.title;
document.getElementById("post-content").value = post.content;

preview.innerHTML = marked.parse(post.content);

editingId = id;

window.scrollTo({top:0, behavior:"smooth"});
}

async function deletePost(id){

if(!confirm("Delete this post?")) return;

const res = await fetch(BLOG_URL,{cache:"no-store"});
const posts = await res.json();

const updated = posts.filter(p => p.id !== id);

downloadJSON(updated);

}