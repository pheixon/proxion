const ITEMS_PER_BATCH = 6;

let allProjects = [];
let currentSort = "type";
let sectionState = {};

const listView = document.getElementById("projects-list-view");
const projectView = document.getElementById("project-view");
const pageFade = document.getElementById("page-fade");

document.addEventListener("DOMContentLoaded", () => {
  injectSortBar();
  loadProjects();

  document.getElementById("back-btn")?.addEventListener("click", () => {
    switchToListView(true);
  });

  // Browser back / forward support
  window.addEventListener("popstate", () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (id) {
      openProjectById(id, false);
    } else {
      switchToListView(false);
    }
  });
});

async function loadProjects() {
  try {
    const { items, updatedAt } = await siteData.projects();
    allProjects = items;
    updateMeta(updatedAt);

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (allProjects.some(p => p.id === id)) {
      openProjectById(id, false);
    } else {
      render();
    }
  } catch (err) {
    console.error("Failed to load projects.json", err);
  }
}

/* ---------------- LIST RENDER ---------------- */

function render() {
  const container = document.getElementById("sections-container");

  container.classList.add("fade-out");

  setTimeout(() => {
    container.innerHTML = "";
    sectionState = {};

    if (currentSort === "type") renderByType();
    if (currentSort === "year") renderByYear();
    if (currentSort === "title") renderByTitle();

    updateMeta();

    void container.offsetWidth;

    container.classList.remove("fade-out");
    container.classList.add("fade-in");

    setTimeout(() => container.classList.remove("fade-in"), 300);
  }, 300);
}

function renderByType() {
  const groups = {};
  getFilteredProjects().forEach(p => {
    const type = p.type || "other";
    if (!groups[type]) groups[type] = [];
    groups[type].push(p);
  });
  renderSections(groups, Object.keys(groups).sort());
}

function renderByYear() {
  const groups = {};
  getFilteredProjects().forEach(p => {
    let year = p.year || "unknown";
    year = String(year).replace("?", "");
    if (!groups[year]) groups[year] = [];
    groups[year].push(p);
  });

  const ordered = Object.keys(groups).sort((a, b) => {
    if (a === "unknown") return 1;
    if (b === "unknown") return -1;
    return Number(b) - Number(a) || b.localeCompare(a);
  });

  renderSections(groups, ordered);
}

function renderByTitle() {
  const groups = {};
  getFilteredProjects().forEach(p => {
    const first = p.title.charAt(0).toUpperCase();
    const key = first >= "A" && first <= "Z" ? first : "#";
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  Object.keys(groups).forEach(k => {
    groups[k].sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
    );
  });

  renderSections(groups, Object.keys(groups).sort());
}

function renderSections(groups, orderedKeys) {
  const container = document.getElementById("sections-container");

  orderedKeys.forEach(key => {
    const projects = groups[key];
    if (!projects.length) return;

    const section = document.createElement("section");
    section.className = "category";

    section.innerHTML = `
      <h2>${escapeHtml(key)} <span class="video-count">· ${projects.length} ${projects.length === 1 ? "project" : "projects"}</span></h2>
      <div class="videos-grid"></div>
      <div class="load-more label purple">load more</div>
    `;

    container.appendChild(section);

    const grid = section.querySelector(".videos-grid");
    const loadBtn = section.querySelector(".load-more");

    sectionState[key] = { projects, rendered: 0, grid, loadBtn };
    renderNextBatch(key);
    loadBtn.onclick = () => renderNextBatch(key);
  });
}

function renderNextBatch(key) {
  const state = sectionState[key];
  const next = state.projects.slice(state.rendered, state.rendered + ITEMS_PER_BATCH);
  next.forEach(p => state.grid.appendChild(createProjectCard(p)));
  state.rendered += next.length;
  if (state.rendered >= state.projects.length) state.loadBtn.classList.add("hidden");
}

function projectImages(project) {
  return [...new Set([project.image, ...(Array.isArray(project.images) ? project.images : [])])].filter(Boolean);
}

function createProjectCard(project) {
  const card = document.createElement("div");
  card.className = "video";

  const images = projectImages(project);
  const hasPhoto = images.length > 0;

  let yearText = "unknown";
  if (project.year) {
    const raw = String(project.year);
    yearText = raw.endsWith("?") ? `circa ${raw.replace("?", "")}` : raw;
  }

  card.innerHTML = `
    <img class="thumbnail" src="${escapeHtml(hasPhoto ? images[0] : "assets/images/placeholder.svg")}">
    <div class="video-info">
      <div class="video-title">${escapeHtml(project.title)}</div>
      <div class="video-date">${escapeHtml(`released ${yearText} · ${project.type || "other"}`)}</div>
      ${project.url ? `<div class="watch-btn purple">more info →</div>` : `<div class="no-article">no project page yet</div>`}
    </div>
  `;

  card.querySelector(".watch-btn")?.addEventListener("click", () => {
    openProjectById(project.id, true);
  });

  return card;
}

/* ---------------- DETAIL VIEW ---------------- */

function openProjectById(id, pushState = true) {
  const project = allProjects.find(p => p.id === id);
  if (!project) return;

  pageFade.classList.add("fade-out");

  setTimeout(() => {
    listView.classList.add("hidden");
    projectView.classList.remove("hidden");

    renderSingleProject(project);

    pageFade.classList.remove("fade-out");
    pageFade.classList.add("fade-in");
    setTimeout(() => pageFade.classList.remove("fade-in"), 300);

    if (pushState) {
      const url = new URL(location.href);
      url.searchParams.set("id", id);
      history.pushState(null, "", url);
    }
  }, 300);
}

function switchToListView(pushState = true) {
  pageFade.classList.add("fade-out");

  setTimeout(() => {
    projectView.classList.add("hidden");
    listView.classList.remove("hidden");

    pageFade.classList.remove("fade-out");
    pageFade.classList.add("fade-in");
    setTimeout(() => pageFade.classList.remove("fade-in"), 300);

    if (pushState) {
      const url = new URL(location.href);
      url.searchParams.delete("id");
      history.pushState(null, "", url);
    }
  }, 300);
}

function renderSingleProject(project) {
  const container = document.getElementById("project-sections-container");
  container.innerHTML = "";

  const images = projectImages(project);

  let yearText = "unknown";
  if (project.year) {
    const raw = String(project.year);
    yearText = raw.endsWith("?") ? `circa ${raw.replace("?", "")}` : raw;
  }

  container.innerHTML = `
    <section class="category">
      <div class="videos-grid single-project">
        <div class="video large image-carousel">
          <div class="image-row">
            <div class="image-nav-btn prev hidden">←</div>
            <div class="image-wrapper">
              <img class="thumbnail clickable" src="${escapeHtml(images[0] || "assets/images/placeholder.svg")}">
              <div class="image-dots hidden">
                ${images.map((_, i) => `<div class="dot ${i === 0 ? "active" : ""}"></div>`).join("")}
              </div>
            </div>
            <div class="image-nav-btn next hidden">→</div>
          </div>

          <div class="video-info">
            <div class="video-title">${escapeHtml(project.title)}</div>
            <div class="video-date">${escapeHtml(`released ${yearText} · ${project.type || "other"}`)}</div>
            ${project.url ? `<div class="watch-btn purple" id="open-project">open project →</div>` : `<div class="no-article">no project page yet</div>`}
            <div class="project-description">${escapeHtml(project.description || "No description yet.")}</div>
          </div>
        </div>
      </div>
    </section>
  `;

  document.getElementById("open-project")?.addEventListener("click", () => {
    const { protocol } = new URL(project.url, document.baseURI);
    if (protocol === "http:" || protocol === "https:") window.open(project.url, "_blank");
  });

  setupCarousel(images);
}

/* ---------------- CAROUSEL ---------------- */

function setupCarousel(images) {
  if (images.length <= 1) return;

  let index = 0;
  const carousel = document.querySelector(".image-carousel");
  if (!carousel) return;

  const img = carousel.querySelector(".thumbnail");
  const prevBtn = carousel.querySelector(".image-nav-btn.prev");
  const nextBtn = carousel.querySelector(".image-nav-btn.next");
  const dots = carousel.querySelectorAll(".image-dots .dot");
  const dotsContainer = carousel.querySelector(".image-dots");

  prevBtn.classList.remove("hidden");
  nextBtn.classList.remove("hidden");
  dotsContainer.classList.remove("hidden");

  function update() {
    img.src = images[index];
    dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
  }

  prevBtn.onclick = () => { index = (index - 1 + images.length) % images.length; update(); };
  nextBtn.onclick = () => { index = (index + 1) % images.length; update(); };
  img.onclick = () => { index = (index + 1) % images.length; update(); };
}

/* ---------------- UI ---------------- */

let searchQuery = "";

function injectSortBar() {
  const sortContainer = document.querySelector(".sort-bar-container");
  sortContainer.innerHTML = `
    <div class="sort-bar">
      <div class="blog-search-wrap">
        <input id="pageSearchInput" class="blog-search-input" type="text" placeholder="search projects..." />
        <button id="pageSearchBtn" class="blog-search-btn" aria-label="Search" tabindex="0">
          <svg class="icon-search" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/><line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <svg class="icon-cancel" width="16" height="16" viewBox="0 0 16 16" fill="none"><line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>
      <span class="sort-label">sort by</span>
      <select id="sortSelect">
        <option value="type" selected>type</option>
        <option value="year">release year</option>
        <option value="title">title (a-z)</option>
      </select>
    </div>
  `;

  document.getElementById("sortSelect").addEventListener("change", e => {
    currentSort = e.target.value;
    render();
  });

  wirePageSearch();
}

function wirePageSearch() {
  const input = document.getElementById("pageSearchInput");
  const btn = document.getElementById("pageSearchBtn");

  btn.addEventListener("click", () => {
    if (btn.classList.contains("cancel")) {
      input.value = "";
      input.classList.remove("active");
      btn.classList.remove("cancel");
      if (searchQuery) {
        searchQuery = "";
        render();
      }
    } else {
      input.classList.add("active");
      btn.classList.add("cancel");
      input.focus();
    }
  });

  input.addEventListener("input", () => {
    searchQuery = input.value.toLowerCase();
    render();
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      input.value = "";
      input.classList.remove("active");
      btn.classList.remove("cancel");
      if (searchQuery) {
        searchQuery = "";
        render();
      }
    }
  });

  input.addEventListener("blur", e => {
    if (e.relatedTarget === btn) return;
    if (!input.value) {
      input.classList.remove("active");
      btn.classList.remove("cancel");
    }
  });
}

function getFilteredProjects() {
  if (!searchQuery) return allProjects;
  return allProjects.filter(p => matchesSearch(searchQuery, p.title, p.description, p.type));
}

let lastUpdatedHeader = null;

function updateMeta(header) {
  if (header !== undefined) lastUpdatedHeader = header;

  const totalEl = document.getElementById("projects-total");
  const updatedEl = document.getElementById("projects-updated");
  if (!totalEl || !updatedEl) return;

  if (searchQuery) {
    const found = getFilteredProjects().length;
    totalEl.textContent = `${found} ${found === 1 ? "project" : "projects"} found`;
    updatedEl.textContent = "";
    return;
  }

  totalEl.textContent = `${allProjects.length} ${allProjects.length === 1 ? "project" : "projects"} total`;

  if (lastUpdatedHeader) {
    const date = new Date(lastUpdatedHeader);
    updatedEl.textContent = ` · last updated ${date.toLocaleDateString("en-US", {
      month: "short", day: "2-digit", year: "numeric"
    })}`;
  } else {
    updatedEl.textContent = "";
  }
}