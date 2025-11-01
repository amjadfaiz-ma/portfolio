import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Load all projects once
const jsonURL = new URL('../lib/projects.json', import.meta.url);
const projects = await fetchJSON(jsonURL.href);

// Initial render
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

// Update title
const titleElement = document.querySelector('.projects-title');
titleElement.textContent = `Projects (${projects.length})`;

/* ----------------------------------------
   Shared pie-drawing function
   ---------------------------------------- */
function drawPieChart(projectData) {
  // 1️⃣ Clear old chart + legend
  d3.select('#projects-pie-plot').selectAll('*').remove();
  d3.select('.legend').selectAll('*').remove();

  // 2️⃣ Group by year (count)
  const rolledData = d3.rollups(
    projectData,
    (v) => v.length,
    (d) => d.year
  );

  const data = rolledData.map(([year, count]) => ({
    value: count,
    label: year,
  }));

  // 3️⃣ Create D3 generators
  const sliceGenerator = d3.pie().value((d) => d.value);
  const arcData = sliceGenerator(data);
  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  // 4️⃣ Draw slices
  d3.select('#projects-pie-plot')
    .selectAll('path')
    .data(arcData)
    .enter()
    .append('path')
    .attr('d', (d) => arcGenerator(d))
    .attr('fill', (_d, idx) => colors(idx));

  // 5️⃣ Build legend
  const legend = d3.select('.legend');
  legend
    .selectAll('li')
    .data(data)
    .enter()
    .append('li')
    .attr('class', 'legend-item')
    .attr('style', (_d, idx) => `--color:${colors(idx)}`)
    .html((d) => `
      <span class="swatch"></span>
      ${d.label} <em>(${d.value})</em>
    `);
}

// Draw initial pie chart
drawPieChart(projects);

/* ----------------------------------------
   Step 4.3: Improved Search
   ---------------------------------------- */
let query = '';

const searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
  // 1️⃣ Update the query string
  query = event.target.value.trim().toLowerCase();

  // 2️⃣ Filter projects across *all* fields (case-insensitive)
  const filteredProjects = projects.filter((project) => {
    // Combine all values (title, description, year, etc.)
    const values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query);
  });

  // 3️⃣ Re-render project cards and title
  renderProjects(filteredProjects, projectsContainer, 'h2');
  titleElement.textContent = `Projects (${filteredProjects.length})`;

  // 4️⃣ Re-render pie chart + legend for visible projects
  drawPieChart(filteredProjects);
});

