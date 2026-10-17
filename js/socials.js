const SOCIALS_CHANNEL_ID = window.SITE_CONFIG.youtubeChannelId;

document.addEventListener("DOMContentLoaded", () => {
  fetchChannelStats();
  fetchLatestContent();
  initGotStuck();
});

function fetchChannelStats() {
  siteData.youtube.channel(SOCIALS_CHANNEL_ID)
    .then(data => {
      if (!data.items || !data.items.length) return;
      const stats = data.items[0].statistics;
      const subs = Number(stats.subscriberCount).toLocaleString();
      const el = document.getElementById("yt-subs-main");
      if (el) el.textContent = `${subs} subscribers`;
    })
    .catch(() => {});
}

async function fetchLatestContent() {
  const playlistId = "UU" + SOCIALS_CHANNEL_ID.substring(2);
  try {
    const data = await siteData.youtube.playlist(playlistId);
    if (!data.items || !data.items.length) return;

    const items = data.items.slice(0, 50);
    const ids = items.map(i => i.snippet.resourceId.videoId).join(",");
    const detData = await siteData.youtube.videos(ids);
    const liveSet = new Set();
    (detData.items || []).forEach(v => {
      if (v.liveStreamingDetails) liveSet.add(v.id);
    });

    const isShort = i => /#shorts?\b/i.test(i.snippet.title);
    const latestVideo = items.find(i => !liveSet.has(i.snippet.resourceId.videoId) && !isShort(i));
    const latestLive = items.find(i => liveSet.has(i.snippet.resourceId.videoId));
    const latestShort = items.find(i => isShort(i));
    const liveNowId = await siteData.youtube.liveNow().catch(() => null);

    renderEmbed("latest-video-container", latestVideo, "latest video");
    renderEmbed("latest-stream-container", latestLive, latestLive?.snippet.resourceId.videoId === liveNowId ? "live now" : "latest livestream");
    renderEmbed("latest-short-container", latestShort, "latest short");
  } catch (e) {}
}

function renderEmbed(containerId, item, label) {
  const container = document.getElementById(containerId);
  if (!container || !item) return;
  const videoId = item.snippet.resourceId.videoId;
  const date = new Date(item.snippet.publishedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
  const title = item.snippet.title.replace(/#shorts?\b/gi, '').trim();
  container.innerHTML = `
    <div class="latest-video-label">${label}</div>
    <iframe src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}" allowfullscreen></iframe>
    <div class="latest-video-title">${escapeHtml(title)}</div>
    <div class="latest-video-date">${date}</div>
  `;
}

function initGotStuck() {
  const container = document.getElementById("got-stuck-container");
  const backBtn = document.getElementById("standalone-back");
  if (!container) return;

  if (window.self === window.top) {
    container.classList.remove("hidden");
    backBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }
}
