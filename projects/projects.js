import { fetchJSON, renderProjects } from '../global.js';

// Resolve JSON path relative to *this module* (projects.js)
const jsonURL = new URL('../lib/projects.json', import.meta.url);

// Fetch JSON safely
const projects = await fetchJSON(jsonURL);

// Render
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

// Update title (robust against failed fetch)
const titleElement = document.querySelector('.projects-title');
if (titleElement) {
  const count = Array.isArray(projects) ? projects.length : 0;
  titleElement.textContent = `Projects (${count})`;
}
