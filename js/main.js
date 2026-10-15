import { PILLARS, PREMIUM, CHALLENGES, SOLUTIONS, ECOSYSTEM, VALUES, CONTACT, FREE_ZONES, PARTNER_WHY } from './data.js';

// Lead form → n8n workflow 01 (Lead Intake & AI Qualification).
// Example: 'https://n8n.enabler-s.com/webhook/enabler-lead'
const LEAD_WEBHOOK_URL = '';

const $ = (s, el = document) => el.querySelector(s);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

renderSections();
setupHeader();
setupForm();
setupReveal();
startJourney();

// ---------------------------------------------------------------------------
function renderSections() {
  $('#challenges').innerHTML = CHALLENGES.map((c) => `<li><h4>${esc(c.title)}</h4><p>${esc(c.text)}</p></li>`).join('');
  $('#solutions').innerHTML = SOLUTIONS.map((c) => `<li><h4>${esc(c.title)}</h4><p>${esc(c.text)}</p></li>`).join('');
  $('#pillars').innerHTML = PILLARS.map((p, i) => `
    <article class="pillar reveal" id="pillar-${p.id}">
      <p class="num"><span>${String(i + 1).padStart(2, '0')}</span><b>${esc(p.brand)}</b></p>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.line)}</p>
      <details><summary>All ${p.services.length} services</summary><ul>${p.services.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></details>
    </article>`).join('');
  $('#premium').innerHTML = PREMIUM.map((s) => `<li>${esc(s)}</li>`).join('');
  const pin = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>';
  $('#fz-list').innerHTML = FREE_ZONES.map((e) => `
    <li class="fz-card reveal">
      <p class="fz-tag">${pin}${esc(e.emirate)}</p>
      <ul class="fz-zones n${e.zones.length}">${e.zones.map((z) => `
        <li><img class="fz-logo" src="${esc(z.logo)}" alt="${esc(z.name)} logo" loading="lazy"><span class="fz-name">${esc(z.name)}</span>${z.label ? `<span class="fz-label">${esc(z.label)}</span>` : ''}</li>`).join('')}
      </ul>
    </li>`).join('');
  $('#fz-why').innerHTML = PARTNER_WHY.map((w) => `<li>${esc(w)}</li>`).join('');
  $('#value-list').innerHTML = VALUES.map((v) => `<li><h4>${esc(v.title)}</h4><p>${esc(v.text)}</p></li>`).join('');
  $('#eco-list').innerHTML = ECOSYSTEM.map((e) => `<li class="reveal"><b>${esc(e.name)}</b><span>${esc(e.tag)}</span></li>`).join('');
  $('#c-address').textContent = CONTACT.address;
  const em = $('#c-email'); em.textContent = CONTACT.email; em.href = `mailto:${CONTACT.email}`;
  const ph = $('#c-phone'); ph.textContent = CONTACT.phone; ph.href = `tel:${CONTACT.phone.replace(/\s/g, '')}`;
  $('#year').textContent = new Date().getFullYear();

  // journey overlay cards (also the no-WebGL fallback list)
  $('#stops').innerHTML = PILLARS.map((p, i) => `
    <article class="stop-card ${i % 2 === 0 ? 'left' : 'right'}" data-stop="${i}" aria-live="polite">
      <p class="stop-num"><span>${String(i + 1).padStart(2, '0')} / 08</span><span>${esc(p.brand)}</span></p>
      <h2>${esc(p.title)}</h2>
      <p class="line">${esc(p.line)}</p>
      <ul>${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
      <a href="#pillar-${p.id}">See all ${p.services.length} services →</a>
    </article>`).join('');
  $('#rail-dots').innerHTML = PILLARS.map((p, i) => `<li style="--c:${esc(p.color)}"><button type="button" data-stop="${i}" aria-label="Go to ${esc(p.brand)}: ${esc(p.title)}"><span>${esc(p.brand)}</span><i>${String(i + 1).padStart(2, '0')}</i></button></li>`).join('');
}

function setupHeader() {
  const header = $('.site-header');
  const journey = $('#journey');
  const onScroll = () => header.classList.toggle('solid', scrollY > journey.offsetTop + journey.offsetHeight - innerHeight - 10);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const toggle = $('.menu-toggle'), menu = $('#menu');
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) { menu.classList.remove('open'); toggle.setAttribute('aria-expanded', false); } });
}

function setupReveal() {
  const els = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((e) => io.observe(e));
}

function setupForm() {
  const form = $('#lead-form'), status = $('#form-status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let ok = true;
    for (const el of form.querySelectorAll('[required]')) {
      const bad = !el.value.trim() || (el.type === 'email' && !/^\S+@\S+\.\S+$/.test(el.value));
      el.setAttribute('aria-invalid', bad); if (bad) ok = false;
    }
    if (!ok) { status.className = 'form-status err'; status.textContent = 'Please add your name, a valid email and a short message.'; return; }
    const data = Object.fromEntries(new FormData(form));
    data.channel = 'website';
    if (!LEAD_WEBHOOK_URL) {
      status.className = 'form-status err';
      status.textContent = `The form isn't connected yet. Please email ${CONTACT.email}.`;
      return;
    }
    const btn = form.querySelector('button'); btn.disabled = true; status.className = 'form-status'; status.textContent = 'Sending…';
    try {
      const res = await fetch(LEAD_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      status.className = 'form-status ok';
      status.textContent = 'Thank you. A consultant will reply within one business day.';
    } catch {
      status.className = 'form-status err';
      status.textContent = `Your enquiry didn't send. Please try again or email ${CONTACT.email}.`;
    } finally { btn.disabled = false; }
  });
}

// ---------------------------------------------------------------------------
async function startJourney() {
  const canvas = $('#scene');
  let journey;
  try {
    if (new URLSearchParams(location.search).has('static')) throw new Error('static mode requested');
    if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) throw new Error('no webgl');
    const { createJourney } = await import('./journey.js');
    journey = createJourney(canvas, PILLARS, CONTACT);
  } catch (err) {
    console.warn('3D journey unavailable:', err);
    document.documentElement.classList.add('no-webgl');
    return;
  }

  const section = $('#journey');
  const cards = [...document.querySelectorAll('.stop-card')];
  const dots = [...document.querySelectorAll('#rail-dots button')];
  const intro = $('#intro'), outro = $('#outro'), sticky = $('.journey-sticky');
  const L = journey.pathLength;
  const stopAt = journey.stops.map((s) => s.distance);

  // progress rail: dots sit at each building's true place along the walk, and the line fills in brand colours
  const rail = $('#rail'), railNow = $('#rail-now'), railCount = $('#rail-count'), railEnd = $('#rail-end');
  const pct = (d) => Math.max(0, Math.min(100, (d / L) * 100));
  dots.forEach((b, i) => { b.parentElement.style.left = `${pct(stopAt[i])}%`; });
  rail.style.setProperty('--rail-grad', `linear-gradient(90deg, var(--gold) 0%, ${PILLARS.map((p, i) => `${p.color} ${pct(stopAt[i]).toFixed(1)}%`).join(', ')}, var(--gold) 100%)`);
  let railKey = '';

  // Scroll → distance, with extra scroll "weight" near each building: the walker slows as he turns in,
  // holds while he reads the brand hoarding, then holds again square on to the billboard
  const H = journey.hoardingAt;
  const N = 4000, cum = new Float32Array(N + 1);
  const density = (d) => 1 + 2.2 * Math.exp(-((d / 6) ** 2))
    + stopAt.reduce((a, s) => a + 2.5 * Math.exp(-(((d - s) / 7) ** 2)) + 12 * Math.exp(-(((d - s + H) / 0.6) ** 2)) + 22 * Math.exp(-(((d - s) / 0.9) ** 2)), 0);
  for (let i = 1; i <= N; i++) cum[i] = cum[i - 1] + density((i / N) * L);
  for (let i = 0; i <= N; i++) cum[i] /= cum[N];
  const toDistance = (p) => {
    let lo = 0, hi = N;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < p) lo = mid + 1; else hi = mid; }
    return (lo / N) * L;
  };
  const toProgress = (d) => cum[Math.round(Math.max(0, Math.min(1, d / L)) * N)];
  const range = () => section.offsetHeight - innerHeight;
  const progress = () => Math.max(0, Math.min(1, (scrollY - section.offsetTop) / range()));
  const scrollToDistance = (d, smooth) => scrollTo({ top: section.offsetTop + toProgress(d) * range(), behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });

  // Deep links: ?p=0.4 scrolls 40% along the journey. ?d=120 freezes the walker at 120 m
  // without scrolling (used for screenshots and design review).
  const qs = new URLSearchParams(location.search), qp = qs.get('p'), qd = qs.get('d');
  if (qd !== null) {
    journey.jump(+qd);
  } else {
    addEventListener('scroll', () => journey.setTarget(toDistance(progress())), { passive: true });
    journey.jump(toDistance(progress()));
    if (qp !== null) { const d = toDistance(+qp); scrollToDistance(d); journey.jump(d); }
  }

  // overlays follow the walker's actual position, not the scroll position
  let active = -2;
  journey.onFrame = (d) => {
    intro.style.opacity = String(1 - smooth(4, 14, d));
    intro.style.transform = `translateY(${-30 * smooth(4, 14, d)}px)`;
    intro.style.pointerEvents = d > 10 ? 'none' : '';
    sticky.style.setProperty('--intro-shade', String(1 - smooth(4, 14, d)));
    let cur = -1;
    stopAt.forEach((s, i) => { if (Math.abs(d - s) < 10) cur = i; });
    if (cur !== active) {
      cards.forEach((c, i) => c.classList.toggle('active', i === cur));
      active = cur;
    }
    dots.forEach((b, i) => { b.classList.toggle('passed', d >= stopAt[i] - 6); b.classList.toggle('current', i === cur); });
    rail.style.setProperty('--p', `${pct(d)}%`);
    const last = stopAt.reduce((n, sd, i) => (d >= sd - 6 ? i : n), -1);
    const next = Math.min(PILLARS.length - 1, last + 1);
    const done = d > L - 12;
    const key = `${cur}|${last}|${done}`;
    if (key !== railKey) {
      railKey = key;
      rail.style.setProperty('--wc', last >= 0 ? PILLARS[last].color : 'var(--gold)');
      railEnd.classList.toggle('reached', done);
      railCount.textContent = `${String(Math.max(0, cur >= 0 ? cur + 1 : last + 1)).padStart(2, '0')} / ${String(PILLARS.length).padStart(2, '0')}`;
      railNow.innerHTML = done ? 'Journey complete <b>· Where strategy meets execution</b>'
        : cur >= 0 ? `<b style="color:${PILLARS[cur].color}">${esc(PILLARS[cur].brand)}</b> · ${esc(PILLARS[cur].title)}`
        : d < 6 ? 'Scroll to start the walk'
        : `Next stop <b style="color:${PILLARS[next].color}">${esc(PILLARS[next].brand)}</b>`;
    }
    outro.classList.toggle('active', d > L - 12);
    const here = journey.current;
    cta.hidden = here < 0;
    if (here >= 0 && cta.dataset.stop !== String(here)) { cta.dataset.stop = here; cta.textContent = `View ${PILLARS[here].brand} details`; }
  };
  dots.forEach((b, i) => b.addEventListener('click', () => { stopAuto(); scrollToDistance(stopAt[i], true); }));

  // Billboard / phone taps and the "View details" button open the pillar dialog
  const dialog = $('#pillar-dialog'), cta = $('#stop-cta');
  let shown = 0;
  function openPillar(i) {
    stopAuto();
    if (i < 0) return restart();
    shown = i;
    const p = PILLARS[i];
    $('#pd-num').innerHTML = `<span>${String(i + 1).padStart(2, '0')} / 08</span><span>${esc(p.brand)}</span>`;
    $('#pd-title').textContent = p.title;
    $('#pd-line').textContent = p.line;
    $('#pd-services').innerHTML = p.services.map((s) => `<li>${esc(s)}</li>`).join('');
    $('#pd-next').textContent = i < PILLARS.length - 1 ? `Next: ${PILLARS[i + 1].brand} →` : 'Book a consultation →';
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }
  journey.onSelect = openPillar;
  cta.addEventListener('click', () => openPillar(journey.current));
  $('#pd-book').addEventListener('click', () => {
    const msg = $('#f-message');
    if (!msg.value.trim()) msg.value = `I'd like to discuss ${PILLARS[shown].title}.`;
    dialog.close();
  });
  $('#pd-next').addEventListener('click', () => {
    dialog.close();
    if (shown < PILLARS.length - 1) scrollToDistance(stopAt[shown + 1], true);
    else $('#contact').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  // Restart: fade to black, put the walker back at the start, fade in
  const fade = $('#fade');
  function restart() {
    stopAuto();
    if (dialog.open) dialog.close();
    fade.classList.add('on');
    setTimeout(() => {
      scrollTo({ top: section.offsetTop, behavior: 'auto' });
      journey.reset();
      requestAnimationFrame(() => { fade.classList.remove('on'); $('#walk-btn').focus({ preventScroll: true }); });
    }, reduceMotion ? 0 : 600);
  }
  $('#restart-btn').addEventListener('click', restart);

  dialog.addEventListener('click', (e) => {   // click on the backdrop closes
    const r = dialog.getBoundingClientRect();
    if (e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) dialog.close();
  });

  // Pause rendering when the journey is off screen
  new IntersectionObserver(([en]) => (en.isIntersecting ? journey.resume() : journey.pause())).observe(section);

  // "Take the walk": guided auto-scroll at walking pace, pausing at each building
  const btn = $('#walk-btn');
  let auto = null;
  function stopAuto() { if (auto) { cancelAnimationFrame(auto.raf); auto = null; btn.textContent = 'Take the walk'; } }
  btn.addEventListener('click', () => {
    if (auto) return stopAuto();
    btn.textContent = 'Stop the walk';
    // pause points: the brand hoarding (short), then the billboard (long enough to read)
    const holds = stopAt.flatMap((s) => [{ d: s - H, t: 3.5 }, { d: s, t: 9 }]);
    auto = { d: journey.distance, pause: 0, next: 0, last: performance.now(), raf: 0, holds };
    auto.next = holds.findIndex((h) => h.d > auto.d + 0.5);
    const tick = (now) => {
      if (!auto) return;
      const dt = Math.min(0.05, (now - auto.last) / 1000); auto.last = now;
      if (auto.pause > 0) auto.pause -= dt;
      else {
        auto.d += 2.6 * dt;
        const h = auto.holds[auto.next];
        if (h && auto.d >= h.d) { auto.d = h.d; auto.pause = h.t; auto.next = auto.next + 1 < auto.holds.length ? auto.next + 1 : -1; }
      }
      if (auto.d >= L) { scrollToDistance(L); return stopAuto(); }
      scrollToDistance(auto.d);
      auto.raf = requestAnimationFrame(tick);
    };
    auto.raf = requestAnimationFrame(tick);
  });
  for (const ev of ['wheel', 'touchstart', 'keydown']) addEventListener(ev, (e) => { if (auto && !(ev === 'keydown' && e.target === btn)) stopAuto(); }, { passive: true });
  if (reduceMotion) btn.hidden = true;
}

function smooth(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
