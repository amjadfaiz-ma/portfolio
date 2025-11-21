// meta/main.js
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

// x/y scales need to be accessible from brushing helpers
let xScale;
let yScale;

// ------------------------
// Step 1 filtering globals
// ------------------------
let commitProgress = 100;
let timeScale;
let commitMaxTime;
let filteredCommits;

let colors = d3.scaleOrdinal(d3.schemeTableau10);


// -----------------------------
// Step 1.1: load and clean CSV
// -----------------------------
async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

// --------------------------------------
// Step 1.2: compute commit-level data
// --------------------------------------
function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];
      const { author, date, time, timezone, datetime } = first;

      const ret = {
        id: commit,
        // you can change this URL to your own repo if needed
        url: 'https://github.com/vis-society/lab-7/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        // hour of day as a decimal, e.g. 14.5 = 2:30pm
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        // how many lines this commit modified
        totalLines: lines.length,
      };

      // attach the original line objects without cluttering the console
      Object.defineProperty(ret, 'lines', {
        value: lines,
        writable: false,
        configurable: false,
        enumerable: false, // hidden in Object.keys, visible when expanded
      });

      return ret;
    });
}

// ------------------------------------
// Step 1.3: summary stats on #stats
// ------------------------------------
function renderCommitInfo(data, commits) {
  const container = d3.select('#stats');

  // Heading
  container.append('h2').text('Summary');

  // Definition list for stats
  const dl = container.append('dl').attr('class', 'stats');

  // Helper to add one stat
  const addStat = (label, value) => {
    dl.append('dt').text(label);
    dl.append('dd').text(value);
  };

  // # of files
  const numFiles = d3.group(data, (d) => d.file).size;

  // max depth over all lines
  const maxDepth = d3.max(data, (d) => d.depth);

  // longest line length in characters
  const longestLineLen = d3.max(data, (d) => d.length);

  // max lines in any single file (largest line number)
  const fileLengths = d3.rollups(
    data,
    (v) => d3.max(v, (d) => d.line),
    (d) => d.file
  );
  const maxLines = d3.max(fileLengths, (d) => d[1]);

  // add stats in the order of the screenshot
  addStat('COMMITS', commits.length);
  addStat('FILES', numFiles);
  addStat('TOTAL LOC', data.length);
  addStat('MAX DEPTH', maxDepth);
  addStat('LONGEST LINE', longestLineLen);
  addStat('MAX LINES', maxLines);
}

// ---------------------------------
// Step 3: tooltip helpers
// ---------------------------------
function renderTooltipContent(commit = {}) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (!commit || Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;

  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });

  time.textContent = commit.datetime?.toLocaleTimeString('en', {
    timeStyle: 'short',
  });

  author.textContent = commit.author ?? '';
  lines.textContent = commit.lines ? commit.lines.length : commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  const offset = 12; // small offset so cursor isn't on top of tooltip
  tooltip.style.left = `${event.clientX + offset}px`;
  tooltip.style.top = `${event.clientY + offset}px`;
}

// -------------------------------------------------
// Step 5 helpers: hit-testing + selection summaries
// -------------------------------------------------
function isCommitSelected(selection, commit) {
  if (!selection) return false;

  // selection is [[x0,y0], [x1,y1]]
  const [x0, x1] = selection.map((d) => d[0]);
  const [y0, y1] = selection.map((d) => d[1]);

  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);

  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

// Step 5.5: count selected commits
function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

// Step 5.6: language breakdown for selected commits
function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }

  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count} lines (${formatted})</dd>
    `;
  }
}

// Step 5.4: brush event handler
function brushed(event) {
  const selection = event.selection;

  d3.selectAll('.dots circle').classed('selected', (d) =>
    isCommitSelected(selection, d)
  );

  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

// Step 5.1 & 5.2: create brush and fix overlay order
function createBrushSelector(svg) {
  const brush = d3.brush().on('start brush end', brushed);

  svg.call(brush);

  // Make sure dots are above overlay so tooltips still work
  svg.selectAll('.dots, .overlay ~ *').raise();
}

// -------------------------------------------------
// Step 2–4: scatterplot + grid + tooltips + sizes
// -------------------------------------------------
function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // Scales (assign to globals so brushing can use them)
  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  // Lines-per-commit range for dot sizes
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

  // Radius scale – sqrt so area ∝ lines edited
  const rScale = d3
    .scaleSqrt()
    .domain([minLines, maxLines])
    .range([2, 30]); // tweak if dots feel too small/large

  // Gridlines BEFORE axes
  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  gridlines.call(
    d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width)
  );

  // Axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  svg
    .append('g')
    .attr('class', 'x-axis')   // NEW
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  // Sort commits so larger bubbles are drawn first (smaller on top)
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  // Dots
  const dots = svg.append('g').attr('class', 'dots');

  dots
    .selectAll('circle')
    .data(sortedCommits, d => d.id)   // NEW
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', (event) => {
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  // Enable brushing on the SVG
  createBrushSelector(svg);
}

function updateScatterPlot(data, commits) {
  const svg = d3.select("#chart").select("svg");
  if (svg.empty()) return;

  // Update x-domain
  xScale.domain(d3.extent(commits, d => d.datetime));

  // Update x-axis
  const xAxisGroup = svg.select("g.x-axis");
  const xAxis = d3.axisBottom(xScale);
  xAxisGroup.selectAll("*").remove();
  xAxisGroup.call(xAxis);

  // Update radii
  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  // Update dots
  const dots = svg.select("g.dots");

  const sorted = d3.sort(commits, d => -d.totalLines);
  dots
    .selectAll('circle')
    .data(sorted, d => d.id)   // NEW
    .join("circle")
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d.hourFrac))
    .attr("r", d => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .style("fill-opacity", 0.7)
    .on("mouseenter", (event, commit) => {
      d3.select(event.currentTarget).style("fill-opacity", 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on("mouseleave", (event) => {
      d3.select(event.currentTarget).style("fill-opacity", 0.7);
      updateTooltipVisibility(false);
    });
}

// --------------------------------------------
// Step 3.2: Insert scrolly steps for each commit
// --------------------------------------------
function generateScrollySteps(commits) {
  d3.select('#scatter-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html((d, i) => `
      <p>
        On ${d.datetime.toLocaleString('en', {
          dateStyle: 'full',
          timeStyle: 'short',
        })},
        I made
        <a href="${d.url}" target="_blank">
          ${i > 0 ? 'another glorious commit' : 'my very first glorious commit'}
        </a>.
        I edited ${d.totalLines} lines across ${
          d3.rollups(d.lines, v => v.length, dd => dd.file).length
        } files.
      </p>
    `);
}

function generateFileSteps(commits) {
  d3.select('#files-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html(d => {
      const uniqueFiles = d3.rollups(d.lines, v => v.length, x => x.file).length;
      return `
        <p>
          After this commit (<code>${d.id.slice(0,7)}</code>),
          the project grew to affect <strong>${uniqueFiles}</strong> files.
          Scroll to see how file sizes evolve.
        </p>
      `;
    });
}


function updateFileDisplay(filteredCommits) {
  // Step 2.1: get all lines from filtered commits
  const lines = filteredCommits.flatMap(d => d.lines);

  // group by file, attach lines + dominant type, then sort by size (Step 2.3)
  let files = d3
    .groups(lines, d => d.file)
    .map(([name, lines]) => {
      // find most common type in this file (for color)
      const typeCounts = d3.rollups(
        lines,
        v => v.length,
        d => d.type
      ).sort((a, b) => b[1] - a[1]);

      const mainType = typeCounts.length ? typeCounts[0][0] : null;

      return { name, lines, type: mainType };
    })
    .sort((a, b) => b.lines.length - a.lines.length); // Step 2.3

  // bind files to <div>s inside #files
  const filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, d => d.name)
    .join(
      enter =>
        enter.append('div').call(div => {
          div.append('dt').append('code');
          div.append('dd');
        }),
      update => update,
      exit => exit.remove()
    );

  // set filename + total lines in <dt> (Step 2.2 hint to show count)
  filesContainer
    .select('dt > code')
    .html(d => `
      ${d.name}
      <br>
      <small>${d.lines.length} lines</small>
    `);

  // set a CSS variable for color based on technology (Step 2.4)
  filesContainer.attr('style', d =>
    d.type ? `--color: ${colors(d.type)}` : null
  );

  // Step 2.2: inside each <dd>, draw one .loc div per line
  filesContainer
    .select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc');
}

function onTimeSliderChange() {
  commitProgress = +document.getElementById("commit-progress").value;
  commitMaxTime = timeScale.invert(commitProgress);

  // update time display
  document.getElementById("commit-time").textContent =
    commitMaxTime.toLocaleString("en", {
      dateStyle: "long",
      timeStyle: "short",
    });

  // filter commits
  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);

  // update scatter plot
  updateScatterPlot(data, filteredCommits);

  // update file unit visualization (Step 2.1–2.4)
  updateFileDisplay(filteredCommits);
}

// -------------------
// Run everything
// -------------------
const data = await loadData();
const commits = processCommits(data);

// Step 1.2: time scale for filtering
timeScale = d3.scaleTime()
  .domain([
    d3.min(commits, d => d.datetime),
    d3.max(commits, d => d.datetime)
  ])
  .range([0, 100]);

commitMaxTime = timeScale.invert(commitProgress);
filteredCommits = commits;

// initial file display
updateFileDisplay(filteredCommits);

// Step 1.1: slider setup
const slider = document.getElementById("commit-progress");
slider.addEventListener("input", onTimeSliderChange);

// initialize time display + filtered views
onTimeSliderChange();

// initial render
renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
generateScrollySteps(commits);
generateFileSteps(commits);

// -----------------------------------------------------
// Step 3.3: Scrollama — Update scatter plot on scroll
// -----------------------------------------------------

function onStepEnter(response) {
  const commit = response.element.__data__;

  // Update slider-bound filtered commits so plot reflects this commit
  commitMaxTime = commit.datetime;
  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);

  // Update plot + files, same as slider
  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);

  document.getElementById("commit-time").textContent =
    commit.datetime.toLocaleString("en", {
      dateStyle: "long",
      timeStyle: "short",
    });
}

const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
    offset: 0.5,   // triggers when step hits middle
  })
  .onStepEnter(onStepEnter);

  // -----------------------------------------------------
// Step 4: Scrollama for file-size race
// -----------------------------------------------------
function onFileStepEnter(response) {
  const commit = response.element.__data__;

  // same filtering as scatter section
  const commitTime = commit.datetime;
  const filtered = commits.filter(d => d.datetime <= commitTime);

  // update the file-size visualization
  updateFileDisplay(filtered);
}

const fileScroller = scrollama();
fileScroller
  .setup({
    container: '#scrolly-2',
    step: '#scrolly-2 .step',
    offset: 0.5,
  })
  .onStepEnter(onFileStepEnter);




