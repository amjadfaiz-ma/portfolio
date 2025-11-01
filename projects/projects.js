import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Load project data
const jsonURL = new URL('../lib/projects.json', import.meta.url);
const projects = await fetchJSON(jsonURL.href);

// DOM refs
const projectsContainer = document.querySelector('.projects');
const titleElement = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');

let selectedIndex = -1; // no slice selected

// Initial render of cards + title
renderProjects(projects, projectsContainer, 'h2');
titleElement.textContent = `${projects.length} Projects`;

// helper: text search across all metadata (unchanged)
function filterProjectsByQuery(queryRaw) {
  const q = queryRaw.trim().toLowerCase();
  if (!q) return projects;
  return projects.filter((project) => {
    const values = Object.values(project).join('\n').toLowerCase();
    return values.includes(q);
  });
}

// NEW helper: recompute visible projects based on search + clicked wedge
function applyFilteredView() {
  const currentQuery = searchInput.value || '';
  const afterSearch = filterProjectsByQuery(currentQuery);

  if (selectedIndex === -1) {
    // no wedge selected → just show search results
    renderProjects(afterSearch, projectsContainer, 'h2');
    titleElement.textContent = `${afterSearch.length} Projects`;
    renderPieChart(afterSearch);
    return;
  }

  // wedge selected → figure out which year that index corresponds to
  const rolledData = d3.rollups(
    afterSearch,
    v => v.length,
    d => d.year
  );
  const selectedYear = rolledData[selectedIndex]?.[0];

  if (!selectedYear) {
    // selection doesn't match what's on screen after search
    renderProjects(afterSearch, projectsContainer, 'h2');
    titleElement.textContent = `${afterSearch.length} Projects`;
    renderPieChart(afterSearch);
    return;
  }

  // filter down to that single year
  const yearFiltered = afterSearch.filter(p => p.year === selectedYear);

  renderProjects(yearFiltered, projectsContainer, 'h2');
  titleElement.textContent = `${yearFiltered.length} Projects`;
  renderPieChart(yearFiltered);
}

// UPDATED renderPieChart to use selectedIndex and to call applyFilteredView()
function renderPieChart(projectsGiven) {
  const rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );

  const data = rolledData.map(([year, count]) => ({
    label: year,
    value: count,
  }));

  const sliceGenerator = d3.pie().value(d => d.value);
  const arcData = sliceGenerator(data);

  const arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  const svgSel = d3.select('#projects-pie-plot');
  svgSel.selectAll('*').remove();

  const legendSel = d3.select('.legend');
  legendSel.selectAll('*').remove();

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
      const clickedIdx = i;
      selectedIndex = (selectedIndex === clickedIdx) ? -1 : clickedIdx;
      applyFilteredView();
    });

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
      const clickedIdx = i;
      selectedIndex = (selectedIndex === clickedIdx) ? -1 : clickedIdx;
      applyFilteredView();
    });

  paths.style('cursor', 'pointer');
  legendItems.style('cursor', 'pointer');
}

// draw initial pie/legend for full dataset on load
renderPieChart(projects);

// wire up live search to the unified pipeline
searchInput.addEventListener('input', () => {
  applyFilteredView();
});
