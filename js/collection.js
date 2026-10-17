// =====================================================
// CONFIG
// =====================================================
const PHONES_PER_BATCH = 6;

// =====================================================
// STATE
// =====================================================
let allPhones = [];
let videoNames = new Map();
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
      <div class="blog-search-wrap">
        <input id="pageSearchInput" class="blog-search-input" type="text" placeholder="search phones..." />
        <button id="pageSearchBtn" class="blog-search-btn" aria-label="Search" tabindex="0">
          <svg class="icon-search" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/><line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <svg class="icon-cancel" width="16" height="16" viewBox="0 0 16 16" fill="none"><line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>
      <span class="sort-label">sort by</span>
      <select id="sortSelect">
        <option value="brand" selected>brand</option>
        <option value="type">type</option>
        <option value="year">release year</option>
      </select>
      <div class="blog-search-wrap">
        <button id="randomPhone" class="blog-search-btn" aria-label="Random phone" title="random phone">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><circle cx="5.5" cy="5.5" r="1" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="10.5" cy="10.5" r="1" fill="currentColor"/></svg>
        </button>
      </div>
    </div>
  `;

  document.getElementById("sortSelect").addEventListener("change", e => {
    currentSort = e.target.value;
    render();
  });

  document.getElementById("randomPhone").addEventListener("click", () => {
    const phone = allPhones[Math.floor(Math.random() * allPhones.length)];
    if (!phone) return;
    const input = document.getElementById("pageSearchInput");
    input.value = `${phone.brand} ${phone.model}`;
    input.dispatchEvent(new Event("input"));
  });

  searchQuery = wirePageSearch(query => { searchQuery = query; render(); });
}

let searchQuery = "";

function getFilteredPhones() {
  if (!searchQuery) return allPhones;
  return allPhones.filter(p => matchesSearch(searchQuery, p.brand, p.model, p.aka, p.type, p.year));
}

// =====================================================
// LOAD DATA
// =====================================================
async function loadPhones() {
  try {
    const [{ items, updatedAt }, uploads] = await Promise.all([
      siteData.phones(),
      siteData.youtube.uploads().catch(() => [])
    ]);
    allPhones = items;
    uploads.forEach(item => {
      const match = findPhone(item.snippet.title, items);
      if (match && !videoNames.has(match.phone)) videoNames.set(match.phone, match.name);
    });
    updateMeta(updatedAt);

    updateTotalCount();
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
    if (!container.children.length) showEmptyState(container, "phones", "green", searchQuery);

    updateTotalCount();

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
  const groups = { clones: [] };

  getFilteredPhones().forEach(p => {
    if (p.clone) {
      groups.clones.push(p);
    } else {
      if (!groups[p.brand]) groups[p.brand] = [];
      groups[p.brand].push(p);
    }
  });

  const ordered = Object.keys(groups)
    .filter(k => k !== "clones")
    .sort();

  if (groups.clones.length) ordered.push("clones");

  renderSections(groups, ordered);
}

function renderByType() {
  const groups = {};

  getFilteredPhones().forEach(p => {
    const type = p.type || "other";
    if (!groups[type]) groups[type] = [];
    groups[type].push(p);
  });

  renderSections(groups, Object.keys(groups).sort());
}

function renderByYear() {
  const groups = {};

  getFilteredPhones().forEach(p => {
    let yearKey = "unknown";

    if (p.year) {
      if (typeof p.year === "string") {
        yearKey = p.year.replace("?", "").trim(); // "2013?" → "2013"
      } else {
        yearKey = String(p.year); // number → string key
      }
    }

    if (!groups[yearKey]) groups[yearKey] = [];
    groups[yearKey].push(p);
  });

  const orderedYears = Object.keys(groups)
    .map(y => (y === "unknown" ? y : Number(y)))
    .sort((a, b) => {
      if (a === "unknown") return 1;
      if (b === "unknown") return -1;
      return b - a; // newest first
    })
    .map(y => String(y)); // back to string keys

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
        ${escapeHtml(key)}
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
      grid.appendChild(createPhoneCard(phone));
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

  const images = Array.isArray(phone.images) && phone.images.length
    ? phone.images
    : (phone.image && String(phone.image).trim() !== "" ? [phone.image] : ["assets/images/placeholder.svg"]);

  const wikiSlug = encodeURIComponent(`${phone.brand} ${phone.model}`.replace(/\s+/g, "_"));
  const viewUrl = `https://lpcwiki.miraheze.org/wiki/${wikiSlug}`;
  const editUrl = `${viewUrl}?action=edit`;

  const metaParts = [];

  if (phone.aka !== null && phone.aka !== undefined && String(phone.aka).trim() !== "") {
    metaParts.push(`aka ${phone.brand} ${phone.aka}`);
  }

    // year (handle circa / approximate)
  let yearText = "unknown";

  if (phone.year !== null && phone.year !== undefined && String(phone.year).trim() !== "") {
    const rawYear = String(phone.year).trim();

    if (rawYear.endsWith("?")) {
      yearText = `circa ${rawYear.replace("?", "").trim()}`;
    } else {
      yearText = rawYear;
    }
  }

  metaParts.push(`released ${yearText}`);
  metaParts.push(`${phone.type || "unknown"} type`);

  if (phone.clone && currentSort !== "brand") {
    metaParts.push("clone");
  }

  const meta = metaParts.join(" · ");

  const dotsHTML = images.length > 1
    ? `<div class="image-dots">
         ${images.map((_, i) => `<span class="dot ${i === 0 ? "active" : ""}"></span>`).join("")}
       </div>`
    : "";

  card.innerHTML = `
    <div class="thumb-wrap">
      <img class="thumbnail ${images.length > 1 ? "clickable" : ""}" src="${escapeHtml(images[0])}" alt="${escapeHtml(`${phone.brand} ${phone.model}`)}">
      ${dotsHTML}
    </div>

    <div class="video-info">
      <div class="video-title">${escapeHtml(`${phone.brand} ${phone.model}`)}</div>
      <div class="video-date">${escapeHtml(meta)}</div>

      ${
        phone.article
          ? `<div class="watch-btn green">find out more →</div>`
          : `
            <div class="no-article">no wiki article yet</div>
            <div class="watch-btn green">want to create it?</div>
          `
      }
      ${videoNames.has(phone) ? `<a class="watch-btn red" href="?q=${encodeURIComponent(videoNames.get(phone))}#videos" data-section="videos">my videos →</a>` : ""}
    </div>
  `;

  // Wiki button logic
  const btn = card.querySelector(".watch-btn");
  btn.onclick = () => {
    window.open(phone.article ? viewUrl : editUrl, "_blank");
  };

  // Image cycling + dots
  if (images.length > 1) {
    const img = card.querySelector(".thumbnail");
    const dots = card.querySelectorAll(".dot");
    let imgIndex = 0;

    img.addEventListener("click", () => {
      imgIndex = (imgIndex + 1) % images.length;
      img.src = images[imgIndex];

      dots.forEach((d, i) => {
        d.classList.toggle("active", i === imgIndex);
      });
    });
  }

  return card;
}

function updateTotalCount() {
  const totalEl = document.getElementById("phones-total");
  if (!totalEl) return;

  if (searchQuery) {
    const found = getFilteredPhones().length;
    totalEl.textContent = `${found} ${found === 1 ? "phone" : "phones"} found`;
    return;
  }

  const total = allPhones.length;
  totalEl.textContent = `${total} ${total === 1 ? "phone" : "phones"} total`;
}

document.addEventListener("DOMContentLoaded", () => {

  const container = document.getElementById("got-stuck-container");
  const backBtn = document.getElementById("standalone-back");
  if (!container) return;

  // If opened directly (not inside iframe)
  if (window.self === window.top) {
    container.classList.remove("hidden");

    backBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

});

// =====================================================
// LAST UPDATED
// =====================================================

function updateMeta(lastUpdatedHeader) {
  const updatedEl = document.getElementById("phones-updated");
  if (!updatedEl) return;

  if (lastUpdatedHeader) {
    const date = new Date(lastUpdatedHeader);
    const formatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric"
    });

    updatedEl.textContent = ` · last updated ${formatted}`;
  } else {
    updatedEl.textContent = "";
  }
}