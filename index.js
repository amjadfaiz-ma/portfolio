// Step 2.1: Render Latest Projects on the Home Page

import { fetchJSON, renderProjects } from './global.js';

// Resolve the JSON path relative to this module
const jsonURL = new URL('./lib/projects.json', import.meta.url);

// Fetch project data
const projects = await fetchJSON(jsonURL.href);

// If data loaded correctly, slice the first 3 projects
const latestProjects = Array.isArray(projects) ? projects.slice(0, 3) : [];

// Select the container element for home page preview
const projectsContainer = document.querySelector('.projects');

// Render the latest 3 projects
if (projectsContainer) {
  renderProjects(latestProjects, projectsContainer, 'h2');
}
