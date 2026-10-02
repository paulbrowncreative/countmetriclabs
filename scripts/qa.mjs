// QA harness: serves dist/, then checks every page for broken internal links, console errors,
// horizontal overflow at common viewports, and WCAG 2.2 AA issues (axe-core).
// Usage: npm run build && npm run qa [-- --shots <dir>]
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(root, 'dist');
const shotsArg = process.argv.indexOf('--shots');
const SHOTS = shotsArg > -1 ? path.resolve(process.argv[shotsArg + 1]) : null;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon' };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"ok":true}'); }
  let file = path.join(DIST, decodeURIComponent(url.pathname));
  try { if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html'); } catch {}
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(await readFile(path.join(DIST, '404.html')));
  }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

const sitemap = await readFile(path.join(DIST, 'sitemap.xml'), 'utf8');
const pages = [...sitemap.matchAll(/<loc>https:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
pages.push('/thank-you/');

const VIEWPORTS = [[320, 640], [375, 812], [430, 932], [768, 1024], [1280, 800], [1920, 1080]];
const browser = await chromium.launch();
const issues = [];
const linkStatus = new Map();
if (SHOTS) await mkdir(SHOTS, { recursive: true });

for (const route of pages) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  const resp = await page.goto(base + route, { waitUntil: 'networkidle' });
  if (resp.status() !== 200) issues.push(`${route}: HTTP ${resp.status()}`);

  // Internal links + anchors
  const links = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
  for (const href of links) {
    if (/^(https?:|mailto:|tel:)/.test(href)) continue;
    const u = new URL(href, base + route);
    if (u.hash && u.pathname === route) {
      const exists = await page.$(`[id="${decodeURIComponent(u.hash.slice(1))}"]`);
      if (!exists) issues.push(`${route}: missing anchor ${u.hash}`);
    }
    const key = u.pathname;
    if (!linkStatus.has(key)) {
      const r = await ctx.request.get(base + key);
      const ok = r.status() === 200 && !(await r.text()).includes('That page is out of range');
      linkStatus.set(key, ok);
    }
    if (!linkStatus.get(key)) issues.push(`${route}: broken link ${href}`);
  }

  // Structured data must parse
  for (const json of await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => x.textContent))) {
    try { JSON.parse(json); } catch { issues.push(`${route}: invalid JSON-LD`); }
  }

  // Overflow at each viewport
  for (const [w, h] of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(50);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      if (doc.scrollWidth <= doc.clientWidth + 1) return null;
      const offenders = [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 1 && !el.closest('.table-wrap, .hp, .skip-link, .visually-hidden'))
        .slice(0, 3).map((el) => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
      return offenders.length ? `${doc.scrollWidth}px (${offenders.join(', ')})` : null;
    });
    if (overflow) issues.push(`${route} @${w}px: horizontal overflow ${overflow}`);
    if (SHOTS && [375, 1280].includes(w)) {
      const name = (route === '/' ? 'home' : route.replace(/^\/|\/$/g, '').replace(/\//g, '_')) + `@${w}.png`;
      await page.screenshot({ path: path.join(SHOTS, name), fullPage: true });
    }
  }

  // Accessibility (desktop + mobile)
  for (const w of [1280, 375]) {
    await page.setViewportSize({ width: w, height: 900 });
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
    for (const v of axe.violations) {
      const detail = v.nodes[0].any[0]?.message ? ` — ${v.nodes[0].any[0].message}` : '';
      issues.push(`${route} @${w}px: axe ${v.impact} ${v.id} (${v.nodes.length}) ${v.nodes[0].target.join(' ')}${detail}`);
    }
  }
  if (errors.length) issues.push(`${route}: console errors: ${errors.join(' | ')}`);
  await ctx.close();
}

await browser.close();
server.close();
console.log(`Checked ${pages.length} pages × ${VIEWPORTS.length} viewports, ${linkStatus.size} unique internal URLs.`);
if (issues.length) { console.log(`\n${issues.length} issue(s):\n  ` + [...new Set(issues)].join('\n  ')); process.exitCode = 1; }
else console.log('No issues found.');
