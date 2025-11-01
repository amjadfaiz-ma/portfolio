import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// ---------- Load project data ----------
const jsonURL = new URL('../lib/projects.json', import.meta.url);
const projects = await fetchJSON(jsonURL.href);

// DOM references we reuse
const projectsContainer = document.querySelector('.projects');
const titleElement = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');

// Initial page render
renderProjects(projects, projectsContainer, 'h2');
titleElement.textContent = `Projects (${projects.length})`;

/* -------------------------------------------------
   Helper: draw the pie chart + legend for a dataset
   ------------------------------------------------- */
function renderPieChart(projectsGiven) {
  // 1. Roll up counts by year
  // returns e.g. [ ['2024', 3], ['2023', 4], ... ]
  const rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );

  // 2. Convert to [{ value: count, label: year }, ...]
  const data = rolledData.map(([year, count]) => ({
    value: count,
    label: year,
  }));

  // 3. Set up generators
  const sliceGenerator = d3.pie().value(d => d.value);
  const arcData = sliceGenerator(data);

  const arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  // 4. Clear previous chart + legend before drawing new ones
  const svgSel = d3.select('#projects-pie-plot');
  svgSel.selectAll('*').remove();

  const legendSel = d3.select('.legend');
  legendSel.selectAll('*').remove();

  // 5. Draw slices into the SVG
  svgSel.selectAll('path')
    .data(arcData)
    .enter()
    .append('path')
    .attr('d', d => arcGenerator(d))
    .attr('fill', (_d, idx) => colors(idx));

  // 6. Draw legend <li> entries
  legendSel.selectAll('li')
    .data(data)
    .enter()
    .append('li')
    .attr('class', 'legend-item')
    .attr('style', (_d, idx) => `--color:${colors(idx)}`)
    .html(d => `
      <span class="swatch"></span>
      ${d.label} <em>(${d.value})</em>
    `);
}

// ---------- First render of the pie/legend on page load ----------
renderPieChart(projects);

/* -------------------------------------------------
   Improved search (reactive filter)
   ------------------------------------------------- */
function filterProjectsByQuery(queryRaw) {
  // normalize query
  const q = queryRaw.trim().toLowerCase();

  // return *all* projects if query is empty
  if (!q) return projects;

  // otherwise filter across all metadata
  return projects.filter((project) => {
    const values = Object.values(project).join('\n').toLowerCase();
    return values.includes(q);
  });
}

// Listen for typing in search bar
searchInput.addEventListener('input', (event) => {
  const filtered = filterProjectsByQuery(event.target.value);

  // update visible cards
  renderProjects(filtered, projectsContainer, 'h2');

  // update heading count
  titleElement.textContent = `Projects (${filtered.length})`;

  // update pie + legend to reflect only filtered set
  renderPieChart(filtered);
});
