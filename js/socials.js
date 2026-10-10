const SOCIALS_CHANNEL_ID = "UCalOFAYtXcoCeVj48OB_w9w";

document.addEventListener("DOMContentLoaded", () => {
  fetchChannelStats();
  fetchLatestContent();
  initGotStuck();
});

function fetchChannelStats() {
  fetch(
    `api/youtube/channels?id=${SOCIALS_CHANNEL_ID}`
  )
    .then(res => res.json())
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
    const res = await fetch(`api/youtube/playlist?playlistId=${playlistId}&pageToken=`);
    const data = await res.json();
    if (!data.items || !data.items.length) return;

    const items = data.items.slice(0, 50);
    const ids = items.map(i => i.snippet.resourceId.videoId).join(",");
    const detRes = await fetch(`api/youtube/videos?ids=${ids}`);
    const detData = await detRes.json();
    const liveSet = new Set();
    (detData.items || []).forEach(v => {
      if (v.liveStreamingDetails) liveSet.add(v.id);
    });

    const isShort = i => /#shorts?\b/i.test(i.snippet.title);
    const latestVideo = items.find(i => !liveSet.has(i.snippet.resourceId.videoId) && !isShort(i));
    const latestLive = items.find(i => liveSet.has(i.snippet.resourceId.videoId));
    const latestShort = items.find(i => isShort(i));

    renderEmbed("latest-video-container", latestVideo, "video");
    renderEmbed("latest-stream-container", latestLive, "livestream");
    renderEmbed("latest-short-container", latestShort, "short");
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
    <div class="latest-video-label">latest ${label}</div>
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
