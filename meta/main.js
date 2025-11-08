// meta/main.js
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

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
        enumerable: false, // <- hidden in for…in / Object.keys, but visible when expanded
      });

      return ret;
    });
}

function renderCommitInfo(data, commits) {
  // Create the <dl> element inside #stats
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  // --- Required stats from the instructions ---

  // Total LOC (one row per line in loc.csv)
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  // Total commits
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  // --- Extra stats (pick 3–4) ---

  // 1) Number of files in the codebase
  const numFiles = d3.group(data, (d) => d.file).size;
  dl.append('dt').text('Files');
  dl.append('dd').text(numFiles);

  // Compute per-file lengths first (max line number per file)
  const fileLengths = d3.rollups(
    data,
    (v) => d3.max(v, (d) => d.line),
    (d) => d.file
  );

  // 2) Longest file (name + length)
  const [longestFileName, longestFileLen] =
    d3.greatest(fileLengths, (d) => d[1]);
  dl.append('dt').text('Longest file');
  dl.append('dd').text(`${longestFileName} (${longestFileLen} lines)`);

  // 3) Average file length (in lines)
  const avgFileLength = d3.mean(fileLengths, (d) => d[1]);
  dl.append('dt').text('Average file length');
  dl.append('dd').text(`${avgFileLength.toFixed(1)} lines`);

  // 4) Time of day that most work is done
  const workByPeriod = d3.rollups(
    data,
    (v) => v.length,
    (d) => d.datetime.toLocaleString('en', { dayPeriod: 'short' })
    // usually "morning", "afternoon", "evening", "night"
  );
  const mostActivePeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0];

  if (mostActivePeriod) {
    dl.append('dt').text('Most active time of day');
    dl.append('dd').text(mostActivePeriod);
  }
}
