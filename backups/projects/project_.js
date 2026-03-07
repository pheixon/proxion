const PROJECTS_URL = "./projects.json";

let allProjects = [];

document.addEventListener("DOMContentLoaded", () => {
  loadProjects();
});

function formatYear(year) {
  if (!year) return "unknown";

  const raw = String(year).trim();

  // Approximate year: "2023?" → "circa 2023"
  if (raw.endsWith("?")) {
    return `circa ${raw.replace("?", "")}`;
  }

  return raw;
}

async function loadProjects() {
  try {
    const res = await fetch(PROJECTS_URL);
    const data = await res.json();
    allProjects = data;

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

  // Start hidden
  container.classList.add("fade-out");

  container.innerHTML = "";

  const section = document.createElement("section");
  section.className = "category";

  const hasImage = project.image && project.image.trim() !== "";

  section.innerHTML = `

    <div class="videos-grid single-project">
      <div class="video large">
        <img class="thumbnail" src="${hasImage ? project.image : "./placeholder.png"}">

        <div class="video-info">
          <div class="video-title">${project.title}</div>
          <div class="video-date">
            ${project.year ? `released ${formatYear(project.year)}` : ""}
            ${project.type ? ` · ${project.type}` : ""}
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
  `;

  container.appendChild(section);

  // Force reflow so fade-in triggers
  void container.offsetWidth;

  // Fade in
  container.classList.remove("fade-out");
  container.classList.add("fade-in");

  setTimeout(() => {
    container.classList.remove("fade-in");
  }, 350);

  section.querySelector("#open-project").onclick = () => {
    window.open(project.url, "_blank");
  };
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

document.querySelector(".watch-btn.purple")?.addEventListener("click", () => {
  window.location.href = "./projects.html";
});