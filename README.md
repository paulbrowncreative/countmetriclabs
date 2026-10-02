# CountMetric Labs website

Static marketing site for CountMetric Labs: ISO 11171 particle counter calibration, fluid particle counting and APC consulting.

- **No runtime dependencies.** Plain HTML, one CSS file (~42 KB), one JS file (progressive enhancement only).
- **Zero-dependency build** (`scripts/build.mjs`) that assembles pages from partials and generates breadcrumbs, JSON-LD, `sitemap.xml`, `robots.txt` and the CSP hash.
- **SEO guardrails:** the build fails on duplicate or over-length titles, out-of-range meta descriptions, or anything other than exactly one `<h1>` per page.

## Commands

```bash
npm install          # dev tooling only (Playwright + axe-core for QA)
npm run build        # src/ -> dist/
npm run serve        # preview dist/ at http://localhost:4173
npm run qa           # links, anchors, JSON-LD, overflow at 6 viewports, axe WCAG 2.2 AA
npm run images       # re-render OG image, logo PNG, touch icon, favicon.ico
```

## Structure

```
site.config.json        Site URL, form endpoint, contact details (single source of truth)
src/partials/           layout, header, footer, CTA band
src/pages/              one file per page; JSON front matter between --- fences
src/assets/             css, js, self-hosted fonts, images
src/static/             copied to dist root (favicons, _headers)
scripts/                build, QA, image rendering
docs/REPORT.md          audit, strategy, SEO map, QA results, roadmap
```

### Page front matter

```json
{
  "title": "≤ 62 chars",
  "description": "110–160 chars",
  "nav": "services | industries | accreditation | resources | contact",
  "breadcrumbs": [["Services", "/services/"], ["Page", "/services/page/"]],
  "service": { "name": "...", "serviceType": "..." },   // adds Service schema
  "article": { "published": "YYYY-MM-DD" },               // adds TechArticle schema
  "noindex": false
}
```

## Before launch

1. **Form handling.** Default action is `/thank-you/` with Netlify Forms attributes. On any other host, set `formEndpoint` in `site.config.json` (e.g. Formspree, Basin, or your own endpoint) and rebuild.
2. **Contact details.** Add `email` / `phone` to `site.config.json`. They appear in the footer, Organization schema and form error fallback automatically.
3. **Confirm flagged content.** Search the source for `CLIENT CONFIRM`, `SME REVIEW` and `LEGAL REVIEW`. See `docs/REPORT.md` §7.
4. **Analytics.** Add the GTM/GA4 snippet where marked in `src/partials/layout.html`, and add its domains to the CSP in `src/static/_headers`. Events are already pushed to `dataLayer`.
5. **Redirects.** Map any existing URLs on the live site to their new equivalents (301) before switching DNS.
6. **Headers.** `_headers` works on Netlify and Cloudflare Pages. Replicate on other hosts.
