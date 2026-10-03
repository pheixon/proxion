document.addEventListener("DOMContentLoaded", () => {
  loadStats();
});

async function loadStats() {
  fetchCount('api/phones', 'stat-phones');
  fetchCount('api/projects', 'stat-projects');
  fetchCount('api/posts', 'stat-posts');
  fetchYouTubeCount();
}

function fetchCount(url, id) {
  fetch(url)
    .then(r => r.json())
    .then(data => {
      const el = document.getElementById(id);
      if (el && Array.isArray(data)) el.textContent = data.length;
    })
    .catch(() => {});
}

function fetchYouTubeCount() {
  const cached = localStorage.getItem("proxion:youtube_full_channel_cache_v3");
  if (cached) {
    try {
      const { items } = JSON.parse(cached);
      const el = document.getElementById('stat-videos');
      if (el && items) el.textContent = items.length;
      return;
    } catch (e) {}
  }
  fetch('api/youtube/channels?id=UCalOFAYtXcoCeVj48OB_w9w')
    .then(r => r.json())
    .then(data => {
      const el = document.getElementById('stat-videos');
      if (el && data.items?.[0]?.statistics?.videoCount) {
        el.textContent = data.items[0].statistics.videoCount;
      }
    })
    .catch(() => {});
}
