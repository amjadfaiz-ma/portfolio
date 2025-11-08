import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

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

const data = await loadData();

// Example visualization: number of lines per file type
const summary = d3.rollups(
  data,
  (v) => d3.sum(v, (d) => d.length),
  (d) => d.type
);

const container = d3.select('#stats');
container.append('h2').text('Lines of Code by File Type');

const ul = container.append('ul');
ul.selectAll('li')
  .data(summary)
  .enter()
  .append('li')
  .text(([type, total]) => `${type}: ${total} lines`);
