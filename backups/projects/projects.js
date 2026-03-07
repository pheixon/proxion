const PROJECTS_URL = "./projects.json";
const ITEMS_PER_BATCH = 6;

let allProjects = [];
let currentSort = "type";
let sectionState = {};

document.addEventListener("DOMContentLoaded", () => {
  injectSortBar();
  loadProjects();
});

function injectSortBar() {
  const sortContainer = document.querySelector(".sort-bar-container");

  sortContainer.innerHTML = `
    <div class="sort-bar">
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
}

async function loadProjects() {
  try {
    const res = await fetch(PROJECTS_URL, { cache: "no-store" });
    const data = await res.json();

    allProjects = data;

    updateTotalCount();   // still works
    render();

  } catch (err) {
    console.error("Failed to load projects.json", err);
  }
}

function render() {
  const container = document.getElementById("sections-container");

  container.classList.add("fade-out");

  setTimeout(() => {
    container.innerHTML = "";
    sectionState = {};

    if (currentSort === "type") renderByType();
    if (currentSort === "year") renderByYear();
    if (currentSort === "title") renderByTitle();

    void container.offsetWidth;

    container.classList.remove("fade-out");
    container.classList.add("fade-in");

    setTimeout(() => {
      container.classList.remove("fade-in");
    }, 350);
  }, 350);
}

function renderByType() {
  const groups = {};

  allProjects.forEach(p => {
    const type = p.type || "other";
    if (!groups[type]) groups[type] = [];
    groups[type].push(p);
  });

  renderSections(groups, Object.keys(groups).sort());
}

function renderByYear() {
  const groups = {};

  allProjects.forEach(p => {
    let year = p.year || "unknown";
    year = String(year).replace("?", "");
    if (!groups[year]) groups[year] = [];
    groups[year].push(p);
  });

  const orderedYears = Object.keys(groups)
    .map(y => (y === "unknown" ? y : Number(y)))
    .sort((a, b) => {
      if (a === "unknown") return 1;
      if (b === "unknown") return -1;
      return b - a;
    });

  renderSections(groups, orderedYears);
}

function renderByTitle() {
  const groups = {};

  allProjects.forEach(p => {
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

  const ordered = Object.keys(groups).sort();
  renderSections(groups, ordered);
}

function renderSections(groups, orderedKeys) {
  const container = document.getElementById("sections-container");

  orderedKeys.forEach(key => {
    const projects = groups[key];
    if (!projects.length) return;

    const section = document.createElement("section");
    section.className = "category";

    section.innerHTML = `
      <h2>${key} <span class="video-count">· ${projects.length} ${projects.length === 1 ? "project" : "projects"}</span></h2>
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
  const { projects, rendered, grid, loadBtn } = state;

  const next = projects.slice(rendered, rendered + ITEMS_PER_BATCH);

  next.forEach(p => grid.appendChild(createProjectCard(p)));

  state.rendered += next.length;

  if (state.rendered >= projects.length) {
    loadBtn.classList.add("hidden");
  }
}

function createProjectCard(project) {
  const card = document.createElement("div");
  card.className = "video";

  const hasPhoto = project.image && project.image.trim() !== "";

  let yearText = "unknown";
  if (project.year) {
    const raw = String(project.year);
    yearText = raw.endsWith("?")
      ? `circa ${raw.replace("?", "")}`
      : raw;
  }

  card.innerHTML = `
    <img class="thumbnail" src="${hasPhoto ? project.image : "./placeholder.png"}">
    <div class="video-info">
      <div class="video-title">${project.title}</div>
      <div class="video-date">
        released ${yearText} · ${project.type || "other"}
      </div>
      ${
        project.url
          ? `<div class="watch-btn purple">more info →</div>`
          : `<div class="no-article">no project page yet</div>`
      }
    </div>
  `;

  if (project.url) {
    card.querySelector(".watch-btn").onclick = () => {
      const container = document.getElementById("sections-container");
      container.classList.add("fade-out");
      setTimeout(() => {
        window.location.href = `./project.html?id=${project.id}`;
      }, 250);
    };
  }

  return card;
}

function updateTotalCount() {
  const totalEl = document.getElementById("projects-total");
  if (!totalEl) return;

  const total = allProjects.length;
  totalEl.textContent = `${total} ${total === 1 ? "project" : "projects"} total`;
}