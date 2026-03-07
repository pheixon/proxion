const PROJECTS_URL = "./projects.json";

let allProjects = [];

document.addEventListener("DOMContentLoaded", () => {
  loadProjects();
});

async function loadProjects() {
  try {
    const res = await fetch(PROJECTS_URL);
    const data = await res.json();
    allProjects = data;

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
      renderNotFound("No project selected.");
      fadeIn();
      return;
    }

    const project = allProjects.find(p => p.id === id);

    if (!project) {
      renderNotFound("Project not found.");
      fadeIn();
      return;
    }

    renderProject(project);
    fadeIn();

  } catch (err) {
    console.error(err);
    renderNotFound("Failed to load project.");
    fadeIn();
  }
}

function renderProject(project) {
  const container = document.getElementById("sections-container");
  container.innerHTML = "";

  const section = document.createElement("section");
  section.className = "category";

  const hasImage = project.image && project.image.trim() !== "";

  let yearText = "";
  if (project.year) {
    const raw = String(project.year);
    yearText = raw.endsWith("?")
      ? `released circa ${raw.replace("?", "")}`
      : `released ${raw}`;
  }

  section.innerHTML = `
    <div class="videos-grid single-project">
      <div class="video large">
        <img class="thumbnail" src="${hasImage ? project.image : "./placeholder.png"}">

        <div class="video-info">
          <div class="video-title">${project.title}</div>
          <div class="video-date">
            ${yearText}
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

function fadeIn() {
  const container = document.getElementById("sections-container");

  requestAnimationFrame(() => {
    container.classList.remove("fade-out");
    container.classList.add("fade-in");

    setTimeout(() => {
      container.classList.remove("fade-in");
    }, 350);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.getElementById("page-fade");

  // start hidden (but visible in DOM)
  page.classList.add("fade-out");

  // next frame -> fade in
  requestAnimationFrame(() => {
    page.classList.remove("fade-out");
    page.classList.add("fade-in");
  });
});

document.getElementById("back-btn")?.addEventListener("click", () => {
  const page = document.getElementById("page-fade");

  page.classList.remove("fade-in");
  page.classList.add("fade-out");

  setTimeout(() => {
    window.location.href = "./projects.html";
  }, 350);
});