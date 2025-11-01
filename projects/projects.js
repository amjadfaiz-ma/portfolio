import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';


// Resolve the JSON path relative to this module (projects.js)
const jsonURL = new URL('../lib/projects.json', import.meta.url);
console.log('Attempting to fetch:', jsonURL.href); // <-- add this line

// Fetch JSON
const projects = await fetchJSON(jsonURL.href);

// Render (this will no-op if fetch failed because renderProjects checks for an array)
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

// Update the <h1> title safely
const titleElement = document.querySelector('.projects-title');
if (titleElement) {
  const count = Array.isArray(projects) ? projects.length : 0;
  titleElement.textContent = `Projects (${count})`;
}

/* ----------------------------------------
   Step 1.3: Draw a full circle with D3
   ---------------------------------------- */

// 1️⃣ Create an arc generator
let arcGenerator = d3.arc()
  .innerRadius(0)
  .outerRadius(50);

// 2️⃣ Generate an arc path (full circle)
let arc = arcGenerator({
  startAngle: 0,
  endAngle: 2 * Math.PI,
});

// 3️⃣ Append the arc to the SVG
d3.select('#projects-pie-plot')
  .append('path')
  .attr('d', arc)
  .attr('fill', 'red');
