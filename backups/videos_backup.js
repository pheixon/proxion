// ===============================
// CONFIG
// ===============================
const API_KEY = "AIzaSyBujIgsM22aI6i8Th5cxCnLDXSGdxy_Nf0";
const CHANNEL_ID = "UCalOFAYtXcoCeVj48OB_w9w";
const MAX_RESULTS = 50;

const CACHE_KEY = "youtube_videos_cache_v2";
const CACHE_TIME = 1000 * 60 * 60 * 6; // 6 hours
const VIDEOS_PER_BATCH = 6;

let allVideos = [];
let currentSort = "category";
let sectionState = {};

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  injectSortBar();
  loadVideos();
});

// ===============================
// SORT BAR (injected automatically)
// ===============================
function injectSortBar() {
  const container = document.querySelector(".videos-page");

  const bar = document.createElement("div");
  bar.className = "sort-bar";
  bar.innerHTML = `
    <select id="sortSelect">
      <option value="category" selected>Sort by Category</option>
      <option value="year">Sort by Upload Year</option>
      <option value="title">Sort by Title (A–Z)</option>
    </select>
  `;

  container.prepend(bar);

  document.getElementById("sortSelect")
    .addEventListener("change", e => {
      currentSort = e.target.value;
      render();
    });
}

// ===============================
// DATA LOADING (with caching)
// ===============================
function loadVideos() {
  const cached = localStorage.getItem(CACHE_KEY);

  if (cached) {
    const { timestamp, items } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TIME) {
      processVideos(items);
      return;
    }
  }

  fetch(
    `https://www.googleapis.com/youtube/v3/search?` +
    `part=snippet&channelId=${CHANNEL_ID}` +
    `&maxResults=${MAX_RESULTS}` +
    `&order=date&type=video&key=${API_KEY}`
  )
    .then(res => res.json())
    .then(data => {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          items: data.items
        })
      );
      processVideos(data.items);
    })
    .catch(err => console.error(err));
}

// ===============================
// PROCESS DATA
// ===============================
function processVideos(items) {
  allVideos = items.map(item => ({
    id: item.id.videoId,
    rawTitle: item.snippet.title,
    cleanTitle: cleanTitle(item.snippet.title),
    date: item.snippet.publishedAt,
    thumbnails: item.snippet.thumbnails,
    category: getCategory(item.snippet.title)
  }));

  render();
}

// ===============================
// TITLE CLEANING
// ===============================
function cleanTitle(title) {
  return title
    .replace(/\s*#[\w-]+/g, '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*-\s*on\/off/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ===============================
// CATEGORY LOGIC
// ===============================
function getCategory(title) {
  const lower = title.toLowerCase();

  if (lower.includes("on") && lower.includes("off")) {
    return "onoff";
  }

  if (lower.includes("ringtone")) {
    return "ringtones";
  }

  return "other";
}

// ===============================
// RENDER ROUTER
// ===============================
function render() {
  sectionState = {};

  if (currentSort === "category") renderByCategory();
  if (currentSort === "year") renderByYear();
  if (currentSort === "title") renderByTitle();
}

// ===============================
// RENDER: CATEGORY
// ===============================
function renderByCategory() {
  clearSections();

  const groups = {
    onoff: [],
    ringtones: [],
    other: []
  };

  allVideos.forEach(v => {
    groups[v.category].push(v);
  });

  renderIntoExistingSections(groups);
}

// ===============================
// RENDER: YEAR
// ===============================
function renderByYear() {
  replaceWithDynamicSections();

  const groups = {};

  allVideos.forEach(v => {
    const year = new Date(v.date).getFullYear();
    if (!groups[year]) groups[year] = [];
    groups[year].push(v);
  });

  const sortedYears = Object.keys(groups).sort((a, b) => b - a);

  const ordered = {};
  sortedYears.forEach(y => ordered[y] = groups[y]);

  renderDynamicSections(ordered);
}

// ===============================
// RENDER: TITLE A-Z
// ===============================
function renderByTitle() {
  replaceWithDynamicSections();

  const groups = {};

  allVideos.forEach(v => {
    const first = v.cleanTitle.charAt(0).toUpperCase();
    const key = first >= "A" && first <= "Z" ? first : "#";

    if (!groups[key]) groups[key] = [];
    groups[key].push(v);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });

  const ordered = {};
  sortedKeys.forEach(k => ordered[k] = groups[k]);

  renderDynamicSections(ordered);
}

// ===============================
// EXISTING SECTION RENDER
// ===============================
function renderIntoExistingSections(groups) {
  Object.keys(groups).forEach(key => {
    const section = document.getElementById(key);
    const grid = section.querySelector(".videos-grid");
    const loadBtn = section.querySelector(".load-more");

    grid.innerHTML = "";

    sectionState[key] = {
      videos: groups[key],
      rendered: 0,
      grid,
      loadBtn
    };

    renderNextBatch(key);

    loadBtn.onclick = () => renderNextBatch(key);
  });
}

// ===============================
// DYNAMIC SECTIONS
// ===============================
function renderDynamicSections(groups) {
  const container = document.querySelector(".videos-page");
  const oldSections = container.querySelectorAll("section.category");
  oldSections.forEach(s => s.remove());

  Object.keys(groups).forEach(key => {
    const section = document.createElement("section");
    section.className = "category";

    section.innerHTML = `
      <h2>${key}</h2>
      <div class="videos-grid"></div>
      <div class="load-more label red">load more</div>
    `;

    container.appendChild(section);

    const grid = section.querySelector(".videos-grid");
    const loadBtn = section.querySelector(".load-more");

    sectionState[key] = {
      videos: groups[key],
      rendered: 0,
      grid,
      loadBtn
    };

    renderNextBatch(key);

    loadBtn.onclick = () => renderNextBatch(key);
  });
}

function replaceWithDynamicSections() {
  const container = document.querySelector(".videos-page");
  const sections = container.querySelectorAll("section.category");
  sections.forEach(s => s.remove());
}

function clearSections() {
  document.querySelectorAll(".videos-grid")
    .forEach(grid => grid.innerHTML = "");
}

// ===============================
// PAGINATION
// ===============================
function renderNextBatch(key) {
  const state = sectionState[key];
  const { videos, rendered, grid, loadBtn } = state;

  const next = videos.slice(rendered, rendered + VIDEOS_PER_BATCH);

  next.forEach(video => {
    grid.appendChild(createVideoCard(video));
  });

  state.rendered += next.length;

  if (state.rendered >= videos.length || videos.length <= 6) {
    loadBtn.style.display = "none";
  } else {
    loadBtn.style.display = "inline-flex";
  }
}

// ===============================
// VIDEO CARD
// ===============================
function createVideoCard(video) {
  const card = document.createElement("div");
  card.className = "video";

  card.innerHTML = `
    <img class="thumbnail" src="${video.thumbnails.medium.url}">
    <div class="video-info">
      <div class="video-title">${video.cleanTitle}</div>
      <div class="video-date">${formatDate(video.date)}</div>

      <div class="watch-btn red">
        watch on
<svg xmlns="http://www.w3.org/2000/svg"
	 viewBox="0 0 512 214">
<g>
	<g id="You">
		<path id="u_2_" fill="#F5F5F5" d="M191.1,173.1h-19.4v-11.2c-7.4,8.5-13.6,12.7-20.4,12.7c-5.9,0-10.1-2.9-12.2-7.9
			c-1.2-3.1-2.1-8-2.1-15V69.8h19.4v76.7c0,4.3,0,6.1,0,7.2c0.4,2.9,1.6,3.9,4.2,3.9c3.7,0,7.1-3.3,11.1-9V69.8h19.4V173.1z"/>
		<path id="o_2_" fill="#F5F5F5" d="M122.7,103.6c0-11-2.2-19.3-6.1-24.5c-5.2-7.1-13.3-9.9-21.5-9.9c-9.3,0-16.3,2.9-21.5,9.9
			c-4,5.2-6.1,13.6-6.1,24.6v36.7c0,10.9,1.9,18.5,5.9,23.7c5.2,7.1,13.5,10.7,21.7,10.7s16.7-3.7,21.9-10.7
			c3.9-5.2,5.7-12.8,5.7-23.7V103.6z M103.2,142.4c1,10.2-2.1,15.3-8.2,15.3c-6,0-9.2-5.1-8.2-15.3v-40.9c-1-10.2,2.1-15,8.2-15
			c6,0,9.2,4.8,8.2,15V142.4z"/>
		<path id="y_2_" fill="#F5F5F5" d="M46,116.9v56.2H25.6v-56.2c0,0-21.2-68.9-25.6-81.8h21.5L35.8,89l14.3-53.9h21.5L46,116.9z"/>
	</g>
	<g id="Tube">
		<g>
			<path fill="#F5F5F5" d="M390.9,86.3c-3.1,0-6.5,1.6-9.6,4.7v61.9c3.1,3.1,6.6,4.7,9.6,4.7c5.3,0,7.8-3.9,7.8-14.1v-44
				C398.6,89.3,396.2,86.3,390.9,86.3z"/>
			<path fill="#F5F5F5" d="M467.1,98.6c0-9.4-2.5-12.3-8.6-12.3s-8.8,2.6-8.8,12.2v11.3h17.4V98.6z"/>
			<path fill="#F5F5F5" d="M509,46.2c0,0-3-21-12.2-30.2C485.2,4,472.2,3.9,466.3,3.2c-42.7-3.1-106.8-3.1-106.8-3.1h-0.1
				c0,0-64.1,0-106.8,3.1c-5.9,0.7-19,0.8-30.6,12.9c-9.2,9.2-12.2,30.2-12.2,30.2s-3.1,24.6-3.1,49.2v23.1
				c0,24.6,3.1,49.2,3.1,49.2s3,21,12.2,30.2c11.7,12.1,26.9,11.8,33.6,13c24.4,2.4,103.7,3.1,103.7,3.1s64.1-0.1,106.8-3.2
				c5.9-0.7,19-0.8,30.6-12.9c9.2-9.2,12.2-30.2,12.2-30.2s3.1-24.6,3.1-49.2V95.4C512.1,70.9,509,46.2,509,46.2z M273.9,173.1
				h-20.4V55.5H232V36.1h64.4v19.4h-22.5V173.1z M347.5,173.1h-19.4v-11.2c-7.4,8.5-13.6,12.7-20.4,12.7c-5.9,0-10.1-2.9-12.2-7.9
				c-1.2-3.1-2.1-8-2.1-15V70.9h19.4v75.6c0,4.3,0,6.1,0,7.2c0.4,2.9,1.6,3.9,4.2,3.9c3.7,0,7.1-3.3,11.1-9V70.9h19.4V173.1z
				 M418.1,142.4c0,9.4-0.8,16.2-2,20.4c-2.5,7.6-7.9,11.6-15.2,11.6c-6.5,0-13.3-4-19.5-11.7v10.3h-18.4v-137h18.4v44.7
				c5.9-7.4,12.8-11.6,19.5-11.6c7.4,0,12.4,4.3,14.8,11.9c1.2,4.1,2.5,10.7,2.5,20.4V142.4z M458.6,157.5c4.6,0,7.3-2.5,8.3-7.5
				c0.2-1,0.1-5.4,0.1-12.9h19.4v2.9c0,5.9-0.5,10.2-0.6,12.1c-0.6,4.1-2,7.8-4.3,11c-5.1,7.5-12.7,11-22.4,11s-17.1-3.5-22.4-10.4
				c-3.9-5.1-6.4-12.7-6.4-23.6v-35.8c0-10.9,2.2-19.3,6.2-24.5c5.3-7,12.7-10.7,22.2-10.7c9.3,0,16.7,3.7,21.9,10.7
				c3.9,5.2,6,13.2,6,24v20.9h-36.8v18.4C449.6,152.8,452.3,157.5,458.6,157.5z"/>
		</g>
	</g>
</g>
</svg>
      </div>
    </div>
  `;

  card.querySelector(".watch-btn")
    .addEventListener("click", () => {
      window.open(
        `https://youtube.com/watch?v=${video.id}`,
        "_blank"
      );
    });

  return card;
}

// ===============================
// DATE FORMAT
// ===============================
function formatDate(dateString) {
  const date = new Date(dateString);
  return `uploaded ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  })}`;
}
