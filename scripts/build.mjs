// Zero-dependency static site build.
// src/pages/**/*.html  ->  dist/<route>/index.html
// Each page starts with a JSON front-matter block between --- fences.
import { readFile, writeFile, mkdir, readdir, cp, rm, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'src');
const DIST = path.join(root, 'dist');
const config = JSON.parse(await readFile(path.join(root, 'site.config.json'), 'utf8'));
const BUILD_DATE = new Date().toISOString().slice(0, 10);

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function parsePage(raw, file) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`Missing front matter: ${file}`);
  return { meta: JSON.parse(match[1]), body: match[2] };
}

async function hashFile(rel) {
  const buf = await readFile(path.join(SRC, rel));
  return createHash('sha256').update(buf).digest('hex').slice(0, 10);
}

// ---------- Structured data ----------
const orgId = `${config.url}/#organization`;
function organizationSchema() {
  const org = {
    '@type': 'Organization',
    '@id': orgId,
    name: config.name,
    url: `${config.url}/`,
    logo: `${config.url}/assets/img/logo-mark.png`,
    description:
      'Specialist laboratory for automatic particle counter calibration to ISO 11171, fluid cleanliness testing and particle counting consulting.',
  };
  if (config.contact.email) org.email = config.contact.email;
  if (config.contact.phone) org.telephone = config.contact.phone;
  return org;
}

function breadcrumbSchema(crumbs) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map(([name, href], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: `${config.url}${href}`,
    })),
  };
}

function pageSchema(meta, canonical, crumbs) {
  const graph = [];
  if (meta.route === '/') {
    graph.push(organizationSchema(), {
      '@type': 'WebSite',
      '@id': `${config.url}/#website`,
      url: `${config.url}/`,
      name: config.name,
      publisher: { '@id': orgId },
    });
  }
  graph.push({
    '@type': meta.schemaType || 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: meta.title,
    description: meta.description,
    isPartOf: { '@id': `${config.url}/#website` },
    ...(crumbs.length > 1 ? { breadcrumb: { '@id': `${canonical}#breadcrumb` } } : {}),
  });
  if (crumbs.length > 1) graph.push({ '@id': `${canonical}#breadcrumb`, ...breadcrumbSchema(crumbs) });
  if (meta.service) {
    graph.push({
      '@type': 'Service',
      '@id': `${canonical}#service`,
      name: meta.service.name,
      serviceType: meta.service.serviceType,
      description: meta.service.description || meta.description,
      provider: { '@id': orgId },
      areaServed: meta.service.areaServed || undefined,
      url: canonical,
    });
    if (meta.route !== '/') graph.push(organizationSchema());
  }
  if (meta.article) {
    graph.push({
      '@type': 'TechArticle',
      '@id': `${canonical}#article`,
      headline: meta.h1 || meta.title,
      description: meta.description,
      mainEntityOfPage: { '@id': `${canonical}#webpage` },
      author: { '@id': orgId },
      publisher: { '@id': orgId },
      datePublished: meta.article.published,
      dateModified: meta.article.modified || meta.article.published,
      about: meta.article.about,
    });
    if (!meta.service) graph.push(organizationSchema());
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}

// ---------- Partials ----------
function breadcrumbHtml(crumbs) {
  if (crumbs.length < 2) return '';
  const items = crumbs
    .map(([name, href], i) =>
      i === crumbs.length - 1
        ? `<li><span aria-current="page">${esc(name)}</span></li>`
        : `<li><a href="${href}">${esc(name)}</a></li>`,
    )
    .join('');
  return `<nav class="breadcrumb container" aria-label="Breadcrumb"><ol>${items}</ol></nav>`;
}

function contactLines() {
  const lines = [];
  if (config.contact.email)
    lines.push(`<li><a href="mailto:${esc(config.contact.email)}" data-track="email_click">${esc(config.contact.email)}</a></li>`);
  if (config.contact.phone)
    lines.push(`<li><a href="tel:${esc(config.contact.phone.replace(/[^+\d]/g, ''))}" data-track="phone_click">${esc(config.contact.phone)}</a></li>`);
  lines.push('<li><a href="/contact/">Send an inquiry</a></li>');
  return lines.join('');
}

// ---------- Build ----------
await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
await cp(path.join(SRC, 'assets'), path.join(DIST, 'assets'), { recursive: true });
await cp(path.join(SRC, 'static'), DIST, { recursive: true });

const assetVersion = {
  css: await hashFile('assets/css/main.css'),
  js: await hashFile('assets/js/site.js'),
};

const layout = await readFile(path.join(SRC, 'partials/layout.html'), 'utf8');
const header = await readFile(path.join(SRC, 'partials/header.html'), 'utf8');
const footer = await readFile(path.join(SRC, 'partials/footer.html'), 'utf8');
const cta = await readFile(path.join(SRC, 'partials/cta.html'), 'utf8');

const files = await walk(path.join(SRC, 'pages'));
const seenTitles = new Map();
const seenDescriptions = new Map();
const sitemap = [];
const problems = [];

for (const file of files) {
  const { meta, body } = parsePage(await readFile(file, 'utf8'), file);
  const rel = path.relative(path.join(SRC, 'pages'), file).replace(/\\/g, '/');
  const route = meta.route ?? (rel === 'index.html' ? '/' : `/${rel.replace(/(index)?\.html$/, '').replace(/\/?$/, '/')}`);
  meta.route = route;
  const canonical = `${config.url}${route}`;
  const crumbs = route === '/' ? [['Home', '/']] : [['Home', '/'], ...(meta.breadcrumbs || [])];

  // SEO guardrails
  if (!meta.title || !meta.description) problems.push(`${rel}: missing title/description`);
  if (meta.title.length > 62) problems.push(`${rel}: title ${meta.title.length} chars (>62)`);
  if (meta.description.length < 110 || meta.description.length > 160)
    problems.push(`${rel}: description ${meta.description.length} chars (want 110–160)`);
  if (seenTitles.has(meta.title)) problems.push(`${rel}: duplicate title with ${seenTitles.get(meta.title)}`);
  if (seenDescriptions.has(meta.description)) problems.push(`${rel}: duplicate description`);
  seenTitles.set(meta.title, rel);
  seenDescriptions.set(meta.description, rel);
  const h1Count = (body.match(/<h1[\s>]/g) || []).length;
  if (h1Count !== 1) problems.push(`${rel}: expected exactly one <h1>, found ${h1Count}`);

  const robots = meta.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large';
  const ogImage = `${config.url}${meta.ogImage || config.defaultOgImage}`;
  const pageBody = body.replace('{{cta}}', cta);

  const html = layout
    .replaceAll('{{title}}', esc(meta.title))
    .replaceAll('{{description}}', esc(meta.description))
    .replaceAll('{{canonical}}', canonical)
    .replaceAll('{{robots}}', robots)
    .replaceAll('{{ogType}}', meta.article ? 'article' : 'website')
    .replaceAll('{{ogImage}}', ogImage)
    .replaceAll('{{siteName}}', esc(config.name))
    .replaceAll('{{locale}}', config.locale)
    .replaceAll('{{themeColor}}', config.themeColor)
    .replaceAll('{{cssVersion}}', assetVersion.css)
    .replaceAll('{{jsVersion}}', assetVersion.js)
    .replaceAll('{{bodyClass}}', meta.bodyClass || '')
    .replace('{{schema}}', meta.noindex ? '' : `<script type="application/ld+json">${pageSchema(meta, canonical, crumbs)}</script>`)
    .replace('{{header}}', header)
    .replace('{{breadcrumb}}', breadcrumbHtml(crumbs))
    .replace('{{content}}', pageBody)
    .replace('{{footer}}', footer.replace('{{contactLines}}', contactLines()).replace('{{year}}', String(new Date().getFullYear())))
    // Mark the active nav section for styling + aria-current
    .replace(new RegExp(`href="([^"]+)" data-nav="${meta.nav}"`), (m, href) => `${m} aria-current="${href === route ? 'page' : 'true'}"`);

  const outFile = path.join(DIST, route === '/404/' ? '404.html' : path.join(route, 'index.html'));
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, html);

  if (!meta.noindex) sitemap.push({ loc: canonical, priority: meta.priority ?? 0.6 });
}

// Form endpoint inside page bodies
for (const file of await walk(DIST)) {
  const html = await readFile(file, 'utf8');
  if (html.includes('{{formEndpoint}}') || html.includes('{{contactEmail}}'))
    await writeFile(
      file,
      html
        // Default '/thank-you/' works with Netlify Forms; set formEndpoint for any other form service.
        .replaceAll('{{formEndpoint}}', esc(config.formEndpoint || '/thank-you/'))
        .replaceAll('{{contactEmail}}', esc(config.contact.email)),
    );
}

sitemap.sort((a, b) => b.priority - a.priority || a.loc.localeCompare(b.loc));
await writeFile(
  path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap
    .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${BUILD_DATE}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
);
// CSP: allow exactly the one inline script in the layout by hash.
const inlineScript = layout.match(/<script>([^<]*)<\/script>/)[1];
const cspHash = createHash('sha256').update(inlineScript).digest('base64');
const headersFile = path.join(DIST, '_headers');
await writeFile(headersFile, (await readFile(headersFile, 'utf8')).replace('sha256-REPLACE_AT_BUILD', `sha256-${cspHash}`));

await writeFile(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${config.url}/sitemap.xml\n`);

const unresolved = [];
for (const file of await walk(DIST)) {
  const html = await readFile(file, 'utf8');
  const m = html.match(/\{\{[a-zA-Z]+\}\}/g);
  if (m) unresolved.push(`${path.relative(DIST, file)}: ${[...new Set(m)].join(', ')}`);
}
problems.push(...unresolved.map((u) => `unresolved placeholder in ${u}`));

const { size } = await stat(path.join(DIST, 'assets/css/main.css'));
console.log(`Built ${files.length} pages, ${sitemap.length} in sitemap. CSS ${(size / 1024).toFixed(1)} KB.`);
if (problems.length) {
  console.error('\nSEO/build problems:\n  ' + problems.join('\n  '));
  process.exitCode = 1;
}
