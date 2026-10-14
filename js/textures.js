// Procedural textures drawn on canvas, so the page ships no image files.
import * as THREE from 'three';

const rand = mulberry32(20261013);
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const random = rand;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { repeat = [1, 1], srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function speckle(ctx, w, h, count, colors, maxR = 1.6) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(rand() * colors.length) | 0];
    const r = rand() * maxR + 0.3;
    ctx.fillRect(rand() * w, rand() * h, r, r);
  }
}

// Asphalt with lane markings. One tile = 10 m wide x 40 m long.
export function roadTexture() {
  const [c, x] = canvas(512, 2048);
  x.fillStyle = '#2b2c2e'; x.fillRect(0, 0, 512, 2048);
  speckle(x, 512, 2048, 60000, ['#232426', '#343537', '#3b3c3e', '#1d1e20', '#45464a'], 2.2);
  // tyre wear bands
  const g = x.createLinearGradient(0, 0, 512, 0);
  g.addColorStop(0.18, 'rgba(0,0,0,0)'); g.addColorStop(0.27, 'rgba(0,0,0,0.13)'); g.addColorStop(0.36, 'rgba(0,0,0,0)');
  g.addColorStop(0.64, 'rgba(0,0,0,0)'); g.addColorStop(0.73, 'rgba(0,0,0,0.13)'); g.addColorStop(0.82, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 512, 2048);
  // patched cracks
  x.strokeStyle = 'rgba(15,15,16,0.55)'; x.lineWidth = 1.4;
  for (let i = 0; i < 26; i++) {
    let px = rand() * 512, py = rand() * 2048;
    x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 7; k++) { px += (rand() - 0.5) * 40; py += rand() * 30; x.lineTo(px, py); }
    x.stroke();
  }
  // edge lines and centre dashes (worn paint)
  const paint = (px, py, w, h, col) => {
    x.fillStyle = col; x.fillRect(px, py, w, h);
    // worn paint: asphalt grains showing through
    x.fillStyle = 'rgba(43,44,46,0.45)';
    for (let i = 0; i < w * h / 25; i++) x.fillRect(px + rand() * w, py + rand() * h, 2, 2);
  };
  paint(22, 0, 9, 2048, '#e9e4d6');
  paint(481, 0, 9, 2048, '#e9e4d6');
  for (let y = 0; y < 2048; y += 256) paint(250, y + 40, 12, 150, '#e8c46a');
  return toTexture(c);
}

export function paverTexture() {
  const [c, x] = canvas(512, 512);
  x.fillStyle = '#b9ad9a'; x.fillRect(0, 0, 512, 512);
  const tile = 64;
  for (let yy = 0; yy < 512; yy += tile / 2) {
    const off = (yy / (tile / 2)) % 2 ? tile / 2 : 0;
    for (let xx = -tile; xx < 512; xx += tile) {
      const v = 165 + rand() * 30;
      x.fillStyle = `rgb(${v + 18},${v + 8},${v - 8})`;
      x.fillRect(xx + off + 1.5, yy + 1.5, tile - 3, tile / 2 - 3);
    }
  }
  speckle(x, 512, 512, 9000, ['rgba(0,0,0,0.08)', 'rgba(255,255,255,0.08)']);
  return toTexture(c, { repeat: [1, 1] });
}

export function sandTexture() {
  const [c, x] = canvas(1024, 1024);
  x.fillStyle = '#c9a77a'; x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 300; i++) {
    const g = x.createRadialGradient(rand() * 1024, rand() * 1024, 0, rand() * 1024, rand() * 1024, 80 + rand() * 160);
    g.addColorStop(0, `rgba(${rand() > 0.5 ? '220,190,145' : '170,135,95'},0.10)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 1024, 1024);
  }
  speckle(x, 1024, 1024, 80000, ['#b8956a', '#d6b88c', '#a9875f', '#e0c49a'], 1.4);
  return toTexture(c, { repeat: [60, 60] });
}

// Curtain-wall facade. Returns colour map + emissive map (lit offices at dusk).
export function facadeTextures({ cols = 8, rows = 16, mullion = '#2a3038', glassTop = '#9fb6c9',
  glassBottom = '#3d5266', lit = 0.32, warm = '#ffd49a', spandrel = true } = {}) {
  const W = 512, H = 1024;
  const [c, x] = canvas(W, H);
  const [e, ex] = canvas(W, H);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  x.fillStyle = mullion; x.fillRect(0, 0, W, H);
  const cw = W / cols, rh = H / rows;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const px = k * cw + 3, py = r * rh + 3, w = cw - 6, h = rh * (spandrel ? 0.72 : 1) - 6;
      const g = x.createLinearGradient(0, py, 0, py + h);
      const shade = 0.85 + rand() * 0.3;
      g.addColorStop(0, glassTop); g.addColorStop(1, glassBottom);
      x.globalAlpha = shade; x.fillStyle = g; x.fillRect(px, py, w, h); x.globalAlpha = 1;
      if (rand() < lit) {
        const v = 0.45 + rand() * 0.55;
        ex.globalAlpha = v; ex.fillStyle = warm; ex.fillRect(px + 2, py + 2, w - 4, h - 4);
        // blinds / interior variation
        ex.fillStyle = 'rgba(0,0,0,0.35)';
        for (let b = 0; b < 4; b++) ex.fillRect(px + 2, py + 2 + b * (h / 4), w - 4, 1.5);
        ex.globalAlpha = 1;
      }
      if (spandrel) {
        x.fillStyle = 'rgba(20,24,30,0.85)';
        x.fillRect(px - 3, py + h + 3, w + 6, rh * 0.28);
      }
    }
  }
  const map = toTexture(c);
  const emissive = toTexture(e);
  return { map, emissive };
}

export function concreteTexture(base = '#cfc8bc') {
  const [c, x] = canvas(512, 512);
  x.fillStyle = base; x.fillRect(0, 0, 512, 512);
  speckle(x, 512, 512, 30000, ['rgba(0,0,0,0.07)', 'rgba(255,255,255,0.09)', 'rgba(90,80,70,0.08)'], 2);
  // formwork panel joints
  x.strokeStyle = 'rgba(60,55,50,0.18)'; x.lineWidth = 2;
  for (let i = 0; i <= 512; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke(); }
  for (let i = 0; i <= 512; i += 64) { x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); }
  return toTexture(c);
}

export function stoneTexture() {
  const [c, x] = canvas(512, 512);
  x.fillStyle = '#c9bca5'; x.fillRect(0, 0, 512, 512);
  for (let yy = 0; yy < 512; yy += 42) {
    const off = (yy / 42) % 2 ? 60 : 0;
    for (let xx = -120; xx < 512; xx += 120) {
      const v = 208 + rand() * 10;
      x.fillStyle = `rgb(${v + 14},${v + 4},${v - 14})`;
      x.fillRect(xx + off + 1, yy + 1, 118, 40);
    }
  }
  speckle(x, 512, 512, 20000, ['rgba(0,0,0,0.06)', 'rgba(255,255,255,0.1)'], 1.5);
  return toTexture(c);
}

export function corrugatedTexture(color = '#8d96a0') {
  const [c, x] = canvas(256, 256);
  for (let i = 0; i < 256; i += 8) {
    const g = x.createLinearGradient(i, 0, i + 8, 0);
    g.addColorStop(0, shade(color, -25)); g.addColorStop(0.5, shade(color, 18)); g.addColorStop(1, shade(color, -25));
    x.fillStyle = g; x.fillRect(i, 0, 8, 256);
  }
  speckle(x, 256, 256, 3000, ['rgba(120,80,40,0.08)', 'rgba(0,0,0,0.06)']);
  return toTexture(c);
}

export function barkTexture() {
  const [c, x] = canvas(128, 512);
  x.fillStyle = '#7a6448'; x.fillRect(0, 0, 128, 512);
  for (let y = 0; y < 512; y += 14) {
    x.fillStyle = `rgba(${50 + rand() * 30},${38 + rand() * 20},${24},0.75)`;
    x.beginPath(); x.ellipse(64, y, 70, 5 + rand() * 3, 0, 0, Math.PI * 2); x.fill();
  }
  speckle(x, 128, 512, 4000, ['rgba(0,0,0,0.15)', 'rgba(200,170,120,0.12)']);
  return toTexture(c);
}

// Palm frond: leaflets drawn along a rib, transparent background.
export function frondTexture() {
  const [c, x] = canvas(256, 1024);
  x.clearRect(0, 0, 256, 1024);
  x.strokeStyle = '#5b6b2c'; x.lineWidth = 6;
  x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 1024); x.stroke();
  for (let y = 30; y < 1010; y += 9) {
    const t = y / 1024;
    const len = 118 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 8;
    const tone = 70 + rand() * 40;
    x.strokeStyle = `rgb(${tone - 30},${tone + 45},${tone - 45})`;
    x.lineWidth = 3.2;
    for (const s of [-1, 1]) {
      x.beginPath(); x.moveTo(128, y);
      x.quadraticCurveTo(128 + s * len * 0.5, y + 10, 128 + s * len, y + 26 + rand() * 10);
      x.stroke();
    }
  }
  return toTexture(c);
}

// Roadside billboard for one pillar: a fixed header plus a body that scrolls on a loop.
// Canvases are drawn at 2x for crisp text; call update(time) each frame to scroll.
export const BILLBOARD_BG = '#0d131b';
export function billboardTextures(index, pillar, contact, { width = 2048, headerH = 284, visibleH = 948, accent = '#c9a24a', bg = BILLBOARD_BG } = {}) {
  const gold = accent, ink = '#f2efe8', muted = 'rgba(242,239,232,0.62)';
  const PAD = 110;
  const [hc, hx] = canvas(width, headerH);
  const header = toTexture(hc, { aniso: 8 });
  header.wrapS = header.wrapT = THREE.ClampToEdgeWrapping;

  // Lay the body out once to know its height, then draw it.
  const fonts = {
    line: 'italic 400 92px "Instrument Serif", serif',
    label: '600 36px "JetBrains Mono", monospace',
    item: '500 58px "Plus Jakarta Sans", sans-serif',
    foot: '600 40px "Plus Jakarta Sans", sans-serif',
  };
  const [bc, bx] = canvas(width, 64);
  const layout = () => {
    const ops = [];
    let y = 120;
    bx.font = fonts.line;
    for (const l of lines(bx, pillar.line, width - PAD * 2)) { ops.push(['line', l, PAD, y + 80]); y += 100; }
    y += 50;
    ops.push(['label', `${pillar.services.length} SERVICES`, PAD, y + 36]); y += 90;
    bx.font = fonts.item;
    for (const sv of pillar.services) {
      ops.push(['dash', '', PAD, y + 30]);
      for (const l of lines(bx, sv, width - PAD * 2 - 70)) { ops.push(['item', l, PAD + 70, y + 50]); y += 74; }
      y += 34;
    }
    y += 40;
    ops.push(['rule', '', PAD, y]); y += 70;
    ops.push(['foot', `Enabler-S FZE LLC  ·  ${contact.email}  ·  ${contact.phone}`, PAD, y + 40]); y += 140;
    return { ops, h: Math.max(Math.ceil(y), Math.ceil(visibleH * 1.3)) };
  };

  let body, bodyH = 0;
  const draw = () => {
    // header: number, brand, title
    hx.fillStyle = bg; hx.fillRect(0, 0, width, headerH);
    hx.fillStyle = gold; hx.fillRect(0, 0, 22, headerH);
    hx.font = fonts.label; hx.fillStyle = gold;
    hx.fillText(`${String(index).padStart(2, '0')} / 08  ·  ${pillar.brand.toUpperCase()}`, PAD, 92);
    hx.fillStyle = ink;
    let size = 96;
    do { hx.font = `600 ${size}px "Plus Jakarta Sans", sans-serif`; size -= 4; } while (hx.measureText(pillar.title).width > width - PAD * 2 && size > 40);
    hx.fillText(pillar.title, PAD, 214);
    header.needsUpdate = true;

    // body (resized only if the layout changed, e.g. after web fonts load)
    const { ops, h } = layout();
    if (h !== bodyH) { bodyH = bc.height = h; }
    bx.fillStyle = bg; bx.fillRect(0, 0, width, bodyH);
    for (const [kind, text, x, y] of ops) {
      if (kind === 'dash') { bx.fillStyle = gold; bx.fillRect(x, y, 36, 5); continue; }
      if (kind === 'rule') { bx.globalAlpha = 0.5; bx.fillStyle = gold; bx.fillRect(x, y, width - PAD * 2, 3); bx.globalAlpha = 1; continue; }
      bx.font = fonts[kind];
      bx.fillStyle = kind === 'label' ? gold : kind === 'line' ? ink : kind === 'foot' ? muted : ink;
      bx.fillText(text, x, y);
    }
    if (body) { body.dispose(); }
    body = toTexture(bc, { aniso: 8 });
    body.wrapS = THREE.ClampToEdgeWrapping;
    body.wrapT = THREE.RepeatWrapping;
    body.repeat.set(1, visibleH / bodyH);
    api.body = body;
    api.onRedraw?.(body);
  };

  const SPEED = 62;   // canvas px per second, about one line every 1.2 s
  let scroll = 0, rate = 1, lastT = null;
  const api = {
    header, body: null, onRedraw: null,
    paused: false,      // set while the visitor hovers the billboard; scrolling eases to a stop
    update(t) {
      const dt = lastT === null ? 0 : Math.min(0.1, t - lastT);
      lastT = t;
      rate += ((api.paused ? 0 : 1) - rate) * Math.min(1, dt * 6);
      scroll += dt * SPEED * rate;
      const frac = (scroll / bodyH) % 1;
      body.offset.y = 1 - body.repeat.y - frac;   // window slides down the canvas: text moves up
    },
  };
  draw();
  // canvas text only uses web fonts once they've loaded, so redraw when they arrive
  if (document.fonts) Promise.all(Object.values(fonts).map((f) => document.fonts.load(f))).then(draw, () => {});
  return api;
}

// Monument sign at a building entrance
export function signTexture(number, title, sub, accent = '#c9a24a') {
  const [c, x] = canvas(1024, 400);
  const t = toTexture(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  const draw = () => {
    x.fillStyle = '#10161f'; x.fillRect(0, 0, 1024, 400);
    x.fillStyle = accent; x.fillRect(0, 0, 14, 400);
    x.font = '600 52px "JetBrains Mono", monospace'; x.fillText(number, 60, 104);
    x.fillStyle = '#f2efe8';
    let size = 66;
    do { x.font = `600 ${size}px "Plus Jakarta Sans", sans-serif`; size -= 2; } while (lines(x, title, 920).length > 2 && size > 36);
    lines(x, title, 920).slice(0, 2).forEach((l, i) => x.fillText(l, 60, 196 + i * (size + 10)));
    x.fillStyle = 'rgba(242,239,232,0.6)'; x.font = '500 36px "Plus Jakarta Sans", sans-serif';
    x.fillText(sub, 60, 362);
    t.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);
  return t;
}

// The walker's phone. draw({ kicker, title, sub, cta }) repaints it.
export function phoneScreen() {
  const logo = new Image();
  logo.src = 'assets/logo-mark.png';
  const [c, x] = canvas(360, 720);
  const t = toTexture(c, { aniso: 4 });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  let key = '';
  const draw = ({ kicker = '', title = '', sub = '', cta = '' }) => {
    const k = kicker + title + sub + cta;
    if (k === key) return;
    key = k;
    const g = x.createLinearGradient(0, 0, 0, 720);
    g.addColorStop(0, '#16202d'); g.addColorStop(1, '#0a0f16');
    x.fillStyle = g; x.fillRect(0, 0, 360, 720);
    if (logo.complete && logo.naturalWidth) x.drawImage(logo, 32, 52, 46, 46 * logo.naturalHeight / logo.naturalWidth);
    x.fillStyle = '#c9a24a'; x.font = '700 30px "Plus Jakarta Sans", sans-serif';
    x.fillText('Enabler-S', 90, 92);
    x.fillStyle = 'rgba(242,239,232,0.35)'; x.fillRect(32, 116, 296, 2);
    x.fillStyle = '#c9a24a'; x.font = '600 20px "JetBrains Mono", monospace';
    x.fillText(kicker, 32, 186);
    x.fillStyle = '#f2efe8'; x.font = '600 36px "Plus Jakarta Sans", sans-serif';
    let y = 240;
    for (const l of lines(x, title, 296).slice(0, 4)) { x.fillText(l, 32, y); y += 44; }
    x.fillStyle = 'rgba(242,239,232,0.65)'; x.font = '500 24px "Plus Jakarta Sans", sans-serif';
    y += 10;
    for (const l of lines(x, sub, 296).slice(0, 4)) { x.fillText(l, 32, y); y += 32; }
    if (cta) {
      x.fillStyle = '#c9a24a';
      x.beginPath(); x.roundRect(32, 590, 296, 70, 35); x.fill();
      x.fillStyle = '#10161f'; x.font = '700 24px "Plus Jakarta Sans", sans-serif'; x.textAlign = 'center';
      x.fillText(cta, 180, 634); x.textAlign = 'left';
    }
    t.needsUpdate = true;
  };
  const redraw = () => { const k = key; key = ''; if (k) draw(last); };
  document.fonts?.ready.then(redraw);
  logo.onload = redraw;
  let last = {};
  return { texture: t, draw: (o) => { last = o; draw(o); } };
}

function lines(ctx, text, maxW) {
  const out = [];
  let line = '';
  for (const w of text.split(' ')) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; }
    else line = test;
  }
  if (line) out.push(line);
  return out;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

// LED pixel grid laid over screens so they read as LED panels, not flat images
let ledGrid = null;
function ledPattern(ctx) {
  if (!ledGrid) {
    const [c, x] = canvas(4, 4);
    x.fillStyle = 'rgba(0,0,0,0.38)'; x.fillRect(3, 0, 1, 4); x.fillRect(0, 3, 4, 1);
    ledGrid = c;
  }
  return ctx.createPattern(ledGrid, 'repeat');
}

// Animated LED screen (billboard / media facade). Call update(time) each frame.
// mode 'brand': slides of { big, small } over a moving gradient in the brand colour (or a hue per slide).
// mode 'data': streaks of light for the Tech & AI building's LED bands.
const BRANDORA_SLIDES = [{ big: 'BRANDORA-S', small: 'Brand · PR · Events' }, { big: 'YOUR STORY', small: 'told across every market' }, { big: 'LAUNCH', small: 'campaigns that move markets' }];
export function ledScreen(width, height, { mode = 'brand', slides = BRANDORA_SLIDES, color = null, hues = [205, 38, 265] } = {}) {
  const [c, x] = canvas(width, height);
  const tex = toTexture(c, { repeat: [1, 1] });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const grid = ledPattern(x);
  const SLIDE = 4.5;
  let base = null;
  if (color) { const hsl = {}; new THREE.Color(color).getHSL(hsl); base = hsl.h * 360; }
  const fit = (text, weight, max, w) => {
    let size = max;
    do { x.font = `${weight} ${size}px "Plus Jakarta Sans", sans-serif`; size -= 2; } while (x.measureText(text).width > w && size > 12);
    return size + 2;
  };
  let last = -1;
  const update = (t) => {
    const frame = Math.floor(t * 12);
    if (frame === last) return;
    last = frame;
    if (mode === 'brand') {
      const n = Math.floor(t / SLIDE), slide = n % slides.length, into = t - n * SLIDE;
      const h = base !== null ? base + [0, -18, 18][slide % 3] : hues[slide % hues.length];
      const g = x.createLinearGradient(0, 0, width, height);
      g.addColorStop(0, `hsl(${h + Math.sin(t) * 10},80%,40%)`);
      g.addColorStop(1, `hsl(${h + 40},85%,16%)`);
      x.fillStyle = g; x.fillRect(0, 0, width, height);
      x.fillStyle = 'rgba(255,255,255,0.07)';
      const R = Math.min(width, height);
      for (let i = 0; i < 6; i++) {
        x.beginPath(); x.arc(width * (0.12 + 0.16 * i) + Math.sin(t + i) * R * 0.05, height * 0.5 + Math.cos(t * 0.7 + i) * R * 0.1, R * (0.1 + i * 0.02), 0, Math.PI * 2); x.fill();
      }
      // slide text rises and fades in, then fades out before the next slide
      const k = Math.min(1, into / 0.45) * Math.min(1, (SLIDE - into) / 0.35);
      const { big, small } = slides[slide];
      x.save();
      x.globalAlpha = k; x.translate(0, (1 - k) * height * 0.04);
      x.fillStyle = '#fff'; x.textAlign = 'center';
      x.font = `700 ${Math.round(R * 0.11)}px "Plus Jakarta Sans", sans-serif`;
      const lines2 = big.length > 18 ? lines(x, big, width * 0.84).slice(0, 2) : [big];   // long highlights wrap to two lines
      const size = Math.min(...lines2.map((l) => fit(l, 700, Math.round(R * (lines2.length > 1 ? 0.11 : 0.17)), width * 0.84)));
      x.font = `700 ${size}px "Plus Jakarta Sans", sans-serif`;
      const top = height * 0.5 - (lines2.length - 1) * size * 0.55;
      lines2.forEach((l, i) => x.fillText(l, width / 2, top + i * size * 1.1));
      fit(small, 500, Math.round(R * 0.065), width * 0.84);
      x.globalAlpha = k * 0.85;
      x.fillText(small, width / 2, top + (lines2.length - 1) * size * 1.1 + size * 0.95);
      x.restore();
      x.textAlign = 'left';
      x.fillStyle = grid; x.fillRect(0, 0, width, height);
    } else {
      // data/LED band for the Tech & AI building
      x.fillStyle = '#02060c'; x.fillRect(0, 0, width, height);
      for (let i = 0; i < 90; i++) {
        const px = ((i * 53 + t * 140) % (width + 40)) - 20;
        const py = (i * 37) % height;
        x.fillStyle = `rgba(80,${180 + (i % 5) * 15},255,${0.35 + 0.5 * Math.abs(Math.sin(t * 2 + i))})`;
        x.fillRect(px, py, 18 + (i % 4) * 10, 2);
      }
    }
    tex.needsUpdate = true;
  };
  update(0);
  return { texture: tex, update };
}
