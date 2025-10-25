// Step 1.3: Setting Up the Projects Page

import { fetchJSON, renderProjects } from '../global.js';

// Fetch JSON data
const projects = await fetchJSON('../lib/projects.json');

// Select the container
const projectsContainer = document.querySelector('.projects');

// Render all projects
renderProjects(projects, projectsContainer, 'h2');

// Step 1.6: Counting Projects
const titleElement = document.querySelector('.projects-title');
if (titleElement && Array.isArray(projects)) {
  titleElement.textContent = `Projects (${projects.length})`;
}

