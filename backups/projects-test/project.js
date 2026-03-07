const PROJECTS_URL = "./projects.json";

let allProjects = [];

document.addEventListener("DOMContentLoaded", () => {
  const page = document.querySelector(".project-page") || document.body;

  // fade-in on load
  page.classList.add("fade-out");
  requestAnimationFrame(() => {
    page.classList.remove("fade-out");
    page.classList.add("fade-in");
  });

  loadProjects();

  // back button fade-out
  document.querySelector(".watch-btn.purple")?.addEventListener("click", () => {
    page.classList.remove("fade-in");
    page.classList.add("fade-out");

    setTimeout(() => {
      window.location.href = "./projects.html";
    }, 300);
  });
});

async function loadProjects() {
  try {
    const res = await fetch(PROJECTS_URL, { cache: "no-store" });
    const data = await res.json();

    allProjects = data.items || [];   // ✅ FIXED

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
      renderNotFound("No project selected.");
      return;
    }

    const project = allProjects.find(p => p.id === id);

    if (!project) {
      renderNotFound("Project not found.");
      return;
    }

    renderProject(project);

  } catch (err) {
    console.error(err);
    renderNotFound("Failed to load project.");
  }
}

function renderProject(project) {
  const container = document.getElementById("sections-container");
  container.innerHTML = "";

  const section = document.createElement("section");
  section.className = "category";

  const hasImage = project.image && project.image.trim() !== "";

  let yearText = "unknown";
  if (project.year) {
    const raw = String(project.year);
    yearText = raw.endsWith("?")
      ? `circa ${raw.replace("?", "")}`
      : raw;
  }

  section.innerHTML = `
    <div class="videos-grid single-project">
      <div class="video large">
        <img class="thumbnail" src="${hasImage ? project.image : "./placeholder.png"}">

        <div class="video-info">
          <div class="video-title">${project.title}</div>
          <div class="video-date">
            released ${yearText} ${project.type ? `· ${project.type}` : ""}
          </div>

          ${
            project.url
              ? `<div class="watch-btn purple" id="open-project">open project →</div>`
              : `<div class="no-article">no project page yet</div>`
          }

          <div class="project-description">
            ${project.description || "No description yet."}
          </div>
        </div>
      </div>
    </div>
  `;

  container.appendChild(section);

  if (project.url) {
    section.querySelector("#open-project").onclick = () => {
      window.open(project.url, "_blank");
    };
  }
}

function renderNotFound(message) {
  const container = document.getElementById("sections-container");
  container.innerHTML = `
    <section class="category">
      <h2>oops</h2>
      <div class="video-info">${message}</div>
    </section>
  `;
}