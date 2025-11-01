import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// -----------------------------------------------------
// 0. Load project data from JSON
// -----------------------------------------------------
const jsonURL = new URL('../lib/projects.json', import.meta.url);
const projects = await fetchJSON(jsonURL.href);

// -----------------------------------------------------
// 1. Grab DOM elements we'll reuse
// -----------------------------------------------------
const projectsContainer = document.querySelector('.projects');
const titleElement = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');
const pieSVG = d3.select('#projects-pie-plot');
const legendUL = d3.select('.legend');

// -----------------------------------------------------
// 2. State
// -----------------------------------------------------

// Which pie slice is currently selected? (-1 = none)
let selectedIndex = -1;

// -----------------------------------------------------
// 3. Helper: filter by search text across ALL metadata
// -----------------------------------------------------
// We search all values of the project object (title, description, year, etc.)
// and compare case-insensitively.
function filterProjectsByQuery(queryRaw) {
  const q = queryRaw.trim().toLowerCase();
  if (!q) {
    // no search text, return everything
    return projects;
  }

  return projects.filter((project) => {
    const values = Object.values(project).join('\n').toLowerCase();
    return values.includes(q);
  });
}

// -----------------------------------------------------
// 4. Core renderer for the pie chart + legend
//    This draws wedges, colors them, wires up click handlers,
//    and applies highlight state (selectedIndex).
// -----------------------------------------------------
function renderPieChart(projectsGiven) {
  // A. Roll up counts of projects per year
  // rolledData looks like: [ ['2024', 3], ['2023', 4], ... ]
  const rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );

  // B. Convert rolledData to array of objects that pie() expects
  //    { label: '2024', value: 3 }
  const data = rolledData.map(([year, count]) => ({
    label: year,
    value: count,
  }));

  // C. Pie slice generator (computes start/end angles)
  const sliceGenerator = d3.pie().value(d => d.value);

  // D. Arc path generator (builds the actual wedge path 'd' string)
  const arcData = sliceGenerator(data);
  const arcGenerator = d3.arc()
    .innerRadius(0)   // 0 = full pie; >0 would make a donut
    .outerRadius(50); // matches our SVG viewBox radius

  // E. Color scale for slices/legend
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  // F. Clear old SVG + legend before drawing fresh
  pieSVG.selectAll('*').remove();
  legendUL.selectAll('*').remove();

  // G. Draw pie slices
  const paths = pieSVG
    .selectAll('path')
    .data(arcData)
    .enter()
    .append('path')
    .attr('d', d => arcGenerator(d))
    .attr('fill', (_d, idx) => colors(idx))
    .attr('class', (_d, idx) => (
      idx === selectedIndex ? 'selected' : ''
    ))
    .on('click', (_event, _d, idx) => {
      // toggle selection
      selectedIndex = (selectedIndex === idx) ? -1 : idx;
      applyFilteredView();
    });

  // H. Draw legend entries
  const legendItems = legendUL
    .selectAll('li')
    .data(data)
    .enter()
    .append('li')
    .attr('class', (_d, idx) => (
      idx === selectedIndex ? 'legend-item selected' : 'legend-item'
    ))
    // inline custom property --color is used by .swatch and also
    // can be overridden by .selected with !important
    .attr('style', (_d, idx) => `--color:${colors(idx)}`)
    .html(d => `
      <span class="swatch"></span>
      ${d.label} <em>(${d.value})</em>
    `)
    .on('click', (_event, _d, idx) => {
      // toggle selection via legend click
      selectedIndex = (selectedIndex === idx) ? -1 : idx;
      applyFilteredView();
    });

  // I. (Optional) cursor affordance
  paths.style('cursor', 'pointer');
  legendItems.style('cursor', 'pointer');
}

// -----------------------------------------------------
// 5. Main reactive controller
//    This function decides what should be visible right now,
//    based on BOTH search query and the selected pie slice.
// -----------------------------------------------------
function applyFilteredView() {
  // Step 1: apply text search
  const currentQuery = searchInput ? (searchInput.value || '') : '';
  const afterSearch = filterProjectsByQuery(currentQuery);

  // Step 2: if nothing is selected in the pie, show full search results
  if (selectedIndex === -1) {
    renderProjects(afterSearch, projectsContainer, 'h2');
    if (titleElement) {
      titleElement.textContent = `Projects (${afterSearch.length})`;
    }
    renderPieChart(afterSearch);
    return;
  }

  // Step 3: if a slice is selected, we only want projects for that slice's year.
  // We need to map selectedIndex -> which year label that slice represents.
  // We do this by rolling up afterSearch with the same logic used in renderPieChart.
  const rolledData = d3.rollups(
    afterSearch,
    (v) => v.length,
    (d) => d.year
  );
  // rolledData is in the same order D3 pie() will consume it:
  // e.g. [ ['2024', 3], ['2023', 4], ... ]

  const selectedYear = rolledData[selectedIndex]?.[0];

  // If there's no corresponding year (for example, you typed a search
  // that removed that year from the page), fall back to afterSearch.
  if (!selectedYear) {
    renderProjects(afterSearch, projectsContainer, 'h2');
    if (titleElement) {
      titleElement.textContent = `Projects (${afterSearch.length})`;
    }
    renderPieChart(afterSearch);
    return;
  }

  // Step 4: filter to ONLY that year
  const onlyThatYear = afterSearch.filter(p => p.year === selectedYear);

  renderProjects(onlyThatYear, projectsContainer, 'h2');
  if (titleElement) {
    titleElement.textContent = `Projects (${onlyThatYear.length})`;
  }
  renderPieChart(onlyThatYear);
}

// -----------------------------------------------------
// 6. Wire up live search
//    Whenever the user types, we recompute the view.
// -----------------------------------------------------
if (searchInput) {
  searchInput.addEventListener('input', () => {
    applyFilteredView();
  });
}

// -----------------------------------------------------
// 7. Initial page load
//    - Render all projects in the grid
//    - Set the title count
//    - Draw the initial pie + legend
// -----------------------------------------------------
renderProjects(projects, projectsContainer, 'h2');

if (titleElement) {
  titleElement.textContent = `Projects (${projects.length})`;
}

// Draw the initial pie/legend for all projects
renderPieChart(projects);
