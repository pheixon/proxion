const PROJECTS_URL = "./projects.json";

let allProjects = [];

document.addEventListener("DOMContentLoaded", () => {
  const page = document.getElementById("page-fade");

  // Fade-in
  if (page) {
    page.classList.add("fade-out");
    requestAnimationFrame(() => {
      page.classList.remove("fade-out");
      page.classList.add("fade-in");
    });
  }

  loadProjects();

  // Back button fade-out
  const backBtn = document.getElementById("back-btn");
  if (backBtn && page) {
    backBtn.addEventListener("click", () => {
      page.classList.remove("fade-in");
      page.classList.add("fade-out");

      setTimeout(() => {
        window.location.href = "./projects.html";
      }, 350);
    });
  }
});

async function loadProjects() {
  try {
    const res = await fetch(PROJECTS_URL);
    allProjects = await res.json();

    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return renderNotFound("No project selected.");

    const project = allProjects.find(p => p.id === id);
    if (!project) return renderNotFound("Project not found.");

    renderProject(project);
  } catch (err) {
    console.error(err);
    renderNotFound("Failed to load project.");
  }
}

function renderProject(project) {
  const container = document.getElementById("sections-container");
  container.innerHTML = "";

  const images =
    Array.isArray(project.images) && project.images.length
      ? project.images
      : project.image
      ? [project.image]
      : ["./placeholder.png"];

  let yearText = "unknown";
  if (project.year) {
    const raw = String(project.year);
    yearText = raw.endsWith("?")
      ? `circa ${raw.replace("?", "")}`
      : raw;
  }

  container.innerHTML = `
    <section class="category">
      <div class="videos-grid single-project">
        <div class="video large image-carousel">

          <div class="image-row">
            <div class="image-nav-btn prev hidden">←</div>

            <div class="image-wrapper">
              <img class="thumbnail clickable" src="${images[0]}">

              <div class="image-dots hidden">
                ${images.map((_, i) => `<div class="dot ${i === 0 ? "active" : ""}"></div>`).join("")}
              </div>
            </div>

            <div class="image-nav-btn next hidden">→</div>
          </div>

          <div class="video-info">
            <div class="video-title">${project.title}</div>
            <div class="video-date">
              released ${yearText} · ${project.type || "other"}
            </div>

            <div class="watch-btn purple" id="open-project">
              open project →
            </div>

            <div class="project-description">
              ${project.description || "No description yet."}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  document.getElementById("open-project")?.addEventListener("click", () => {
    window.open(project.url, "_blank");
  });

  setupCarousel(images);
}

function setupCarousel(images) {
  if (images.length <= 1) return; // 🚫 No UI if only one image

  let index = 0;

  const img = document.querySelector(".thumbnail");
  const prevBtn = document.querySelector(".image-nav-btn.prev");
  const nextBtn = document.querySelector(".image-nav-btn.next");
  const dots = document.querySelectorAll(".image-dots .dot");
  const dotsContainer = document.querySelector(".image-dots");

  prevBtn.classList.remove("hidden");
  nextBtn.classList.remove("hidden");
  dotsContainer.classList.remove("hidden");

  function update() {
    img.src = images[index];

    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
  }

  prevBtn.onclick = () => {
    index = (index - 1 + images.length) % images.length;
    update();
  };

  nextBtn.onclick = () => {
    index = (index + 1) % images.length;
    update();
  };

  img.addEventListener("click", () => {
    index = (index + 1) % images.length;
    update();
  });
}

function renderNotFound(message) {
  document.getElementById("sections-container").innerHTML = `
    <section class="category">
      <h2>oops</h2>
      <div class="video-info">${message}</div>
    </section>
  `;
}