// Step 1.3: Setting Up the Projects Page

// 1️⃣ Import helper functions from global.js
import { fetchJSON, renderProjects } from '../global.js';

// 2️⃣ Fetch the project data (make sure ../lib/projects.json exists)
const projects = await fetchJSON('../lib/projects.json');

// 3️⃣ Select the container where projects will appear
const projectsContainer = document.querySelector('.projects');

// 4️⃣ Render the projects dynamically
renderProjects(projects, projectsContainer, 'h2');
