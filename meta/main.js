// meta/main.js
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale;
let yScale;

// Step 1.1: load and clean the CSV
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

// Step 1.2: compute commit-level data
function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];
      const { author, date, time, timezone, datetime } = first;

      const ret = {
        id: commit,
        // you can change this URL to your own repo if needed
        url: 'https://github.com/amjadfaiz-ma/portfolio/commit/' + commit,
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
        enumerable: false, // <- hidden in for…in / Object.keys, but visible when expanded
      });

      return ret;
    });
}

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

  // --- derived values ---

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

  // --- add stats in the order of the screenshot ---

  addStat('COMMITS', commits.length);
  addStat('FILES', numFiles);
  addStat('TOTAL LOC', data.length);
  addStat('MAX DEPTH', maxDepth);
  addStat('LONGEST LINE', longestLineLen);
  addStat('MAX LINES', maxLines);
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;

  // selection is [[x0,y0], [x1,y1]]
  const [x0, x1] = selection.map((d) => d[0]);
  const [y0, y1] = selection.map((d) => d[1]);

  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);

  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
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

function brushed(event) {
  const selection = event.selection;

  d3.selectAll('.dots circle').classed('selected', (d) =>
    isCommitSelected(selection, d)
  );
}

function createBrushSelector(svg) {
  const brush = d3.brush().on('start brush end', brushed);

  // Create brush on the whole SVG
  svg.call(brush);

  // Make sure overlay is behind dots so tooltips still work
  svg.selectAll('.dots, .overlay ~ *').raise();
}

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

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  // Lines-per-commit range for dot sizes
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

  // Radius scale – sqrt so area ∝ lines edited
  const rScale = d3
    .scaleSqrt()               // Step 4.2: use square-root scale
    .domain([minLines, maxLines])
    .range([2, 30]);           // tweak if dots feel too small/large

  // 🟢 Add gridlines BEFORE axes
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
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);


  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  // Dots
  const dots = svg.append('g').attr('class', 'dots');

  dots
    .selectAll('circle')
    .data(sortedCommits)              // <-- use sortedCommits here
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

function renderTooltipContent(commit = {}) {
  // Grab DOM elements once per call
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  // If commit is empty or undefined, do nothing
  if (!commit || Object.keys(commit).length === 0) return;

  // Link + commit id
  link.href = commit.url;
  link.textContent = commit.id;

  // Full date
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });

  // Time
  time.textContent = commit.datetime?.toLocaleTimeString('en', {
    timeStyle: 'short',
  });

  // Author
  author.textContent = commit.author ?? '';

  // Lines edited (we stored the full list on commit.lines)
  lines.textContent = commit.lines ? commit.lines.length : commit.totalLines;
}


const data = await loadData();
const commits = processCommits(data);

// Step 1 summary stats
renderCommitInfo(data, commits);

// Step 2 scatterplot
renderScatterPlot(data, commits);

