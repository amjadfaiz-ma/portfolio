import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// ---------- Load project data ----------
const jsonURL = new URL('../lib/projects.json', import.meta.url);
const projects = await fetchJSON(jsonURL.href);

// DOM references we reuse
const projectsContainer = document.querySelector('.projects');
const titleElement = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');

let selectedIndex = -1; // -1 means "nothing selected"

// Initial page render
renderProjects(projects, projectsContainer, 'h2');
titleElement.textContent = `Projects (${projects.length})`;

/* -------------------------------------------------
   Helper: draw the pie chart + legend for a dataset
   ------------------------------------------------- */
function renderPieChart(projectsGiven) {
  // 1. Roll up counts by year
  const rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );
  // rolledData looks like: [ ["2024", 3], ["2023", 4], ... ]

  // 2. Normalize into {label, value} objects for the chart/legend
  const data = rolledData.map(([year, count]) => ({
    label: year,
    value: count,
  }));

  // 3. D3 generators
  const sliceGenerator = d3.pie().value(d => d.value);
  const arcData = sliceGenerator(data);

  const arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  // 4. Select and clear existing SVG + legend before re-rendering
  const svgSel = d3.select('#projects-pie-plot');
  svgSel.selectAll('*').remove();

  const legendSel = d3.select('.legend');
  legendSel.selectAll('*').remove();

  // 5. Draw wedges (one <path> per arc)
  //    We keep a reference by binding arcData (which includes index info)
  const paths = svgSel.selectAll('path')
    .data(arcData)
    .enter()
    .append('path')
    .attr('d', d => arcGenerator(d))
    .attr('fill', (_d, idx) => colors(idx))
    .attr('class', (_d, idx) => (
      idx === selectedIndex ? 'selected' : ''
    ))
    .on('click', (_event, _d, i) => {
      // toggle: if you click the same slice, deselect; otherwise select it
      // NOTE: d3's .on('click', ...) receives (event, datum, index)
      const clickedIdx = i;

      selectedIndex = (selectedIndex === clickedIdx) ? -1 : clickedIdx;

      // Re-apply classes to all wedges and legend items
      svgSel.selectAll('path')
        .attr('class', (_d2, idx2) => (
          idx2 === selectedIndex ? 'selected' : ''
        ));

      legendSel.selectAll('li')
        .attr('class', (_d2, idx2) => (
          idx2 === selectedIndex ? 'legend-item selected' : 'legend-item'
        ));
    });

  // 6. Build legend rows
  //    Each <li> has --color inline to draw the swatch,
  //    plus class 'selected' if it's the chosen slice.
  const legendItems = legendSel.selectAll('li')
    .data(data)
    .enter()
    .append('li')
    .attr('class', (_d, idx) => (
      idx === selectedIndex ? 'legend-item selected' : 'legend-item'
    ))
    .attr('style', (_d, idx) => `--color:${colors(idx)}`)
    .html(d => `
      <span class="swatch"></span>
      ${d.label} <em>(${d.value})</em>
    `)
    .on('click', (_event, _d, i) => {
      // clicking legend should behave the same as clicking the wedge
      const clickedIdx = i;

      selectedIndex = (selectedIndex === clickedIdx) ? -1 : clickedIdx;

      // Update both wedges and legend highlight
      svgSel.selectAll('path')
        .attr('class', (_d2, idx2) => (
          idx2 === selectedIndex ? 'selected' : ''
        ));

      legendSel.selectAll('li')
        .attr('class', (_d2, idx2) => (
          idx2 === selectedIndex ? 'legend-item selected' : 'legend-item'
        ));
    });

  // 7. (Optional) Cursor affordance:
  //    We can also set pointer cursor here, if you didn't handle in CSS:
  paths.style('cursor', 'pointer');
  legendItems.style('cursor', 'pointer');
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
