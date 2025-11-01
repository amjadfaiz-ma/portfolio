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
   Step 1.4 (refactor): Use d3.pie()
   ---------------------------------------- */

let data = [1, 2];

// 1) Make the generator that converts data → slice angle objects
let sliceGenerator = d3.pie();

// 2) Get slice angle objects for each entry in data
let generatedSlices = sliceGenerator(data);
// generatedSlices is an array like:
// [ { startAngle: ..., endAngle: ..., value: 1, ...}, { ... } ]

// 3) Same arc generator as before
let arcGenerator = d3.arc()
  .innerRadius(0)
  .outerRadius(50);

// 4) Convert each slice object into an SVG path string
let arcs = generatedSlices.map(d => arcGenerator(d));

// 5) Draw them with colors
let colors = ['gold', 'purple'];

arcs.forEach((arc, idx) => {
  d3.select('#projects-pie-plot')
    .append('path')
    .attr('d', arc)
    .attr('fill', colors[idx]);
});
