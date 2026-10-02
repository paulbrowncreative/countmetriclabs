# CountMetric Labs — Audit, Redesign & SEO Report

_Prepared 2 October 2026. Status labels: **FACT** (verified), **RECOMMENDATION**, **ASSUMPTION** (needs client confirmation)._

---

## 0. Scope and limitations (read first)

| Item | Status |
|---|---|
| Live site (countmetriclabs.com) | **Not inspected.** The build environment's network policy blocked the domain (HTTP 403 at the egress proxy) and WebFetch was also blocked. |
| Source repository | Empty at project start (no commits). |
| Search index | No pages for "CountMetric Labs" surfaced in web search, so there was no cached copy to audit. Either the site is new, has little indexed content, or is blocking crawlers. **Check Search Console coverage as a priority.** |
| Analytics / Search Console | No access. No traffic, ranking or conversion baselines exist in this report. |

**Consequence:** this is a ground-up rebuild based on the facts in the project brief, not a modification of the existing site. No existing copy, brand colors, logo, URLs or integrations could be preserved because none could be seen. Everything that depends on them is listed in §7.

---

## 1. Executive summary

**What was delivered:** a complete, production-ready 14-page static website (12 indexable) with a design system, technical SEO foundation, structured data, a conditional lead form, conversion tracking hooks, two in-depth technical guides and an interactive ISO 4406 calculator.

**Measured results (local Lighthouse, mobile emulation, lab data, not field data):**

| Page | Perf | A11y | Best practices | SEO | LCP | CLS | TBT | Weight |
|---|---|---|---|---|---|---|---|---|
| Home | 99 | 100 | 100 | 100 | 1.4 s | 0 | 80 ms | 83 KB |
| ISO 4406 guide | 100 | 100 | 100 | 100 | 1.2 s | 0 | 0 ms | 80 KB |
| Contact | 100 | 100 | 100 | 100 | 1.2 s | 0 | 0 ms | 79 KB |

**The biggest strategic decisions:**
1. **Position as a specialist, not a general lab.** "General labs run particle counts. We only run particle counts." Specialization is the one differentiator a new lab can credibly own against large incumbents.
2. **Turn the accreditation gap into a trust signal.** Instead of hiding pre-accreditation status, the site states it plainly, explains calibration vs. traceability vs. accreditation, and tells buyers exactly when the lab can and can't meet their requirement. This protects the business legally and earns credibility with QA buyers, who are trained to spot overclaiming.
3. **Win organic search with education.** Commercial keywords are dominated by instrument manufacturers and established labs. Technical guides on ISO 11171 and ISO 4406 (with a calculator) are realistic ways to earn links and visibility, and they feed the service pages.

---

## 2. Audience and competitive analysis

### 2.1 Buyers and what they evaluate

| Audience | Primary job | What they need before inquiring |
|---|---|---|
| QA / quality managers | Keep calibration records audit-ready | Method + edition, traceability statement, as-found/as-left data, accreditation status |
| Lab managers | Keep in-house APCs in service | Compatibility by make/model, turnaround, shipping instructions |
| Reliability / maintenance engineers | Hit ISO 4406 targets, protect components | Reporting format, sampling guidance, interpretation help |
| Aerospace & defense suppliers | Meet AS4059 / legacy NAS 1638 specs | Documentation depth; often **require accreditation** |
| Fuel & lubricant suppliers | Prove product cleanliness at handover | Independent counts, dispute resolution |
| Pharma / contamination control | Comply with method-specific requirements | Explicit method fit (USP etc.); not assumed |

**Key insight:** for many aerospace and regulated buyers, accreditation is a hard gate. The site routes them honestly (Accreditation page "Can we meet it today?" table) rather than wasting both sides' time, and steers the business toward buyers who need documented, traceable calibration now.

### 2.2 Competitive landscape (RECOMMENDATION, based on market knowledge and limited research)

Competitors fall into three groups. Detailed site-by-site analysis was not possible within network limits; validate with a manual review.

| Group | Examples | Strengths | Gaps CountMetric can exploit |
|---|---|---|---|
| Instrument OEMs offering calibration | Beckman Coulter (HIAC), PAMAS, Parker, Pall, Hydac, MP Filtri | Brand trust, accredited service networks | Calibrate mainly their own instruments; generic service pages; slow, ticket-driven support |
| Oil-analysis labs | Large commercial oil-analysis labs | Volume, price, broad test menus | Particle counting is one line item; little calibration depth or interpretation |
| Calibration-fluid / reference suppliers | Calibration suspension producers | Deep technical authority | Don't serve end users directly |

**Positioning gap:** nobody owns "independent, instrument-agnostic particle counting specialist with transparent documentation and direct technician access." The site is built around that position.

---

## 3. Information architecture

```
/                                   Home (positioning + routing)
/services/                          Service chooser (situation → service table)
  /services/apc-calibration/        Primary commercial page
  /services/fluid-particle-counting/
  /services/apc-consulting/
/industries/                        One substantial page, 4 anchored sections (avoids 4 thin pages)
/accreditation/                     Status, definitions, fit table, early access
/resources/                         Guide hub
  /resources/iso-11171-calibration-explained/
  /resources/iso-4406-cleanliness-codes/     (+ calculator)
/contact/                           Conditional inquiry form
/privacy/  /thank-you/ (noindex)  /404
```

Every page links into a service page and a conversion path. No orphan pages (verified by QA crawler).

---

## 4. Design system

- **Concept:** instrument panel + calibration certificate. Hairline rules, tick-mark scales, monospaced data labels, one laser-orange accent.
- **Type:** Instrument Sans (headings/body) + IBM Plex Mono (data, labels). Self-hosted WOFF2, latin subset, ~60 KB total, `font-display: swap`, primary face preloaded.
- **Color tokens:** ink `#0f1b22`, paper `#f5f4ef`, accent `#c2410c` (AA with white text), accent-text `#a33508` (AA on paper), petrol `#0f5e66` for data. All verified by axe for WCAG AA contrast.
- **Signature visual:** the hero chart is a real log-log cumulative size distribution. Its values (2,100 / 610 / 62 per mL) correctly convert to ISO 4406 18/16/13, so the illustration is technically correct, which this audience will notice.
- **Components:** buttons (3 variants), service rows, feature grid, steps, status panel, spec tables, FAQ (native `<details>`), report specimen, link cards, forms, CTA band. All tokens live in `:root` in `main.css`.
- **ASSUMPTION:** brand colors and logo are new. If CountMetric has an existing logo or palette, swap the tokens and the SVG mark in `header.html`/`footer.html`.

---

## 5. SEO implementation

### 5.1 Technical SEO (all implemented and verified)

- Unique title (≤62 chars) and meta description (110–160 chars) per page, enforced at build time.
- Self-referencing canonical on every page; `noindex` on thank-you and 404.
- XML sitemap generated automatically from indexable pages; `robots.txt` references it.
- Exactly one `<h1>` per page (build-enforced); logical H2/H3 hierarchy.
- Fully server-rendered HTML; no content depends on JavaScript.
- Open Graph + Twitter card with a custom 1200×630 image.
- Breadcrumb navigation (visible + `BreadcrumbList` schema).
- Clean, descriptive, trailing-slash URLs.
- Security headers + strict CSP (inline script allowed by hash only) in `_headers`.

### 5.2 Structured data

| Type | Where | Notes |
|---|---|---|
| Organization, WebSite | Home | No address, phone or ratings (none verified) |
| Service | 3 service pages | Linked to Organization as provider |
| TechArticle | Both guides | Author/publisher = Organization |
| BreadcrumbList | All interior pages | |
| FAQPage | **Not used** | Google restricts FAQ rich results to authoritative government/health sites, so it adds no benefit here. FAQs remain visible on the page. |
| LocalBusiness | **Not used** | No verified address. Add it once the lab's physical address and hours are confirmed. |

JSON-LD validity is checked in QA. **RECOMMENDATION:** run Google's Rich Results Test after deployment.

### 5.3 Keyword → page map

Search volumes were not measurable without keyword tools; clusters are prioritized by intent and commercial value.

| Cluster | Intent | Target page | Supporting |
|---|---|---|---|
| ISO 11171 calibration · particle counter calibration · APC calibration service · NIST traceable particle counter calibration | Transactional / commercial | `/services/apc-calibration/` | ISO 11171 guide |
| particle count test · oil cleanliness testing · hydraulic fluid particle count lab · ISO 4406 testing | Transactional | `/services/fluid-particle-counting/` | ISO 4406 guide |
| particle counter troubleshooting · labs disagree particle count · NAS 1638 to ISO 4406 | Commercial / problem | `/services/apc-consulting/` | Both guides |
| what is ISO 11171 · µm(c) meaning · primary vs secondary calibration · ISO 4402 vs ISO 11171 | Informational | ISO 11171 guide | Calibration service |
| ISO 4406 chart · ISO 4406 code calculator · 18/16/13 meaning · ISO 4406 vs AS4059 vs NAS 1638 | Informational (high volume, linkable) | ISO 4406 guide | Testing service |
| calibration vs accreditation · ISO 17025 particle counter | Informational / trust | `/accreditation/` | ISO 11171 guide |

No two pages target the same primary cluster (avoids cannibalization).

### 5.4 Local SEO

**RECOMMENDATION:** treat local SEO as secondary. Calibration and sample testing are ship-in services with national (likely international) demand. Once the address is confirmed: create a Google Business Profile (category: calibration laboratory / testing laboratory), add `LocalBusiness` schema with matching NAP, and list on industry directories (STLE, fluid power associations, accreditation body directories once accredited).

---

## 6. Conversion optimization

- **Primary conversion:** quote request via `/contact/`. Every page carries a contextual CTA that preselects the service (`?service=calibration|testing|consulting|other`, `?program=early-access`).
- **Form:** 4 required fields plus 1 service-specific required field, revealed conditionally. Hidden fields are disabled, so they're neither validated nor submitted. Inline validation on blur, error summary with focus management and jump links, specific error copy, loading state, recoverable error state (data kept), success state with focus. Honeypot spam protection. Works without JavaScript (all fields shown, standard POST).
- **Objection handling:** "What happens next" on every CTA band and beside the form; "don't ship until we confirm"; no-obligation quote; accreditation honesty.
- **Tracking (dataLayer, GA4-compatible names):** `cta_click` (with `cta_location`), `form_start`, `form_error`, `generate_lead` (with `service`), `calculator_use`, `email_click`, `phone_click`. **No tag is installed**: add GTM/GA4 and mark `generate_lead` as a key event.

**KPIs to track:** organic impressions and clicks (Search Console), non-branded clicks, sessions to service pages, form start rate, form completion rate (`generate_lead` ÷ `form_start`), qualified-lead rate (CRM), organic share of leads, calculator usage, Core Web Vitals (CrUX, once traffic allows), indexed pages vs. submitted.

---

## 7. Items requiring client input before launch

Each item is marked in the source with an HTML comment.

**Business facts (CLIENT CONFIRM):**
1. Accreditation wording on Home, Accreditation and FAQs. Is ISO/IEC 17025 the target? Any milestones or dates to publish?
2. Is the early-access program still open? What exactly do partners receive? (Copy currently says priority scheduling, direct access, input on report formats, status updates.)
3. Calibration scope: primary and/or secondary? Which instrument makes/models? Bottle-sample APCs only?
4. Report contents (Home specimen + calibration page table).
5. Process steps, preparation and shipping requirements, turnaround policy.
6. Testing: method (ISO 11500?), fluids accepted, degassing/dilution practice, bottle supply.
7. Consulting: remote/on-site, pricing model, "no charge to scope".
8. Industries: any fuel-specific or pharmaceutical (e.g. USP) methods actually supported.
9. Contact email, phone, address; `site.config.json`.
10. Existing logo/brand colors, if any.

**Reviews:**
- **SME REVIEW:** both technical guides, the calibration scope list and the sampling guidance should be checked by the lab's technical lead against their copy of ISO 11171:2022 and ISO 4406:2021.
- **LEGAL REVIEW:** privacy policy (starting point only).

**Technical (deployment):**
- Form endpoint (default works on Netlify only).
- 301 redirects from any existing URLs.
- Analytics container ID; CSP update for it.
- Submit sitemap in Search Console and Bing Webmaster Tools.

---

## 8. QA checklist (actual results)

| Check | Result |
|---|---|
| Build SEO guardrails (titles, descriptions, single H1, unresolved placeholders) | Pass |
| Internal links and in-page anchors (crawler, all pages) | Pass: 0 broken |
| JSON-LD parses on every page | Pass |
| Horizontal overflow at 320 / 375 / 430 / 768 / 1280 / 1920 px | Pass (2 overflow bugs found on guides at ≤430 px, fixed) |
| axe-core WCAG 2.0/2.1/2.2 A + AA + best practice, desktop and mobile, 13 pages | Pass (contrast/specificity bug and empty table headers found, fixed) |
| Console errors | None |
| Mobile menu: open, submenu, Escape, aria-expanded | Pass (containing-block bug found visually, fixed) |
| Desktop submenu keyboard open/close | Pass |
| Form: preselect, conditional fields, validation, error summary focus, server error, success, disabled fields not posted, dataLayer events | Pass (23 scripted checks) |
| ISO 4406 calculator incl. boundaries (1300 → 17, 1300.5 → 18, >28) | Pass |
| Lighthouse mobile (3 pages) | 99–100 all categories |

**Not verified (requires deployment or access):** real form delivery, production headers/CSP, field Core Web Vitals, Rich Results Test, Search Console indexing, cross-browser testing on Safari/Firefox (only Chromium was available), screen reader testing with NVDA/VoiceOver (automated checks only).

---

## 9. Prioritized roadmap

| Priority | Action | Benefit | Effort | Dependency |
|---|---|---|---|---|
| **Critical** | Confirm §7 items, add contact details, configure form endpoint | Launch readiness, legal safety | Low | Client |
| **Critical** | Deploy, 301 old URLs, submit sitemap, verify Search Console | Indexation | Low | Hosting access |
| **Critical** | Install GA4/GTM, set `generate_lead` as key event | Measurement | Low | Analytics account |
| High | Real lab photography (instruments, bench, reports) to replace illustration-only visuals in later sections | Trust, differentiation | Medium | Photo shoot |
| High | Publish a real (redacted) sample calibration report PDF | Trust, conversion | Low | Lab |
| High | Equipment compatibility list (makes/models calibrated) | Qualifies leads, long-tail SEO | Low | Lab |
| Medium | Guides: preparing an APC for calibration; why labs disagree on particle counts; AS4059 explained; sampling best practice | Topical authority | Medium | SME time |
| Medium | Published pricing ranges or "from" prices | Conversion, fewer unqualified leads | Low | Business decision |
| Medium | Testimonials from early-access partners (with permission) | Social proof | Low | Partners |
| Long-term | Accreditation announcement page + scope document once achieved; update all status copy | Removes main objection | — | Accreditation |
| Long-term | Industry link building: fluid power associations, tribology/STLE content, guest technical articles, calculator outreach | Authority | Ongoing | — |

## 10. 3–12 month growth plan

- **Months 1–3:** launch, measurement, Search Console baseline. Publish 2 more guides. Add photography and sample report. Monthly Lighthouse + `npm run qa` before every deploy.
- **Months 3–6:** review Search Console queries and expand pages that earn impressions but not clicks (titles/descriptions). Build compatibility list pages only where there's real content per make. Pitch the ISO 4406 calculator and guides to fluid power and reliability publications for links.
- **Months 6–12:** case studies (anonymized dispute resolutions, as-found drift findings). Accreditation launch content. CRO tests on the form (e.g., 2-step vs. single step) once volume allows significance. Quarterly competitor review of OEM calibration service pages.
