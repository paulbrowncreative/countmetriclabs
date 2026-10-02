// Renders bitmap brand assets (OG image, logo, touch icon, favicon.ico) from HTML/SVG using Playwright.
// Run: node scripts/render-images.mjs  (requires the global playwright install)
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const b64 = async (f) => (await readFile(path.join(root, 'src/assets/fonts', f))).toString('base64');
const fontCss = `
@font-face{font-family:IS;src:url(data:font/woff2;base64,${await b64('instrument-sans-latin.woff2')}) format('woff2');font-weight:400 700}
@font-face{font-family:PM;src:url(data:font/woff2;base64,${await b64('ibm-plex-mono-500-latin.woff2')}) format('woff2');font-weight:500}`;

const mark = (stroke = '#fff', accent = '#ff9a6b') => `
<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="29" height="29" rx="3" fill="none" stroke="${stroke}" stroke-width="2.4"/>
<rect x="7" y="9" width="4" height="15" fill="${stroke}"/><rect x="14" y="14" width="4" height="10" fill="${stroke}"/><rect x="21" y="19" width="4" height="5" fill="${accent}"/></svg>`;

const og = `<!doctype html><html><head><style>${fontCss}
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;background:#0f1b22;color:#fff;font-family:IS;position:relative;overflow:hidden}
.grid{position:absolute;inset:0;background-image:linear-gradient(to right,rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.05) 1px,transparent 1px);background-size:48px 48px}
.ticks{position:absolute;left:0;right:0;bottom:0;height:22px;background:repeating-linear-gradient(to right,rgba(255,255,255,.35) 0 1px,transparent 1px 60px),repeating-linear-gradient(to right,rgba(255,255,255,.16) 0 1px,transparent 1px 12px);background-size:100% 22px,100% 11px;background-repeat:no-repeat;background-position:bottom}
.wrap{position:relative;padding:72px 80px}
.brand{display:flex;align-items:center;gap:18px;font-weight:700;font-size:34px;letter-spacing:-.02em}
.brand svg{width:52px;height:52px}.brand small{font:500 16px PM;letter-spacing:.14em;color:#a9b6bd;margin-left:4px}
h1{margin-top:88px;font-size:72px;line-height:1.04;letter-spacing:-.03em;font-weight:600;max-width:900px}
h1 em{font-style:normal;color:#ff9a6b}
.std{display:flex;gap:12px;margin-top:44px}.std span{font:500 20px PM;color:#dbe3e7;border:1px solid rgba(255,255,255,.2);padding:10px 14px;border-radius:3px}
</style></head><body><div class="grid"></div><div class="ticks"></div><div class="wrap">
<div class="brand">${mark()}<span>CountMetric <small>LABS</small></span></div>
<h1>Particle counts you can <em>defend</em>.</h1>
<div class="std"><span>ISO 11171 calibration</span><span>ISO 4406</span><span>SAE AS4059</span></div>
</div></body></html>`;

const square = (size, pad, bg, radius) => `<!doctype html><html><head><style>*{margin:0}body{width:${size}px;height:${size}px;background:transparent}
div{width:${size}px;height:${size}px;background:${bg};border-radius:${radius}px;display:grid;place-items:center}svg{width:${size - pad * 2}px;height:${size - pad * 2}px}</style></head>
<body><div>${mark()}</div></body></html>`;

const browser = await chromium.launch();
const shot = async (html, w, h, out, transparent = false) => {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ path: out ? path.join(root, out) : undefined, type: 'png', omitBackground: transparent });
  await page.close();
  return buf;
};
await shot(og, 1200, 630, 'src/assets/img/og-default.png');
await shot(square(512, 96, '#0f1b22', 0), 512, 512, 'src/assets/img/logo-mark.png');
await shot(square(180, 32, '#0f1b22', 0), 180, 180, 'src/static/apple-touch-icon.png');
const ico32 = await shot(square(32, 4, '#0f1b22', 6), 32, 32, null, true);
await browser.close();

// favicon.ico containing a single embedded 32x32 PNG
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
header.writeUInt8(32, 6); header.writeUInt8(32, 7); header.writeUInt8(0, 8); header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12); header.writeUInt32LE(ico32.length, 14); header.writeUInt32LE(22, 18);
await writeFile(path.join(root, 'src/static/favicon.ico'), Buffer.concat([header, ico32]));
console.log('Rendered og-default.png, logo-mark.png, apple-touch-icon.png, favicon.ico');
