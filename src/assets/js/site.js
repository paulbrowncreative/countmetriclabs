/* CountMetric Labs — progressive enhancement. The site is fully usable without this file. */
(() => {
  'use strict';

  // ---------- Analytics (GA4 / GTM via dataLayer; no-op until a tag is installed) ----------
  window.dataLayer = window.dataLayer || [];
  const track = (event, params = {}) => window.dataLayer.push({ event, ...params });

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-track]');
    if (!el) return;
    track(el.dataset.track, {
      cta_location: el.dataset.cta || undefined,
      link_url: el.getAttribute('href') || undefined,
      link_text: el.textContent.trim().slice(0, 80),
    });
  });

  // ---------- Mobile menu ----------
  const header = document.querySelector('[data-header]');
  const menuBtn = document.querySelector('[data-menu-toggle]');
  const navPanel = document.querySelector('[data-nav-panel]');
  const desktop = window.matchMedia('(min-width: 64.01em)');

  const setMenu = (open) => {
    if (!menuBtn) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    navPanel.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
  };
  menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  desktop.addEventListener('change', () => setMenu(false));

  // ---------- Services sub-menu ----------
  const subBtn = document.querySelector('[data-sub-toggle]');
  const subMenu = subBtn && document.getElementById(subBtn.getAttribute('aria-controls'));
  const setSub = (open) => {
    if (!subBtn) return;
    subBtn.setAttribute('aria-expanded', String(open));
    subMenu.classList.toggle('is-open', open);
  };
  subBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    setSub(subBtn.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('click', (e) => {
    if (desktop.matches && subMenu && !subMenu.contains(e.target)) setSub(false);
  });
  subMenu?.parentElement.addEventListener('focusout', (e) => {
    if (desktop.matches && !subMenu.parentElement.contains(e.relatedTarget)) setSub(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (subBtn?.getAttribute('aria-expanded') === 'true') { setSub(false); subBtn.focus(); }
    else if (menuBtn?.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
  });

  // Header shadow once scrolled
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---------- ISO 4406 calculator ----------
  // Upper limits (particles/mL, inclusive) for scale numbers 0–28 per ISO 4406.
  const ISO4406_UPPER = [0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.3, 2.5, 5, 10, 20, 40, 80, 160, 320, 640,
    1300, 2500, 5000, 10000, 20000, 40000, 80000, 160000, 320000, 640000, 1300000, 2500000];
  const scaleNumber = (n) => {
    if (n === 0) return '0';
    const i = ISO4406_UPPER.findIndex((upper) => n <= upper);
    return i === -1 ? '>28' : String(i);
  };
  const calc = document.querySelector('[data-iso-calc]');
  if (calc) {
    const out = calc.querySelector('[data-calc-output]');
    const note = calc.querySelector('[data-calc-note]');
    const inputs = ['c4', 'c6', 'c14'].map((id) => calc.querySelector(`#${id}`));
    let tracked = false;
    calc.addEventListener('submit', (e) => e.preventDefault());
    calc.addEventListener('input', () => {
      const values = inputs.map((i) => (i.value.trim() === '' ? null : Number(i.value)));
      if (values.some((v) => v !== null && (!Number.isFinite(v) || v < 0))) {
        out.textContent = '–/–/–';
        note.textContent = 'Counts must be zero or positive numbers.';
        return;
      }
      out.textContent = values.map((v) => (v === null ? '–' : scaleNumber(v))).join('/');
      const [a, b, c] = values;
      if (values.every((v) => v !== null) && (b > a || c > b)) {
        note.textContent = 'Check your figures: cumulative counts should fall as particle size increases.';
      } else if (values.every((v) => v !== null)) {
        note.textContent = `${a.toLocaleString()} / ${b.toLocaleString()} / ${c.toLocaleString()} particles per mL at ≥4 / ≥6 / ≥14 µm(c).`;
        if (!tracked) { tracked = true; track('calculator_use', { tool: 'iso4406' }); }
      } else {
        note.textContent = 'Enter all three counts for a full code.';
      }
    });
  }

  // ---------- Inquiry form ----------
  const form = document.querySelector('[data-inquiry-form]');
  if (!form) return;

  const serviceInputs = form.querySelectorAll('input[name="service"]');
  const conditionals = form.querySelectorAll('[data-when-service]');
  const summary = form.querySelector('[data-error-summary]');
  const submitBtn = form.querySelector('[type="submit"]');
  const statusBox = document.querySelector('[data-form-status]');
  let started = false;

  // Show only the questions relevant to the chosen service; disabled fields are not submitted or validated.
  const syncConditionals = () => {
    const selected = form.querySelector('input[name="service"]:checked')?.value;
    conditionals.forEach((block) => {
      const show = block.dataset.whenService.split(' ').includes(selected);
      block.hidden = !show;
      block.querySelectorAll('input, select, textarea').forEach((f) => { f.disabled = !show; });
    });
  };

  // Preselect from ?service= (CTAs link here with context)
  const param = new URLSearchParams(location.search).get('service');
  if (param) {
    const match = form.querySelector(`input[name="service"][value="${CSS.escape(param)}"]`);
    if (match) match.checked = true;
  }
  if (new URLSearchParams(location.search).get('program') === 'early-access') {
    const ea = form.querySelector('input[name="early_access"]');
    if (ea) ea.checked = true;
  }
  serviceInputs.forEach((i) => i.addEventListener('change', syncConditionals));
  syncConditionals();

  form.addEventListener('input', () => {
    if (started) return;
    started = true;
    track('form_start', { form_id: form.id });
  }, { once: false });

  const messages = {
    valueMissing: (label) => `Enter ${label.toLowerCase()}.`,
    typeMismatch: () => 'Enter a valid email address, like name@company.com.',
    rangeUnderflow: () => 'Enter a number of 1 or more.',
  };

  const labelFor = (field) => {
    if (field.dataset.label) return field.dataset.label;
    const lbl = form.querySelector(`label[for="${field.id}"]`);
    return (lbl?.childNodes[0]?.textContent || field.name).trim();
  };

  const errorEl = (field) => {
    const key = field.type === 'radio' ? field.name : field.id;
    return form.querySelector(`[data-error-for="${key}"]`);
  };

  const validateField = (field) => {
    const err = errorEl(field);
    if (!err) return true;
    let msg = '';
    if (field.type === 'radio') {
      const group = form.querySelectorAll(`input[name="${field.name}"]`);
      if (field.required && ![...group].some((r) => r.checked)) msg = field.dataset.message || 'Choose an option.';
    } else if (!field.validity.valid) {
      const v = field.validity;
      if (v.valueMissing) msg = field.dataset.message || messages.valueMissing(labelFor(field));
      else if (v.typeMismatch) msg = messages.typeMismatch();
      else if (v.rangeUnderflow) msg = messages.rangeUnderflow();
      else msg = field.validationMessage;
    }
    err.querySelector('span').textContent = msg;
    err.hidden = !msg;
    const targets = field.type === 'radio' ? form.querySelectorAll(`input[name="${field.name}"]`) : [field];
    targets.forEach((t) => (msg ? t.setAttribute('aria-invalid', 'true') : t.removeAttribute('aria-invalid')));
    return !msg;
  };

  // Validate on blur once the user has interacted; re-validate live after an error is shown.
  form.addEventListener('focusout', (e) => {
    const f = e.target;
    if (f.matches('input:not([type="radio"]):not([type="checkbox"]), select, textarea') && f.value) validateField(f);
  });
  form.addEventListener('input', (e) => {
    if (e.target.getAttribute('aria-invalid') === 'true') validateField(e.target);
  });
  form.addEventListener('change', (e) => {
    if (e.target.type === 'radio') validateField(e.target);
  });

  const setBusy = (busy) => {
    submitBtn.setAttribute('aria-busy', String(busy));
    submitBtn.disabled = busy;
    submitBtn.querySelector('[data-label]').textContent = busy ? 'Sending…' : submitBtn.dataset.idleLabel;
  };
  submitBtn.dataset.idleLabel = submitBtn.querySelector('[data-label]').textContent;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fields = [...form.querySelectorAll('input, select, textarea')].filter((f) => !f.disabled && f.name && errorEl(f));
    const seen = new Set();
    const invalid = [];
    fields.forEach((f) => {
      if (f.type === 'radio') { if (seen.has(f.name)) return; seen.add(f.name); }
      if (!validateField(f)) invalid.push(f);
    });

    if (invalid.length) {
      summary.querySelector('ul').innerHTML = invalid
        .map((f) => `<li><a href="#${f.id}">${errorEl(f).querySelector('span').textContent}</a></li>`)
        .join('');
      summary.hidden = false;
      summary.focus();
      track('form_error', { form_id: form.id, error_count: invalid.length });
      return;
    }
    summary.hidden = true;

    // Honeypot: silently accept bots
    if (form.querySelector('[name="company_website"]')?.value) return showSuccess();

    const endpoint = form.getAttribute('action');
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      track('generate_lead', {
        form_id: form.id,
        service: form.querySelector('input[name="service"]:checked')?.value,
      });
      showSuccess();
    } catch (err) {
      showError();
    } finally {
      setBusy(false);
    }
  });

  function showSuccess() {
    form.hidden = true;
    statusBox.innerHTML = `
      <div class="form-status form-status-success" role="status">
        <h2 tabindex="-1">Thanks — your inquiry is in.</h2>
        <p>A technician will review the details and reply by email. If we need anything else to scope the work, we'll ask in that reply.</p>
        <p class="mb-0">While you wait: <a href="/resources/iso-11171-calibration-explained/">how ISO 11171 calibration works</a>.</p>
      </div>`;
    statusBox.hidden = false;
    statusBox.querySelector('h2').focus();
  }

  function showError() {
    statusBox.innerHTML = `
      <div class="form-status form-status-error" role="alert">
        <h2>We couldn't send your inquiry.</h2>
        <p class="mb-0">Your details are still in the form below. Check your connection and try again${
          form.dataset.fallbackEmail ? `, or email us directly at <a href="mailto:${form.dataset.fallbackEmail}">${form.dataset.fallbackEmail}</a>` : ''
        }.</p>
      </div>`;
    statusBox.hidden = false;
    statusBox.scrollIntoView({ block: 'center' });
  }
})();
