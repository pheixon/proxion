// =====================================================
// CONFIG
// =====================================================
const DATA_URL = "/api/phones";
const PHONES_PER_BATCH = 6;
const adminMode = new URLSearchParams(window.location.search).get("admin") === "1";

async function adminLogin() {
  const existing = sessionStorage.getItem("blog_token");
  if (existing) return true;
  const pass = prompt("Enter admin password");
  if (!pass) return false;
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: pass }),
  });
  if (!res.ok) { alert("Access denied"); return false; }
  const { token } = await res.json();
  sessionStorage.setItem("blog_token", token);
  return true;
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionStorage.getItem("blog_token")}`,
  };
}

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
  if (adminMode) {
    adminLogin().then(ok => {
      if (ok) document.getElementById("collection-editor").classList.remove("hidden");
    });
  }
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
    const res = await fetch(DATA_URL, { cache: "no-store" });
    allPhones = await res.json();

    const lastModified = res.headers.get("Last-Modified");
    updateMeta(lastModified);

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

  allPhones.forEach(p => {
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
    : (phone.image && String(phone.image).trim() !== "" ? [phone.image] : ["assets/images/placeholder.png"]);

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
      <img class="thumbnail ${images.length > 1 ? "clickable" : ""}" src="${images[0]}">
      ${dotsHTML}
    </div>

    <div class="video-info">
      <div class="video-title">${phone.brand} ${phone.model}</div>
      <div class="video-date">${meta}</div>

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

  // Wiki button logic
  const btn = card.querySelector(".watch-btn");
  btn.onclick = () => {
    window.open(phone.article ? viewUrl : editUrl, "_blank");
  };

  if (adminMode) {
    const editBtn = document.createElement("div");
    editBtn.className = "blog-admin-btn";
    editBtn.textContent = "edit";
    editBtn.onclick = () => editPhone(phone, card);

    const deleteBtn = document.createElement("div");
    deleteBtn.className = "blog-admin-btn delete";
    deleteBtn.textContent = "delete";
    deleteBtn.onclick = () => deletePhone(phone.id, card);

    card.appendChild(editBtn);
    card.appendChild(deleteBtn);
  }

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

function editPhone(phone, card) {
  const saved = card.innerHTML;
  card.innerHTML = `
    <div class="admin-edit-form">
      <input class="admin-field" placeholder="brand" value="${phone.brand}">
      <input class="admin-field" placeholder="model" value="${phone.model}">
      <input class="admin-field" placeholder="type" value="${phone.type || ""}">
      <input class="admin-field" placeholder="year" type="number" value="${phone.year || ""}">
      <input class="admin-field" placeholder="image url" value="${phone.image || ""}">
      <input class="admin-field" placeholder="aka" value="${phone.aka || ""}">
      <label class="admin-check"><input type="checkbox" id="edit-article" ${phone.article ? "checked" : ""}> has wiki article</label>
      <label class="admin-check"><input type="checkbox" id="edit-clone" ${phone.clone ? "checked" : ""}> clone</label>
      <div class="admin-actions">
        <span class="blog-admin-btn">save</span>
        <span class="blog-admin-btn delete">cancel</span>
      </div>
    </div>
  `;
  const fields = card.querySelectorAll(".admin-field");
  const [brandEl, modelEl, typeEl, yearEl, imageEl, akaEl] = fields;

  card.querySelector(".admin-actions .blog-admin-btn").onclick = async () => {
    const body = {
      brand: brandEl.value.trim(),
      model: modelEl.value.trim(),
      type: typeEl.value.trim(),
      year: yearEl.value ? Number(yearEl.value) : null,
      image: imageEl.value.trim(),
      aka: akaEl.value.trim(),
      article: card.querySelector("#edit-article").checked,
      clone: card.querySelector("#edit-clone").checked,
    };
    const res = await fetch(`/api/phones/${phone.id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(body) });
    if (res.ok) { Object.assign(phone, body); allPhones = allPhones.map(p => p.id === phone.id ? { ...p, ...body } : p); render(); }
  };
  card.querySelector(".blog-admin-btn.delete").onclick = () => { card.innerHTML = saved; };
}

async function deletePhone(id, card) {
  if (!confirm("Delete this phone?")) return;
  const res = await fetch(`/api/phones/${id}`, { method: "DELETE", headers: authHeaders() });
  if (res.ok) { allPhones = allPhones.filter(p => p.id !== id); card.remove(); updateTotalCount(); }
}

async function createPhone() {
  const get = id => document.getElementById(id).value.trim();
  const body = {
    brand: get("new-brand"), model: get("new-model"), type: get("new-type"),
    year: get("new-year") ? Number(get("new-year")) : null,
    image: get("new-image"), aka: get("new-aka"),
    article: document.getElementById("new-article").checked,
    clone: document.getElementById("new-clone").checked,
  };
  if (!body.brand || !body.model) return alert("Brand and model are required");
  const res = await fetch("/api/phones", { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
  if (res.ok) {
    const { id } = await res.json();
    allPhones.push({ ...body, id });
    ["new-brand","new-model","new-type","new-year","new-image","new-aka"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("new-article").checked = false;
    document.getElementById("new-clone").checked = false;
    updateTotalCount();
    render();
  }
}

function updateTotalCount() {
  const totalEl = document.getElementById("phones-total");
  if (!totalEl) return;

  const total = allPhones.length;
  totalEl.textContent = `${total} ${total === 1 ? "phone" : "phones"} total`;
}

document.addEventListener("DOMContentLoaded", () => {

  const container = document.getElementById("got-stuck-container");
  const backBtn = document.getElementById("standalone-back");

  // If opened directly (not inside iframe)
  if (window.self === window.top) {
    container.classList.remove("hidden");

    backBtn.addEventListener("click", () => {
      window.location.href = "../index.html";
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