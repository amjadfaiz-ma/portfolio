import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

/*
 * -----------------------------------------------------
 * 0. Load project data
 * -----------------------------------------------------
 */
const jsonURL = new URL('../lib/projects.json', import.meta.url);
const allProjects = await fetchJSON(jsonURL.href);

/*
 * -----------------------------------------------------
 * 1. Grab DOM elements
 * -----------------------------------------------------
 */
const projectsContainer = document.querySelector('.projects');
const titleElement = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');

const pieSVG = d3.select('#projects-pie-plot');
const legendUL = d3.select('.legend');

/*
 * -----------------------------------------------------
 * 2. State
 * -----------------------------------------------------
 *
 * selectedIndex = which slice is active in the pie (-1 = none)
 * This must live OUTSIDE any render function so it persists.
 */
let selectedIndex = -1;

/*
 * -----------------------------------------------------
 * 3. Text search helper (Step 4.3)
 * -----------------------------------------------------
 * Filter projects by whatever's typed in the search bar.
 * Case-insensitive, searches across ALL fields in the project object.
 */
function filterProjectsByQuery(queryRaw) {
  const q = queryRaw.trim().toLowerCase();
  if (!q) return allProjects;

  return allProjects.filter((project) => {
    const values = Object.values(project).join('\n').toLowerCase();
    return values.includes(q);
  });
}

/*
 * -----------------------------------------------------
 * 4. Pie + legend renderer (Steps 1–2–5.2)
 * -----------------------------------------------------
 *
 * This draws:
 *  - the pie wedges (<path> in the SVG)
 *  - the legend (<li> in the UL)
 *
 * IMPORTANT:
 * - projectsForPie is the BASESET for the pie. This should be the
 *   *search-filtered* set, not the year-filtered set.
 *   So the pie always shows all (matching the search),
 *   even if you're currently filtering to one specific year.
 *
 * - selectedIndex is used to add the "selected" class to
 *   the correct wedge + legend item.
 *
 * - click handlers update selectedIndex and then call applyFilteredView()
 *   to re-render the visible projects list below.
 */
function renderPieChart(projectsForPie) {
  // A. roll up counts per year
  // rolledData looks like: [ ['2024', 3], ['2023', 4], ... ]
  const rolledData = d3.rollups(
    projectsForPie,
    (v) => v.length,
    (d) => d.year,
  );

  // B. convert into objects the pie() expects
  // [{ label: '2024', value: 3 }, ...]
  const data = rolledData.map(([year, count]) => ({
    label: year,
    value: count,
  }));

  // C. setup pie and arc generators
  const sliceGenerator = d3.pie().value(d => d.value);
  const arcData = sliceGenerator(data);

  const arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

  // D. color scale
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  // E. clear previous wedges + legend entries
  pieSVG.selectAll('*').remove();
  legendUL.selectAll('*').remove();

  // F. draw wedges
  const paths = pieSVG
    .selectAll('path')
    .data(arcData)
    .enter()
    .append('path')
    .attr('d', d => arcGenerator(d))
    .attr('fill', (_d, idx) => colors(idx))
    // if this slice is the selected one, give it the .selected class
    .attr('class', (_d, idx) => (
      idx === selectedIndex ? 'selected' : ''
    ))
    .on('click', (_event, _d, idx) => {
      // toggle selection:
      // if you click the same slice, deselect (-1), else select new index
      selectedIndex = (selectedIndex === idx) ? -1 : idx;
      applyFilteredView(); // <- re-render the bottom list + refresh chart highlight
    });

  // G. draw legend items
  const legendItems = legendUL
    .selectAll('li')
    .data(data)
    .enter()
    .append('li')
    .attr('class', (_d, idx) => (
      idx === selectedIndex ? 'legend-item selected' : 'legend-item'
    ))
    // expose a --color custom prop for the swatch and for .selected overrides
    .attr('style', (_d, idx) => `--color:${colors(idx)}`)
    .html(d => `
      <span class="swatch"></span>
      ${d.label} <em>(${d.value})</em>
    `)
    .on('click', (_event, _d, idx) => {
      selectedIndex = (selectedIndex === idx) ? -1 : idx;
      applyFilteredView();
    });

  // H. pointer cursor on interactive elements
  paths.style('cursor', 'pointer');
  legendItems.style('cursor', 'pointer');
}

/*
 * -----------------------------------------------------
 * 5. The brain: applyFilteredView (Steps 4.4 + 5.2 + 5.3)
 * -----------------------------------------------------
 *
 * This decides:
 * - Which projects are currently visible in the grid
 * - What the <h1> count text is
 * - How the pie/legend should look
 *
 * Logic:
 *   1. Start with search filter only -> afterSearch
 *   2. Draw the pie/legend using afterSearch (NOT year filtered!)
 *   3. If no slice selected (selectedIndex === -1):
 *        show all of afterSearch in the grid.
 *      Else:
 *        figure out which year that slice index corresponds to,
 *        filter afterSearch to that year, and render only that subset.
 */
function applyFilteredView() {
  // 1. search filter
  const currentQuery = searchInput ? searchInput.value || '' : '';
  const afterSearch = filterProjectsByQuery(currentQuery);

  // 2. ALWAYS redraw the pie chart based on afterSearch,
  //    so the pie shows all search-matching years,
  //    not just the currently selected one.
  //    Because renderPieChart() uses selectedIndex
  //    when deciding which wedge to .selected,
  //    the highlight will stay in sync.
  renderPieChart(afterSearch);

  // 3. If nothing is selected in the pie, just render everything from afterSearch
  if (selectedIndex === -1) {
    renderProjects(afterSearch, projectsContainer, 'h2');
    if (titleElement) {
      titleElement.textContent = `Projects (${afterSearch.length})`;
    }
    return;
  }

  // 4. If a slice IS selected:
  //    map selectedIndex -> which year label that slice represents.
  //    We must recompute the same rolledData we used in renderPieChart(),
  //    and in the same order, so indices line up.
  const rolledData = d3.rollups(
    afterSearch,
    (v) => v.length,
    (d) => d.year,
  );
  // rolledData is like [ ['2024', 3], ['2023', 4], ... ]
  const selectedYear = rolledData[selectedIndex]?.[0];

  // If selectedIndex points to something that doesn't exist anymore
  // (e.g. you typed in a search that removed that year),
  // fall back to showing everything afterSearch.
  if (!selectedYear) {
    renderProjects(afterSearch, projectsContainer, 'h2');
    if (titleElement) {
      titleElement.textContent = `Projects (${afterSearch.length})`;
    }
    return;
  }

  // 5. Actually filter the visible project cards by that year
  const onlyThatYear = afterSearch.filter(p => p.year === selectedYear);

  renderProjects(onlyThatYear, projectsContainer, 'h2');
  if (titleElement) {
    titleElement.textContent = `Projects (${onlyThatYear.length})`;
  }
}

/*
 * -----------------------------------------------------
 * 6. Search bar live updates (Step 4.4 behavior)
 * -----------------------------------------------------
 * Any time the query changes, recompute the full view.
 */
if (searchInput) {
  searchInput.addEventListener('input', () => {
    applyFilteredView();
  });
}

/*
 * -----------------------------------------------------
 * 7. Initial page load
 * -----------------------------------------------------
 * Show all projects and draw the initial pie.
 * We do this by:
 *  - rendering cards once,
 *  - setting the heading,
 *  - calling applyFilteredView() to sync everything else.
 */

// Initial "full list" render for projects section
renderProjects(allProjects, projectsContainer, 'h2');
if (titleElement) {
  titleElement.textContent = `Projects (${allProjects.length})`;
}

// Now run the unified render once to draw the pie/legend
// and ensure selectedIndex syncing is respected
applyFilteredView();
