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
  titleElement.textContent = `${count} Projects`;
}

/* ----------------------------------------
   Step 3.1: Derive pie data from real projects
   ---------------------------------------- */

// Group projects by year and count how many per year
// rolledData becomes something like: [ ['2024', 3], ['2023', 4], ... ]
let rolledData = d3.rollups(
  projects,
  (v) => v.length,   // how many projects in this group
  (d) => d.year      // group key = project.year
);

// Convert that into the {value, label} shape our pie code expects
let data = rolledData.map(([year, count]) => {
  return { value: count, label: year };
});

/* ----------------------------------------
   Step 1.4 (refactor): Use d3.pie()
   ---------------------------------------- */

/* ----------------------------------------
   Pie chart + legend using real data
   ---------------------------------------- */

// 1. We already computed `data` above using d3.rollups()
//    data = [ { value: count, label: year }, ... ]

// 2. Make the pie slice generator read .value
let sliceGenerator = d3.pie().value(d => d.value);

// 3. Compute angles for each slice
let arcData = sliceGenerator(data);

// 4. Build arc path generator
let arcGenerator = d3.arc()
  .innerRadius(0)
  .outerRadius(50);

// 5. Color scale (same as before)
let colors = d3.scaleOrdinal(d3.schemeTableau10);

// 6. Draw each slice into the SVG
d3.select('#projects-pie-plot')
  .selectAll('path')
  .data(arcData)
  .enter()
  .append('path')
  .attr('d', d => arcGenerator(d))
  .attr('fill', (_d, idx) => colors(idx));

// 7. Build legend under .legend
let legend = d3.select('.legend');

legend.selectAll('li')
  .data(data)
  .enter()
  .append('li')
  .attr('class', 'legend-item')
  .attr('style', (_d, idx) => `--color:${colors(idx)}`)
  .html(d => `
    <span class="swatch"></span>
    ${d.label} <em>(${d.value})</em>
  `);
