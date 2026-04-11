const SOCIALS_CHANNEL_ID = "UCalOFAYtXcoCeVj48OB_w9w";

document.addEventListener("DOMContentLoaded", () => {
  fetchChannelStats();
  fetchLatestVideo();
  initGotStuck();
});

function fetchChannelStats() {
  fetch(
    `/api/youtube/channels?id=${SOCIALS_CHANNEL_ID}`
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

function fetchLatestVideo() {
  const playlistId = "UU" + SOCIALS_CHANNEL_ID.substring(2);

  fetch(
    `/api/youtube/playlist?playlistId=${playlistId}&pageToken=`
  )
    .then(res => res.json())
    .then(data => {
      if (!data.items || !data.items.length) return;
      const video = data.items[0].snippet;
      const videoId = video.resourceId.videoId;
      const container = document.getElementById("latest-video-container");
      if (!container) return;

      const date = new Date(video.publishedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric"
      });

      container.innerHTML = `
        <iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>
        <div class="latest-video-title">${video.title}</div>
        <div class="latest-video-date">${date}</div>
      `;
    })
    .catch(() => {});
}

function initGotStuck() {
  const container = document.getElementById("got-stuck-container");
  const backBtn = document.getElementById("standalone-back");

  if (window.self === window.top) {
    container.classList.remove("hidden");
    backBtn.addEventListener("click", () => {
      window.location.href = "../index.html";
    });
  }
}
