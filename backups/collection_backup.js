// =====================================================
// CONFIG
// =====================================================
const DATA_URL = "./phones.json"; // your phone database
const PHONES_PER_BATCH = 6;

// =====================================================
// STATE
// =====================================================
let allPhones = [];
let currentSort = "brand";
let sectionState = {};

// =====================================================
// INIT
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
  injectSortBar();
  loadPhones();
});

// =====================================================
// SORT BAR
// =====================================================
function injectSortBar() {
  const sortContainer = document.querySelector(".sort-bar-container");

  sortContainer.innerHTML = `
    <div class="sort-bar">
      <span class="sort-label">sort by</span>
      <select id="sortSelect">
        <option value="brand" selected>brand</option>
        <option value="type">type</option>
        <option value="year">release year</option>
      </select>
    </div>
  `;

  document.getElementById("sortSelect").addEventListener("change", e => {
    currentSort = e.target.value;
    render();
  });
}

// =====================================================
// LOAD DATA
// =====================================================
async function loadPhones() {
  try {
    const res = await fetch(DATA_URL);
    allPhones = await res.json();
    render();
  } catch (err) {
    console.error("Failed to load phones.json", err);
  }
}

// =====================================================
// RENDER ROUTER
// =====================================================
function render() {
  const container = document.getElementById("sections-container");

  container.classList.add("fade-out");

  setTimeout(() => {
    sectionState = {};
    container.innerHTML = "";

    if (currentSort === "brand") renderByBrand();
    if (currentSort === "type") renderByType();
    if (currentSort === "year") renderByYear();

    void container.offsetWidth;

    container.classList.remove("fade-out");
    container.classList.add("fade-in");

    setTimeout(() => container.classList.remove("fade-in"), 350);
  }, 350);
}

// =====================================================
// SORT MODES
// =====================================================
function renderByBrand() {
  const groups = {};
  groups.clones = [];

  allPhones.forEach(p => {
    if (p.clone) {
      groups.clones.push(p);
      return;
    }

    if (!groups[p.brand]) groups[p.brand] = [];
    groups[p.brand].push(p);
  });

  const orderedKeys = Object.keys(groups)
    .filter(k => k !== "clones")
    .sort((a, b) => a.localeCompare(b));

  if (groups.clones.length) {
    orderedKeys.push("clones");
  }

  renderSections(groups, orderedKeys);
}

function renderByType() {
  const groups = {};

  allPhones.forEach(p => {
    const type = p.type || "other";
    if (!groups[type]) groups[type] = [];
    groups[type].push(p);
  });

  renderSections(groups, Object.keys(groups).sort());
}

function renderByYear() {
  const groups = {};

  allPhones.forEach(p => {
    const year = p.year || "unknown";
    if (!groups[year]) groups[year] = [];
    groups[year].push(p);
  });

  const orderedYears = Object.keys(groups)
    .map(y => (y === "unknown" ? y : Number(y)))
    .sort((a, b) => {
      if (a === "unknown") return 1;
      if (b === "unknown") return -1;
      return b - a; // newest first
    });

  renderSections(groups, orderedYears);
}

// =====================================================
// SECTION RENDERING
// =====================================================
function renderSections(groups, orderedKeys) {
  const container = document.getElementById("sections-container");

  orderedKeys.forEach(key => {
    const phones = groups[key];
    if (!phones.length) return;

    const section = document.createElement("section");
    section.className = "category";

    section.innerHTML = `
      <h2>
        ${key}
        <span class="video-count">
          · ${phones.length} ${phones.length === 1 ? "phone" : "phones"}
        </span>
      </h2>
      <div class="videos-grid"></div>
      <div class="load-more label green">load more</div>
    `;

    container.appendChild(section);

    const grid = section.querySelector(".videos-grid");
    const loadBtn = section.querySelector(".load-more");

    sectionState[key] = {
      phones,
      rendered: 0,
      grid,
      loadBtn
    };

    renderNextBatch(key);
    loadBtn.onclick = () => renderNextBatch(key);
  });
}

// =====================================================
// PAGINATION
// =====================================================
function renderNextBatch(key) {
  const state = sectionState[key];
  const { phones, rendered, grid, loadBtn } = state;

  if (loadBtn.classList.contains("loading")) return;

  loadBtn.classList.add("loading");
  const originalText = loadBtn.textContent;
  loadBtn.textContent = "loading...";

  setTimeout(() => {
    const next = phones.slice(rendered, rendered + PHONES_PER_BATCH);

    next.forEach(phone => {
      const card = createPhoneCard(phone);
      grid.appendChild(card);
    });

    state.rendered += next.length;

    loadBtn.classList.remove("loading");
    loadBtn.textContent = originalText;

    if (state.rendered >= phones.length) {
      loadBtn.classList.add("hidden");
    }
  }, 150);
}

// =====================================================
// PHONE CARD
// =====================================================
function createPhoneCard(phone) {
  const card = document.createElement("div");
  card.className = "video";

  const hasPhoto = phone.image && phone.image.trim() !== "";

  const wikiSlug = `${phone.brand} ${phone.model}`.replace(/\s+/g, "_");
  const viewUrl = `https://lpcwiki.miraheze.org/wiki/${encodeURIComponent(wikiSlug)}`;
  const editUrl = `${viewUrl}?action=edit`;

  card.innerHTML = `
    <img class="thumbnail" src="${hasPhoto ? phone.image : "./placeholder.png"}">
    <div class="video-info">
      <div class="video-title">${phone.brand} ${phone.model}</div>
      <div class="video-date">${phone.year || "unknown year"} · ${phone.type || "unknown type"}</div>

      ${
        phone.article
          ? `<div class="watch-btn green">find out more →</div>`
          : `
            <div class="no-article">no wiki article yet</div>
            <div class="watch-btn green">want to create it?</div>
          `
      }
    </div>
  `;

  if (phone.article) {
    card.querySelector(".watch-btn").onclick = () => {
      window.open(viewUrl, "_blank");
    };
  } else {
    card.querySelector(".watch-btn").onclick = () => {
      window.open(editUrl, "_blank");
    };
  }

  return card;
}
