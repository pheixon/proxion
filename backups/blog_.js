const BLOG_URL = "./blog.json";

document.addEventListener("DOMContentLoaded", () => {
  const page = document.getElementById("page-fade");

  page.classList.add("fade-out");
  requestAnimationFrame(() => {
    page.classList.remove("fade-out");
    page.classList.add("fade-in");
  });

  loadBlog();
});

async function loadBlog() {
  try {
    const res = await fetch(BLOG_URL, { cache: "no-store" });
    const posts = await res.json();

    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
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
      <h2 class="blog-title">${post.title}</h2>
      <div class="blog-date">posted ${formatted}</div>
      <div class="blog-content">${html}</div>
    `;

    container.appendChild(el);
  });

  wireBlogButtons();
}

function renderMarkdownWithButtons(md) {
  let html = marked.parse(md);

  // Custom button syntax: [button:my videos]
  html = html.replace(/\[button:(.*?)\]/gi, (_, label) => {
    const key = label.trim().toLowerCase();

    const map = {
      "my videos":    { hash: "#videos",    color: "red"    },
      "my collection":{ hash: "#collection",color: "green"  },
      "my projects":  { hash: "#projects",  color: "purple" },
      "my blog":      { hash: "#blog",      color: "orange" }
    };

    const btn = map[key];
    if (!btn) return label;

    return `
      <div class="watch-btn ${btn.color} blog-btn" data-hash="${btn.hash}">
        ${label}
      </div>
    `;
  });

  return html;
}

function wireBlogButtons() {
  document.querySelectorAll(".blog-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const hash = btn.dataset.hash;

      // If embedded in iframe → control parent page
      if (window.parent && window.parent !== window) {
        window.parent.location.hash = hash;
      } 
      // Fallback if opened standalone
      else {
        window.location.hash = hash;
      }
    });
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