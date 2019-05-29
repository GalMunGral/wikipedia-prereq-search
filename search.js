const https = require('https');
const fs = require('fs');
const { JSDOM } = require('jsdom');

const dateString = new Date().toISOString();
const f = fs.createWriteStream(`${dateString}.txt`);
const set = new Set();

// For later use
class Node {
  constructor(rank) {
    this.children = [];
    this.parent = null;
    this.rank = rank;
  }
}

/**
 * Builds a DOM for extracting links.
 * @param {string} url 
 */
const createDOM = url => new Promise((resolve, reject) => {
  let html = '';
  https.get(url, res => {
    res.setEncoding('utf-8');
    res.on('data', data => { html += data });
    res.on('end', () => resolve(new JSDOM(html)));
  }).on('error', e => {
    console.log('Unable to fetch the URL');
    console.log(e);
  })
});

/**
 * Example 'hilbert space' => '/Hilbert_space'
 * @param {string} str space separated name 
 */
function formatInput(str) {
  if (!str) {
    console.log('Exited. No input argument.');
    process.exit();
  }
  const capitalized = str.charAt(0).toUpperCase() + str.slice(1);
  return '/' + capitalized.replace(/ /g, '_');
}

/**
 * Recursively search for prerequisites.
 * Return immediately if the URL points to the same page or non-content page.
 * In order to prevent infinite loop:
 *  i. A maximum level of recursion is required. The default value is 4.
 *  ii. Return if the page has been encountered before (found in the set).
 * @param {string} url Current url
 * @param {number} lvl Current level of recursion
 * @param {number} rank The maximum level of recursion
 */
function getPrereq(url, lvl = 1, rank = 3) {
  if (url.includes('about:blank') || url.includes('.php')) return;

  const chars = /[\w,\*\.\-\(\):%]/;
  const match = new RegExp(`\/(${chars.source}+$|${chars.source}+(?=#))`);
  const entry = url.match(match)[1];

  if (set.has(entry)) return;

  const output = (
    (lvl === 1 ? '---' : '  |')
    + `${'-'.repeat(lvl)} ${decodeURIComponent(entry)}`
  );

  f.write(output + '\n');
  process.stdout.write(output + '\n');
  set.add(entry);
  const STEP = lvl;
  if (lvl === rank) return;

  createDOM('https://en.wikipedia.org/wiki/' + entry)
    .then(dom => {
      anchors = dom.window.document.querySelectorAll('p a');
      hrefList = [...anchors].map(a => a.href);
      hrefList.sort();
      for (let i = 0; i < hrefList.length - STEP; i += STEP) {
        if (hrefList[i] === hrefList[i + STEP]) {
          getPrereq(hrefList[i], lvl + 1, rank);
        }
      }
    }).catch(e => {
      console.log(e);
    });
}

getPrereq(formatInput(process.argv[2]), 1, parseInt(process.argv[3]));
