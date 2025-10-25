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

// Step 3 – Load GitHub profile data

// index.js (root)
import { fetchGitHubData } from './global.js';

// 1) Select the target container
const profileStats = document.querySelector('#profile-stats');

// 2) Fetch GitHub data (replace with your username if needed)
const githubData = await fetchGitHubData('amjadfaiz-ma');

// 3) Render if the container exists and data loaded
if (profileStats && githubData) {
  profileStats.innerHTML = `
    <h3>@${githubData.login}</h3>
    <dl class="stats-grid">
      <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
      <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
      <dt>Followers:</dt><dd>${githubData.followers}</dd>
      <dt>Following:</dt><dd>${githubData.following}</dd>
    </dl>
  `;
} else if (profileStats) {
  profileStats.textContent = 'Unable to load GitHub stats right now.';
}

