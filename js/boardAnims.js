// Looping topic animations for the roadside billboards: one per pillar, no text.
// Each draw(ctx, w, h, t, c) paints a full frame; c = { accent, soft, bg } colours.

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const back = (x) => { x = clamp(x); const s = 1.7; return 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2; };
const span = (t, a, b) => clamp((t - a) / (b - a));

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function glow(ctx, color, blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; }
function noGlow(ctx) { ctx.shadowBlur = 0; }

// soft vignette and a faint grid behind every scene
function backdrop(ctx, w, h, c, t) {
  ctx.fillStyle = c.bg; ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h * 0.45, 40, w / 2, h / 2, w * 0.7);
  g.addColorStop(0, c.accent + '33'); g.addColorStop(1, c.accent + '00');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = c.accent + '14'; ctx.lineWidth = 1;
  const step = 48, off = (t * 12) % step;
  ctx.beginPath();
  for (let x = -off; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = 0; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
}

// 01 Licensing: a licence slides in, its lines fill, a stamp lands and approves it
function licensing(ctx, w, h, t, c) {
  const T = 4.6, k = (t % T);
  const fade = 1 - span(k, 4.1, 4.6);
  ctx.globalAlpha = fade;
  const dw = 330, dh = 420, dx = w / 2 - dw / 2 - 60, dy = h / 2 - dh / 2 + (1 - back(span(k, 0, 0.6))) * 260;
  ctx.save(); ctx.translate(dx + dw / 2, dy + dh / 2); ctx.rotate(-0.06); ctx.translate(-dw / 2, -dh / 2);
  glow(ctx, '#000', 30); ctx.fillStyle = '#f4efe4'; rr(ctx, 0, 0, dw, dh, 14); ctx.fill(); noGlow(ctx);
  ctx.fillStyle = c.accent; ctx.fillRect(0, 0, dw, 18);
  ctx.beginPath(); ctx.arc(60, 80, 30, 0, TAU); ctx.fill();             // emblem
  for (let i = 0; i < 7; i++) {                                         // text lines writing in
    const p = ease(span(k, 0.6 + i * 0.13, 0.9 + i * 0.13));
    const lw = (i === 0 ? 150 : i % 3 === 2 ? 170 : 250) * p;
    ctx.fillStyle = i === 0 ? '#3a3a3a' : '#b9b2a4';
    rr(ctx, i === 0 ? 110 : 40, i === 0 ? 70 : 150 + i * 30, lw, i === 0 ? 20 : 12, 6); ctx.fill();
  }
  // the stamp mark it leaves
  const hit = span(k, 2.05, 2.1);
  if (hit > 0) {
    ctx.save(); ctx.translate(dw - 95, dh - 95); ctx.rotate(-0.25);
    ctx.strokeStyle = c.accent; ctx.lineWidth = 9; ctx.globalAlpha = fade * 0.9;
    ctx.beginPath(); ctx.arc(0, 0, 62, 0, TAU); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 48, 0, TAU); ctx.stroke();
    ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath();
    const ck = ease(span(k, 2.1, 2.5));
    ctx.moveTo(-26, 2); ctx.lineTo(-26 + 18 * Math.min(1, ck * 2), 2 + 20 * Math.min(1, ck * 2));
    if (ck > 0.5) ctx.lineTo(-8 + 38 * (ck - 0.5) * 2, 22 - 46 * (ck - 0.5) * 2);
    ctx.stroke(); ctx.restore();
  }
  ctx.restore();
  // the stamp itself drops, presses, lifts away
  const drop = k < 2.05 ? ease(span(k, 1.5, 2.05)) : 1 - ease(span(k, 2.35, 2.9));
  if (drop > 0.01) {
    const sx = dx + dw - 70, sy = dy + dh - 120 - (1 - drop) * 300;
    const squash = k > 2.05 && k < 2.25 ? 0.9 : 1;
    ctx.save(); ctx.translate(sx, sy); ctx.scale(1, squash);
    glow(ctx, '#000', 20);
    ctx.fillStyle = '#5b3b22'; rr(ctx, -22, -150, 44, 110, 18); ctx.fill();
    ctx.fillStyle = '#3a2616'; rr(ctx, -50, -50, 100, 34, 8); ctx.fill();
    ctx.fillStyle = c.accent; rr(ctx, -60, -18, 120, 22, 6); ctx.fill();
    noGlow(ctx); ctx.restore();
  }
  // burst on impact
  const b = span(k, 2.05, 2.7);
  if (b > 0 && b < 1) {
    ctx.strokeStyle = c.soft; ctx.lineWidth = 5; ctx.globalAlpha = fade * (1 - b);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU, r0 = 90 + b * 60, r1 = r0 + 30;
      const cx = dx + dw - 70, cy = dy + dh - 100;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // a row of small approved licences builds up on the right
  for (let i = 0; i < 3; i++) {
    const x = w - 230 + i * 18, y = 150 + i * 70;
    ctx.globalAlpha = 0.25 + 0.15 * i;
    ctx.fillStyle = '#f4efe4'; rr(ctx, x, y, 150, 190, 10); ctx.fill();
    ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(x + 120, y + 160, 18, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// 02 Finance: bars grow, a trend line climbs with a glowing head, coins drop and stack
function finance(ctx, w, h, t, c) {
  const T = 6, k = t % T, fade = 1 - span(k, 5.5, 6);
  const base = h - 110, left = 120, n = 7, bw = 70, gap = 34;
  const vals = [0.28, 0.4, 0.34, 0.52, 0.6, 0.72, 0.9];
  ctx.globalAlpha = fade;
  ctx.strokeStyle = c.accent + '66'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(left - 30, base); ctx.lineTo(left + n * (bw + gap), base); ctx.stroke();
  const pts = [];
  for (let i = 0; i < n; i++) {
    const p = back(span(k, 0.2 + i * 0.18, 0.8 + i * 0.18));
    const bh = vals[i] * (h - 230) * p, x = left + i * (bw + gap);
    const g = ctx.createLinearGradient(0, base - bh, 0, base);
    g.addColorStop(0, c.accent); g.addColorStop(1, c.accent + '33');
    ctx.fillStyle = g; rr(ctx, x, base - bh, bw, bh, 8); ctx.fill();
    pts.push([x + bw / 2, base - vals[i] * (h - 230) - 36]);
  }
  // trend line drawing across
  const lp = ease(span(k, 1.6, 3.6)) * (n - 1);
  ctx.strokeStyle = c.soft; ctx.lineWidth = 7; ctx.lineJoin = ctx.lineCap = 'round';
  glow(ctx, c.soft, 18); ctx.beginPath(); ctx.moveTo(...pts[0]);
  let head = pts[0];
  for (let i = 1; i < n && i - 1 < lp; i++) {
    const f = Math.min(1, lp - (i - 1));
    head = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
    ctx.lineTo(...head);
  }
  ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(head[0], head[1], 11 + Math.sin(t * 8) * 2, 0, TAU); ctx.fill();
  // arrow at the end
  if (lp >= n - 1.01) {
    const [x, y] = pts[n - 1];
    ctx.fillStyle = c.soft; ctx.beginPath(); ctx.moveTo(x + 40, y - 40); ctx.lineTo(x + 6, y - 34); ctx.lineTo(x + 34, y - 6); ctx.closePath(); ctx.fill();
  }
  noGlow(ctx);
  // coins drop and stack on the right
  const cx = w - 140;
  for (let i = 0; i < 8; i++) {
    const p = span(k, 0.5 + i * 0.4, 0.9 + i * 0.4);
    if (p <= 0) continue;
    const y = base - 16 - i * 22 - (1 - ease(p)) * (base - i * 22);
    ctx.fillStyle = '#b8862b'; ctx.beginPath(); ctx.ellipse(cx, y + 8, 62, 18, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.ellipse(cx, y, 62, 18, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffe39a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, y, 44, 11, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// 03 Technology & AI: a glowing chip at the centre of a circuit, pulses racing along the traces
const TRACES = (() => {
  const out = [];
  for (let i = 0; i < 18; i++) {
    const side = i % 4, k = Math.floor(i / 4) + (i % 2) * 0.5;
    out.push({ side, off: (k - 2) * 46, len: 180 + ((i * 53) % 140), turn: ((i * 37) % 3) - 1, speed: 0.35 + ((i * 17) % 10) / 20, ph: (i * 0.37) % 1 });
  }
  return out;
})();
function technology(ctx, w, h, t, c) {
  const cx = w / 2, cy = h / 2, half = 95;
  ctx.lineCap = 'round';
  for (const tr of TRACES) {
    const dir = [[1, 0], [0, 1], [-1, 0], [0, -1]][tr.side];
    const perp = [-dir[1], dir[0]];
    const sx = cx + dir[0] * half + perp[0] * tr.off, sy = cy + dir[1] * half + perp[1] * tr.off;
    const mx = sx + dir[0] * tr.len * 0.55, my = sy + dir[1] * tr.len * 0.55;
    const ex = mx + (dir[0] + perp[0] * tr.turn) * tr.len * 0.45, ey = my + (dir[1] + perp[1] * tr.turn) * tr.len * 0.45;
    ctx.strokeStyle = c.accent + '55'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(mx, my); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = c.accent + '99'; ctx.beginPath(); ctx.arc(ex, ey, 8, 0, TAU); ctx.fill();
    // pulse travelling outwards
    const p = (t * tr.speed + tr.ph) % 1;
    const seg1 = 0.55;
    const px = p < seg1 ? sx + (mx - sx) * p / seg1 : mx + (ex - mx) * (p - seg1) / (1 - seg1);
    const py = p < seg1 ? sy + (my - sy) * p / seg1 : my + (ey - my) * (p - seg1) / (1 - seg1);
    glow(ctx, c.soft, 20); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, 6, 0, TAU); ctx.fill(); noGlow(ctx);
    if (p > 0.92) { ctx.strokeStyle = c.soft; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ex, ey, 8 + (p - 0.92) * 300, 0, TAU); ctx.stroke(); }
  }
  // chip with pins
  ctx.fillStyle = '#9aa7b4';
  for (let i = -3; i <= 3; i++) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x = cx + a * (half + 10) + b * i * 24, y = cy + b * (half + 10) + a * i * 24;
    ctx.fillRect(x - 5, y - 5, 10, 10);
  }
  glow(ctx, c.accent, 40 + Math.sin(t * 3) * 15);
  ctx.fillStyle = '#111a24'; rr(ctx, cx - half, cy - half, half * 2, half * 2, 18); ctx.fill(); noGlow(ctx);
  ctx.strokeStyle = c.accent; ctx.lineWidth = 4; rr(ctx, cx - half + 14, cy - half + 14, half * 2 - 28, half * 2 - 28, 12); ctx.stroke();
  // neural core: rotating nodes
  for (let i = 0; i < 6; i++) {
    const a = t * 0.9 + i / 6 * TAU, r = 42;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    ctx.strokeStyle = c.soft + '88'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = c.soft; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
  }
  glow(ctx, '#fff', 25); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 14 + Math.sin(t * 4) * 3, 0, TAU); ctx.fill(); noGlow(ctx);
}

// 04 Legal: scales of justice settling into balance, a gavel strikes with a ripple
function legal(ctx, w, h, t, c) {
  const cx = w / 2 - 110, top = 120, T = 4;
  const k = t % T;
  const tilt = Math.sin(t * 1.6) * 0.16 * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.4)));
  ctx.strokeStyle = c.soft; ctx.fillStyle = c.soft; ctx.lineWidth = 9; ctx.lineCap = 'round';
  glow(ctx, c.accent, 18);
  ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, h - 120); ctx.stroke();             // pillar
  rr(ctx, cx - 90, h - 128, 180, 22, 8); ctx.fill();                                       // base
  ctx.beginPath(); ctx.arc(cx, top - 6, 16, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(cx, top + 20); ctx.rotate(tilt);
  ctx.beginPath(); ctx.moveTo(-200, 0); ctx.lineTo(200, 0); ctx.stroke();                 // beam
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * 200, 0); ctx.rotate(-tilt);
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-70, 150); ctx.moveTo(0, 0); ctx.lineTo(70, 150); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-90, 150); ctx.quadraticCurveTo(0, 215, 90, 150); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore(); noGlow(ctx);
  // gavel on the right, striking once per cycle
  const gx = w - 230, gy = h - 150;
  const swing = k < 1.2 ? 0.9 * ease(span(k, 0, 1.2)) : k < 1.45 ? 0.9 - 0.9 * span(k, 1.2, 1.45) ** 2 : 0;   // lifts, then strikes
  ctx.fillStyle = '#6b4526'; rr(ctx, gx - 110, gy + 10, 220, 34, 8); ctx.fill();          // sound block
  ctx.save(); ctx.translate(gx + 150, gy - 40); ctx.rotate(swing);
  ctx.fillStyle = '#8a5a32'; rr(ctx, -170, -10, 160, 20, 8); ctx.fill();                  // handle
  ctx.fillStyle = '#5a3a1f'; rr(ctx, -215, -42, 70, 84, 14); ctx.fill();                  // head
  ctx.fillStyle = c.accent; ctx.fillRect(-215, -14, 70, 8); ctx.fillRect(-215, 6, 70, 8);
  ctx.restore();
  const r = span(k, 1.45, 2.4);
  if (r > 0 && r < 1) {
    ctx.strokeStyle = c.soft; ctx.globalAlpha = 1 - r; ctx.lineWidth = 5;
    for (const m of [1, 1.6]) { ctx.beginPath(); ctx.ellipse(gx, gy + 10, 60 + r * 160 * m, 14 + r * 40 * m, 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
}

// 05 Real estate: a skyline rises tower by tower, windows light up, a crane swings
const TOWERS = [[0.04, 0.42, 0.1], [0.15, 0.62, 0.09], [0.25, 0.5, 0.11], [0.37, 0.82, 0.1], [0.48, 0.6, 0.12], [0.61, 0.72, 0.09], [0.71, 0.48, 0.11], [0.83, 0.66, 0.1]];
function realestate(ctx, w, h, t, c) {
  const T = 7, k = t % T, fade = 1 - span(k, 6.5, 7), ground = h - 70;
  ctx.globalAlpha = fade;
  ctx.fillStyle = c.accent + '44'; ctx.fillRect(0, ground, w, 70);
  TOWERS.forEach(([x0, hh, ww], i) => {
    const p = back(span(k, 0.2 + i * 0.32, 1.0 + i * 0.32));
    const bw = ww * w, bh = hh * (ground - 60) * p, x = x0 * w + 30, y = ground - bh;
    if (bh < 2) return;
    const g = ctx.createLinearGradient(0, y, 0, ground);
    g.addColorStop(0, '#2b3a4c'); g.addColorStop(1, '#16202c');
    ctx.fillStyle = g; ctx.fillRect(x, y, bw, bh);
    ctx.fillStyle = c.accent; ctx.fillRect(x, y, bw, 5);
    const lit = span(k, 1 + i * 0.32, 2.5 + i * 0.32);
    for (let wy = y + 22; wy < ground - 16; wy += 26) for (let wx = x + 12; wx < x + bw - 16; wx += 22) {
      const on = ((wx * 7 + wy * 13) % 10) / 10 < lit * 0.85;
      ctx.fillStyle = on ? (((wx + wy) % 3 === 0) ? c.soft : '#ffe2a6') : '#0e151d';
      ctx.fillRect(wx, wy, 10, 14);
    }
  });
  // crane on top of the tallest tower
  const [x0, hh, ww] = TOWERS[3];
  const p = back(span(k, 0.2 + 3 * 0.32, 1.0 + 3 * 0.32));
  const topY = ground - hh * (ground - 60) * p, mx = x0 * w + 30 + ww * w * 0.5;
  if (p > 0.95) {
    ctx.strokeStyle = c.soft; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(mx, topY); ctx.lineTo(mx, topY - 90); ctx.stroke();
    const a = Math.sin(t * 0.7) * 0.5;
    ctx.save(); ctx.translate(mx, topY - 90); ctx.scale(Math.cos(a), 1);
    ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(180, 0); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(140, 0); ctx.lineTo(140, 60 + Math.sin(t * 1.3) * 10); ctx.stroke();
    ctx.fillStyle = c.accent; ctx.fillRect(122, 60 + Math.sin(t * 1.3) * 10, 36, 22);
    ctx.fillStyle = '#ff5050'; ctx.globalAlpha = fade * (0.5 + 0.5 * Math.sin(t * 5));
    ctx.beginPath(); ctx.arc(-60, 0, 6, 0, TAU); ctx.fill();
    ctx.restore(); ctx.globalAlpha = fade;
  }
  ctx.globalAlpha = 1;
}

// 06 HR & Immigration: a turning globe with planes flying arcs between cities, people pins pop up
const CITIES = [[-0.6, -0.3], [-0.2, 0.25], [0.15, -0.45], [0.5, 0.1], [0.3, 0.5], [-0.45, 0.55], [0.7, -0.35]];
function hr(ctx, w, h, t, c) {
  const cx = w / 2, cy = h / 2 + 10, R = 230;
  const g = ctx.createRadialGradient(cx - 70, cy - 80, 30, cx, cy, R);
  g.addColorStop(0, c.accent + '66'); g.addColorStop(1, c.accent + '11');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
  ctx.strokeStyle = c.accent + '55'; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {                                     // meridians turning
    const ph = ((t * 0.15 + i / 6) % 1) * Math.PI;
    ctx.beginPath(); ctx.ellipse(cx, cy, Math.abs(Math.cos(ph)) * R, R, 0, 0, TAU); ctx.stroke();
  }
  for (let i = -2; i <= 2; i++) { const y = cy + i * R * 0.38; const rw = Math.sqrt(R * R - (y - cy) ** 2); ctx.beginPath(); ctx.ellipse(cx, y, rw, 10, 0, 0, TAU); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = c.soft; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  const P = CITIES.map(([x, y]) => [cx + x * R, cy + y * R]);
  // flight routes
  for (let i = 0; i < 5; i++) {
    const a = P[i], b = P[(i * 3 + 2) % P.length];
    const mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - 120;
    ctx.setLineDash([10, 10]); ctx.lineDashOffset = -t * 30;
    ctx.strokeStyle = c.soft + '99'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo(mx, my, ...b); ctx.stroke(); ctx.setLineDash([]);
    const p = (t * 0.22 + i * 0.21) % 1;
    const q = (u) => [(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * mx + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * my + u * u * b[1]];
    const [px, py] = q(p), [nx, ny] = q(Math.min(1, p + 0.01));
    ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(ny - py, nx - px));
    glow(ctx, '#fff', 12); ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-14, -6); ctx.lineTo(-14, 6); ctx.closePath(); ctx.fill();   // body
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-6, -20); ctx.lineTo(-10, -20); ctx.lineTo(-4, 0); ctx.lineTo(-10, 20); ctx.lineTo(-6, 20); ctx.closePath(); ctx.fill();
    noGlow(ctx); ctx.restore();
  }
  // people pins pulsing at each city
  P.forEach(([x, y], i) => {
    const s = 0.8 + 0.2 * Math.sin(t * 3 + i);
    ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(x, y - 30 * s, 16 * s, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y - 34 * s, 6 * s, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - 22 * s, 9 * s, Math.PI, 0); ctx.fill();
  });
}

// 07 Branding & PR: a megaphone sending out sound waves, shapes and sparkles bursting out
function branding(ctx, w, h, t, c) {
  const mx = 230, my = h / 2 + 20;
  // waves
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.6 + i / 4) % 1;
    ctx.strokeStyle = c.soft; ctx.globalAlpha = 1 - p; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(mx + 140, my, 60 + p * 380, -0.55, 0.55); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // shapes flying out
  for (let i = 0; i < 14; i++) {
    const p = (t * 0.35 + i * 0.137) % 1;
    const a = -0.5 + ((i * 0.618) % 1) * 1.0;
    const d = 160 + p * 560, x = mx + 140 + Math.cos(a) * d, y = my + Math.sin(a) * d * 0.9;
    const s = 10 + (i % 4) * 7, rot = t * 2 + i;
    ctx.globalAlpha = Math.sin(p * Math.PI);
    ctx.fillStyle = [c.accent, c.soft, '#ffd36b', '#ffffff'][i % 4];
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    if (i % 3 === 0) { ctx.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? s * 0.45 : s; ctx.lineTo(Math.cos(j / 10 * TAU) * r, Math.sin(j / 10 * TAU) * r); } ctx.closePath(); ctx.fill(); }
    else if (i % 3 === 1) { ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, TAU); ctx.fill(); }
    else { ctx.fillRect(-s * 0.6, -s * 0.6, s * 1.2, s * 1.2); }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // megaphone, pulsing slightly
  const pulse = 1 + Math.sin(t * 6) * 0.03;
  ctx.save(); ctx.translate(mx, my); ctx.scale(pulse, pulse); ctx.rotate(-0.12);
  glow(ctx, c.accent, 30);
  ctx.fillStyle = c.accent; ctx.beginPath(); ctx.moveTo(-40, -40); ctx.lineTo(140, -120); ctx.lineTo(140, 120); ctx.lineTo(-40, 40); ctx.closePath(); ctx.fill();
  noGlow(ctx);
  ctx.fillStyle = '#f3f1ec'; ctx.beginPath(); ctx.ellipse(140, 0, 22, 120, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2a2f37'; rr(ctx, -100, -42, 66, 84, 14); ctx.fill();
  ctx.fillStyle = '#3a404a'; rr(ctx, -60, 30, 34, 80, 10); ctx.fill();
  ctx.restore();
}

// 08 Trade & supply: a container ship sails across the waves, a plane and a truck share the route
const BOX_COLS = ['#e2455a', '#38b6ff', '#e8b04a', '#2fd08a', '#8d6bff', '#ff8a4c'];
function trade(ctx, w, h, t, c) {
  const sea = h - 170;
  // route line with moving dashes and port pins
  ctx.setLineDash([16, 14]); ctx.lineDashOffset = -t * 40; ctx.strokeStyle = c.soft + '88'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(80, 120); ctx.bezierCurveTo(w * 0.35, 30, w * 0.65, 200, w - 80, 100); ctx.stroke(); ctx.setLineDash([]);
  for (const [x, y] of [[80, 120], [w - 80, 100]]) { ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); }
  // plane along the route
  const u = (t * 0.12) % 1, B = (a, b, cc, d, s) => (1 - s) ** 3 * a + 3 * (1 - s) ** 2 * s * b + 3 * (1 - s) * s * s * cc + s ** 3 * d;
  const px = B(80, w * 0.35, w * 0.65, w - 80, u), py = B(120, 30, 200, 100, u);
  const qx = B(80, w * 0.35, w * 0.65, w - 80, u + 0.01), qy = B(120, 30, 200, 100, u + 0.01);
  ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(qy - py, qx - px)); ctx.fillStyle = '#fff'; glow(ctx, '#fff', 14);
  ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(-16, -7); ctx.lineTo(-16, 7); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-8, -24); ctx.lineTo(-12, -24); ctx.lineTo(-6, 0); ctx.lineTo(-12, 24); ctx.lineTo(-8, 24); ctx.closePath(); ctx.fill();
  noGlow(ctx); ctx.restore();
  // ship
  const sx = ((t * 60) % (w + 600)) - 450, bob = Math.sin(t * 1.8) * 5, roll = Math.sin(t * 1.4) * 0.02;
  ctx.save(); ctx.translate(sx, sea + bob); ctx.rotate(roll);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) {
    ctx.fillStyle = BOX_COLS[(i * 2 + r * 3) % BOX_COLS.length];
    ctx.fillRect(40 + i * 44, -40 - r * 30, 40, 26);
    ctx.fillStyle = '#00000033'; for (let s = 0; s < 4; s++) ctx.fillRect(46 + i * 44 + s * 9, -38 - r * 30, 3, 22);
  }
  ctx.fillStyle = '#e9e6df'; ctx.fillRect(350, -110, 50, 110); ctx.fillStyle = '#9fd5ff'; ctx.fillRect(356, -100, 38, 12);
  ctx.fillStyle = '#1b2633'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(430, -12); ctx.lineTo(400, 40); ctx.lineTo(30, 40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c.accent; ctx.fillRect(20, 0, 395, 8);
  ctx.restore();
  // waves
  for (let layer = 0; layer < 3; layer++) {
    ctx.fillStyle = layer === 2 ? c.accent + '55' : layer === 1 ? '#123049' : '#0c2236';
    ctx.beginPath(); ctx.moveTo(0, h);
    const y0 = sea + 24 + layer * 30;
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, y0 + Math.sin(x * 0.02 + t * (1.5 + layer * 0.5) + layer) * 8);
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
  }
}

export const BOARD_ANIMS = { licensing, finance, technology, legal, realestate, hr, branding, trade };

export function drawBoard(id, ctx, w, h, t, c) {
  backdrop(ctx, w, h, c, t);
  (BOARD_ANIMS[id] || technology)(ctx, w, h, t, c);
}
