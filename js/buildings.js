// The 8 Solutions Suite pillars as 8 buildings. Each builder returns
// { group, depth, height, update? } with the building's front facing local +Z.
import * as THREE from 'three';
import { facadeTextures, concreteTexture, stoneTexture, corrugatedTexture, signTexture, ledScreen, random } from './textures.js';
import { drawBoard } from './boardAnims.js';

const metalDark = new THREE.MeshStandardMaterial({ color: 0x2a2f36, metalness: 0.85, roughness: 0.35 });
const metalLight = new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: 0.7, roughness: 0.3 });
const gold = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 1, roughness: 0.28 });
const roofMat = new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: 0.9 });
const darkGlass = new THREE.MeshStandardMaterial({ color: 0x1a2430, metalness: 0.9, roughness: 0.08 });
const warningRed = new THREE.MeshBasicMaterial({ color: 0xff3b2f });

function shadowed(m, cast = true, receive = true) {
  m.castShadow = cast; m.receiveShadow = receive; return m;
}

function cloneTex(t, rx, ry) {
  const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c;
}

// Box with a glass curtain wall on the four sides and a plain roof
function glassBox(w, h, d, f, { tint = 0xffffff, tileW = 12, tileH = 57.6, emissive = 0.45, metal = 0.75, rough = 0.12 } = {}) {
  const side = (len) => new THREE.MeshStandardMaterial({
    map: cloneTex(f.map, len / tileW, h / tileH),
    emissiveMap: cloneTex(f.emissive, len / tileW, h / tileH),
    emissive: new THREE.Color(0xffffff), emissiveIntensity: emissive,
    color: tint, metalness: metal, roughness: rough + 0.06, envMapIntensity: 0.75,
  });
  const sx = side(d), sz = side(w);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [sx, sx, roofMat, roofMat, sz, sz]);
  return shadowed(mesh);
}

function solidBox(w, h, d, mat) {
  return shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
}

function texturedMat(tex, w, h, opts = {}) {
  return new THREE.MeshStandardMaterial({ map: cloneTex(tex, w, h), roughness: 0.85, ...opts });
}

// Aviation warning lights blink together: a short flash every 1.5 s
const warningOn = new THREE.Color(0xff3b2f), warningOff = new THREE.Color(0x3a0d0a);
export function blinkAviation(t) {
  warningRed.color.copy((t % 1.5) < 0.18 ? warningOn : warningOff);
}

function aviationLight(y) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), warningRed);
  m.position.y = y; return m;
}

// Roadside billboard in front of each building, facing local +Z: one screen playing a looping,
// text-free animation of the pillar's topic (see boardAnims.js).
export const BILLBOARD = { width: 9.4, bottom: 2.6, headerH: 1.3, bodyH: 4.35 };
export function billboard(index, pillar, contact) {
  const { width: W, bottom, headerH, bodyH } = BILLBOARD;
  const H = headerH + bodyH + 0.06;
  const cy = bottom + H / 2;
  const g = new THREE.Group();
  // themed in the brand colour: accents in the colour, background a very dark tint of it
  const accent = new THREE.Color(pillar.color);
  const hsl = {}; accent.getHSL(hsl);
  const colors = {
    accent: '#' + accent.getHexString(),
    soft: '#' + new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s + 0.1), Math.min(0.82, hsl.l + 0.22)).getHexString(),
    bg: '#' + new THREE.Color().setHSL(hsl.h, 0.5, 0.045).getHexString(),
  };
  const cw = 1024, ch = Math.round(cw * H / W);
  const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  drawBoard(pillar.id, ctx, cw, ch, 0, colors); tex.needsUpdate = true;

  // frame, posts, catwalk
  const frame = solidBox(W + 0.36, H + 0.36, 0.4, metalDark);
  frame.position.set(0, cy, -0.22); g.add(frame);
  for (const x of [-W * 0.3, W * 0.3]) {
    const post = solidBox(0.42, bottom + 0.4, 0.42, metalDark);
    post.position.set(x, (bottom + 0.4) / 2, -0.3); g.add(post);
    const foot = solidBox(1.1, 0.25, 1.1, new THREE.MeshStandardMaterial({ color: 0x8c8478, roughness: 0.9 }));
    foot.position.set(x, 0.125, -0.3); g.add(foot);
  }
  const walk = solidBox(W, 0.06, 0.7, metalDark);
  walk.position.set(0, bottom - 0.2, 0.3); g.add(walk);

  // the screen
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, color: 0xe6e6e6, toneMapped: false }));
  face.position.set(0, cy, 0); g.add(face);

  // up-lights on the catwalk
  const lampGeo = new THREE.BoxGeometry(0.34, 0.16, 0.22);
  const glow = new THREE.MeshBasicMaterial({ color: 0xffe2b0 });
  for (let i = 0; i < 4; i++) {
    const x = -W / 2 + W * (i + 0.5) / 4;
    const lamp = new THREE.Mesh(lampGeo, metalDark); lamp.position.set(x, bottom - 0.06, 0.55); g.add(lamp);
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.1), glow);
    lens.position.set(x, bottom + 0.03, 0.55); lens.rotation.x = -Math.PI / 2; g.add(lens);
  }

  // a band of light sweeps across the screen every few seconds
  const sc = document.createElement('canvas'); sc.width = 256; sc.height = 4;
  const sx = sc.getContext('2d'), sg = sx.createLinearGradient(0, 0, 256, 0);
  sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,240,215,0.16)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
  sx.fillStyle = sg; sx.fillRect(0, 0, 256, 4);
  const sheenTex = new THREE.CanvasTexture(sc);
  sheenTex.wrapS = THREE.ClampToEdgeWrapping;
  sheenTex.repeat.set(4, 1);                 // the band is a quarter of the board wide
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(W, H),
    new THREE.MeshBasicMaterial({ map: sheenTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  sheen.position.set(0, cy, 0.008); g.add(sheen);

  // power: screens are dark until the walker approaches, then flicker on
  const base = new THREE.Color(0xe6e6e6);
  let hover = 1;
  let wakeAt = null, woke = false, level = -1;
  const setLevel = (k) => {
    if (Math.abs(k - level) < 0.004) return;
    level = k;
    face.material.color.copy(base).multiplyScalar(Math.max(0.035, k) * hover);
  };
  setLevel(0);
  const flicker = (s) => (s < 0 ? 0 : s > 0.9 ? 1 : (Math.sin(s * 70) > 0.1 - s ? 0.45 + s * 0.6 : 0.08));

  // the animation is redrawn at up to 30 fps, only while the screen is on and near the walker
  let lastDraw = -1;
  const api = {
    group: g, centerY: cy, hit: [face],
    active: false,
    update(t) {
      if (woke && api.active && t - lastDraw > 1 / 30) {
        lastDraw = t;
        drawBoard(pillar.id, ctx, cw, ch, t, colors);
        tex.needsUpdate = true;
      }
      if (woke && wakeAt === null) wakeAt = t;
      setLevel(woke ? flicker(t - wakeAt) : 0);
      sheen.visible = woke && level > 0.9;
      if (sheen.visible) sheenTex.offset.x = 1 - ((t * 0.9 + index * 1.7) % 8);   // crosses the board, then rests
    },
    get level() { return level; },
    wake() { woke = true; },
    sleep() { woke = false; wakeAt = null; },
    setHover(on) {                          // hover: the screen brightens a little
      hover = on ? 1.15 : 1;
      const k = level; level = -1; setLevel(k);
    },
  };
  return api;
}

// The Enabler-S emblem (assets/logo-mark.png) as a gold monument at the end of the boulevard, facing
// local +Z. The cut-out is stacked in thin layers to give the letterform real thickness.
export function endMonument() {
  const g = new THREE.Group();
  const lift = 1.2, H = 12, W = H * 408 / 512, DEPTH = 1.1, LAYERS = 16;
  const tex = new THREE.TextureLoader().load('assets/logo-mark.png');
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const face = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, metalness: 0.55, roughness: 0.3, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.3, side: THREE.DoubleSide });
  const core = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, color: 0x8a6a2c, metalness: 0.7, roughness: 0.35 });
  const emblem = new THREE.Group();
  const plane = new THREE.PlaneGeometry(W, H);
  for (let i = 0; i < LAYERS; i++) {
    const outer = i === 0 || i === LAYERS - 1;
    const layer = new THREE.Mesh(plane, outer ? face : core);
    layer.position.z = DEPTH / 2 - (i / (LAYERS - 1)) * DEPTH;
    layer.castShadow = true;
    emblem.add(layer);
  }
  emblem.position.y = lift + H / 2 + 0.3;
  g.add(emblem);
  const plinth = solidBox(18, lift, 6, new THREE.MeshStandardMaterial({ color: 0x8c8478, roughness: 0.9 }));
  plinth.position.y = lift / 2; g.add(plinth);
  // a ring of light on the plaza that slowly breathes
  const rc = document.createElement('canvas'); rc.width = rc.height = 256;
  const rx = rc.getContext('2d');
  const rg = rx.createRadialGradient(128, 128, 60, 128, 128, 128);
  rg.addColorStop(0, 'rgba(255,200,120,0)'); rg.addColorStop(0.75, 'rgba(255,205,130,0.55)'); rg.addColorStop(1, 'rgba(255,200,120,0)');
  rx.fillStyle = rg; rx.fillRect(0, 0, 256, 256);
  const ringTex = new THREE.CanvasTexture(rc); ringTex.colorSpace = THREE.SRGBColorSpace;
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(26, 26).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  ring.position.y = 0.06; g.add(ring);
  return {
    group: g,
    update(t, night) {
      ring.material.opacity = (0.25 + 0.75 * night) * (0.75 + 0.25 * Math.sin(t * 1.2));
      ring.rotation.y = t * 0.05;
      face.emissiveIntensity = 0.3 + 0.45 * night;   // floodlit after dark
      emblem.rotation.y = Math.sin(t * 0.25) * 0.12;   // a slow turn shows off its depth
    },
  };
}

// Monument sign at a building entrance, facing local +Z
export function monumentSign(index, title, sub, accent = '#c9a24a') {
  const g = new THREE.Group();
  const base = solidBox(4.6, 1.9, 0.5, new THREE.MeshStandardMaterial({ color: 0x151b24, roughness: 0.5, metalness: 0.4 }));
  base.position.y = 0.95; g.add(base);
  const map = signTexture(String(index).padStart(2, '0') + ' / 08', title, sub, accent);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.72),
    new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.4 }));
  face.position.set(0, 0.95, 0.26); g.add(face);
  const plinth = solidBox(5, 0.18, 0.9, new THREE.MeshStandardMaterial({ color: 0x8c8478, roughness: 0.9 }));
  plinth.position.y = 0.09; g.add(plinth);
  return g;
}

// A Brandora-style LED screen for a building, in the brand's colour, facing local +Z.
// x, y, z: centre of the screen. posts: height the support posts stand on (omit for wall-mounted).
function brandScreen(g, p, { w, h, x = 0, y, z, posts = null }) {
  const portrait = h > w;
  const cw = portrait ? 640 : 1024;
  const screen = ledScreen(cw, Math.round(cw * h / w), {
    color: p.color,
    slides: [
      { big: p.brand.toUpperCase(), small: p.line },
      { big: p.highlights[0], small: `Enabler-S · ${p.brand}` },
      { big: p.highlights[1], small: `Enabler-S · ${p.brand}` },
    ],
  });
  // turned toward the approaching walker (local +X is up the street) and stood out from the wall far
  // enough that the turned edge clears it; a pair of arms ties it back to the building
  const TURN = 0.35;
  const out = (w / 2) * Math.sin(TURN) + 0.3;
  const rig = new THREE.Group();
  rig.position.set(x, y, z + out);
  rig.rotation.y = TURN;
  g.add(rig);
  const frame = solidBox(w + 0.5, h + 0.5, 0.4, metalDark);
  frame.position.z = -0.22; rig.add(frame);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: screen.texture, toneMapped: false }));
  rig.add(panel);
  // a thin line of brand-coloured light around the frame
  const edge = new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color).multiplyScalar(1.6), toneMapped: false });
  for (const [ex, ey, ew, eh] of [[0, h / 2 + 0.25, w + 0.6, 0.1], [0, -h / 2 - 0.25, w + 0.6, 0.1], [w / 2 + 0.25, 0, 0.1, h + 0.6], [-w / 2 - 0.25, 0, 0.1, h + 0.6]]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(ew, eh, 0.12), edge);
    bar.position.set(ex, ey, -0.02); rig.add(bar);
  }
  for (const ey of [h * 0.3, -h * 0.3]) {
    const arm = solidBox(0.25, 0.25, out + 0.1, metalDark);   // from inside the wall to just behind the frame
    arm.position.set(x, y + ey, z + (out - 1.1) / 2); g.add(arm);
  }
  if (posts !== null) {
    const len = y - h / 2 - posts;
    for (const px of [-w * 0.3, w * 0.3]) {
      const post = solidBox(0.32, len, 0.32, metalDark);
      post.position.set(x + px * Math.cos(TURN), posts + len / 2, z + out - px * Math.sin(TURN) - 0.4); g.add(post);
    }
  }
  screen.update.at = rig.position.clone();   // where the camera looks to read the brand
  return screen.update;
}

// 01 Global Licensing & Strategic Advisory: glass tower with fins and a crown
function licensing(pillar) {
  const g = new THREE.Group();
  const f = facadeTextures({ cols: 8, rows: 16, glassTop: '#a9c3d8', glassBottom: '#36506a', lit: 0.3 });
  const podium = glassBox(18, 6, 16, facadeTextures({ cols: 6, rows: 2, spandrel: false, lit: 0.7 }), { tileH: 7.2 });
  podium.position.y = 3; g.add(podium);
  const tower = glassBox(12, 54, 12, f);
  tower.position.y = 6 + 27; g.add(tower);
  const fin = new THREE.BoxGeometry(0.18, 54, 0.7);
  const fins = new THREE.InstancedMesh(fin, metalLight, 32);
  const m = new THREE.Matrix4();
  let k = 0;
  for (let i = 0; i < 8; i++) {
    const x = -5.25 + i * 1.5;
    m.makeTranslation(x, 33, 6.35); fins.setMatrixAt(k++, m);
    m.makeTranslation(x, 33, -6.35); fins.setMatrixAt(k++, m);
    m.makeRotationY(Math.PI / 2).setPosition(6.35, 33, x); fins.setMatrixAt(k++, m);
    m.makeRotationY(Math.PI / 2).setPosition(-6.35, 33, x); fins.setMatrixAt(k++, m);
  }
  fins.castShadow = true; g.add(fins);
  const c1 = solidBox(10, 3.5, 10, metalDark); c1.position.y = 61.75; g.add(c1);
  const c2 = solidBox(6.5, 3, 6.5, metalDark); c2.position.y = 65; g.add(c2);
  const spire = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.35, 12, 8), metalLight));
  spire.position.y = 72.5; g.add(spire);
  g.add(aviationLight(78.6));
  const canopy = solidBox(8, 0.35, 1.4, metalLight); canopy.position.set(0, 4.6, 9.7); g.add(canopy);   // shallow, so it stays behind the billboard
  const screen = brandScreen(g, pillar, { w: 7.5, h: 9.4, y: 21, z: 6.95 });
  return { group: g, depth: 18, height: 78, width: 18, screenAt: screen.at, update: screen };
}

// 02 Finabler-S (finance): twisting gold-glass tower
function finance(pillar) {
  const g = new THREE.Group();
  const f = facadeTextures({ cols: 6, rows: 8, glassTop: '#e8d3a4', glassBottom: '#7a5f33', mullion: '#3a3024', lit: 0.4, warm: '#ffe2b0' });
  const floors = 26, fh = 2.4;
  const glassMat = new THREE.MeshStandardMaterial({
    map: cloneTex(f.map, 1, 1 / 8), emissiveMap: cloneTex(f.emissive, 1, 1 / 8),
    emissive: 0xffffff, emissiveIntensity: 0.5, metalness: 0.85, roughness: 0.16, envMapIntensity: 0.9,
  });
  const glass = new THREE.InstancedMesh(new THREE.BoxGeometry(10.5, fh - 0.35, 10.5), glassMat, floors);
  const slabs = new THREE.InstancedMesh(new THREE.BoxGeometry(11.1, 0.35, 11.1), metalDark, floors + 1);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  for (let i = 0; i <= floors; i++) {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(i * 3.4));
    p.set(0, 4 + i * fh, 0);
    m.compose(p, q, s); slabs.setMatrixAt(i, m);
    if (i < floors) { p.y += fh / 2; m.compose(p, q, s); glass.setMatrixAt(i, m); }
  }
  glass.castShadow = slabs.castShadow = true;
  g.add(glass, slabs);
  const lobby = glassBox(14, 4, 14, facadeTextures({ cols: 5, rows: 1, spandrel: false, lit: 0.85, glassTop: '#d9c08a', glassBottom: '#5b4524' }), { tileH: 4 });
  lobby.position.y = 2; g.add(lobby);
  const ring = shadowed(new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.35, 12, 48), gold));
  ring.rotation.x = Math.PI / 2; ring.position.y = 4 + floors * fh + 1.2; g.add(ring);
  const spire = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.9, 9, 12), gold));
  spire.position.y = 4 + floors * fh + 5; g.add(spire);
  g.add(aviationLight(4 + floors * fh + 9.6));
  const screen = brandScreen(g, pillar, { w: 9, h: 5, y: 12, z: 7.6, posts: 4 });
  return { group: g, depth: 15, height: 76, width: 14, screenAt: screen.at, update: screen };
}

// 03 Technology, AI & Digital: cantilevered blocks with LED media bands
function technology(pillar) {
  const g = new THREE.Group();
  const f = facadeTextures({ cols: 10, rows: 10, glassTop: '#5c7488', glassBottom: '#121c28', mullion: '#0d1117', lit: 0.25, warm: '#bfe3ff' });
  const base = glassBox(22, 14, 14, f, { tileW: 14, tileH: 36 });
  base.position.y = 7; g.add(base);
  const upper = glassBox(18, 11, 12, f, { tileW: 14, tileH: 36 });
  upper.position.set(3.5, 14 + 5.5, -0.5); g.add(upper);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(18.05, 11.05, 12.05)),
    new THREE.LineBasicMaterial({ color: 0xe8edf2 }));
  frame.position.copy(upper.position); g.add(frame);
  const led = ledScreen(1024, 64, { mode: 'data' });
  const ledMat = new THREE.MeshBasicMaterial({ map: led.texture, toneMapped: false });
  for (const [y, w, x, z] of [[4.2, 22, 0, 7.02], [13.3, 22, 0, 7.02], [24.6, 18, 3.5, 5.52]]) {
    const band = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.7), ledMat);
    band.position.set(x, y, z); g.add(band);
  }
  for (let i = 0; i < 5; i++) {
    const ant = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4 + i, 6), metalLight));
    ant.position.set(-4 + i * 1.6, 25 + (4 + i) / 2, -3); g.add(ant);
  }
  const dish = shadowed(new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3.2), metalLight));
  dish.material = metalLight; dish.rotation.x = -0.9; dish.position.set(7, 26.5, -2); g.add(dish);
  const screen = brandScreen(g, pillar, { w: 11, h: 6, x: 3.5, y: 19.5, z: 5.75 });
  return { group: g, depth: 14, height: 30, width: 22, screenAt: screen.at, update: (t) => { led.update(t); screen(t); } };
}

// 04 Corporate Legal Support: classical courthouse
function legal(pillar) {
  const g = new THREE.Group();
  const stone = stoneTexture();
  const mat = (w, h) => texturedMat(stone, w / 6, h / 6, { color: 0xffffff, roughness: 0.8 });
  for (let i = 0; i < 4; i++) {
    const step = solidBox(24 - i * 0.6, 0.38, 10 - i * 0.9, mat(24, 1));
    step.position.set(0, 0.19 + i * 0.38, 1.2 - i * 0.45); g.add(step);
  }
  const podium = solidBox(22, 1.2, 8, mat(22, 1.2)); podium.position.set(0, 2.1, -0.4); g.add(podium);
  const body = solidBox(22, 13, 12, mat(22, 13)); body.position.set(0, 9, -7); g.add(body);
  const colGeo = new THREE.CylinderGeometry(0.5, 0.58, 9.5, 24);
  const capGeo = new THREE.BoxGeometry(1.45, 0.5, 1.45);
  const colMat = mat(2, 9);
  for (let i = 0; i < 8; i++) {
    const x = -8.75 + i * 2.5;
    const col = shadowed(new THREE.Mesh(colGeo, colMat)); col.position.set(x, 2.7 + 4.75, 2.2); g.add(col);
    const cap = shadowed(new THREE.Mesh(capGeo, colMat)); cap.position.set(x, 2.7 + 9.75, 2.2); g.add(cap);
    const foot = shadowed(new THREE.Mesh(capGeo, colMat)); foot.position.set(x, 2.95, 2.2); g.add(foot);
  }
  const arch = solidBox(22, 1.6, 3.4, mat(22, 1.6)); arch.position.set(0, 13.5, 1.7); g.add(arch);
  const tri = new THREE.Shape();
  tri.moveTo(-11.2, 0); tri.lineTo(11.2, 0); tri.lineTo(0, 4.2); tri.closePath();
  const ped = shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 3.6, bevelEnabled: false }), mat(22, 4)));
  ped.position.set(0, 14.3, 0); g.add(ped);
  const winMat = new THREE.MeshStandardMaterial({ color: 0x141a21, roughness: 0.15, metalness: 0.8 });
  const frameMat = mat(2, 2);
  for (const x of [-7.5, -3.75, 3.75, 7.5]) {
    const fr = solidBox(2.1, 6.2, 0.2, frameMat); fr.position.set(x, 7.4, -0.92); g.add(fr);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 5.6), winMat); w.position.set(x, 7.4, -0.8); g.add(w);
  }
  const door = solidBox(3, 6, 0.3, new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 0.5 }));
  door.position.set(0, 5.7, -0.85); g.add(door);
  const screen = brandScreen(g, pillar, { w: 10, h: 5.6, y: 25.5, z: -2, posts: 15.5 });   // high enough to clear the pediment
  return { group: g, depth: 13, height: 19, width: 24, screenAt: screen.at, update: screen };
}

// 05 Smart Commercial Real Estate: mixed-use tower with balconies
function realEstate(pillar) {
  const g = new THREE.Group();
  const f = facadeTextures({ cols: 6, rows: 13, glassTop: '#c7d3dc', glassBottom: '#5b6b78', mullion: '#e9e6df', lit: 0.45, warm: '#ffcf96' });
  const tower = glassBox(15, 44, 12, f, { tileW: 15, tileH: 44, metal: 0.35, rough: 0.25 });
  tower.position.y = 5 + 22; g.add(tower);
  const retail = glassBox(18, 5, 14, facadeTextures({ cols: 6, rows: 1, spandrel: false, lit: 0.9 }), { tileW: 18, tileH: 5 });
  retail.position.y = 2.5; g.add(retail);
  const floors = 12, cols = 4;
  const slab = new THREE.InstancedMesh(new THREE.BoxGeometry(3.2, 0.22, 1.6), new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.6 }), floors * cols);
  const rail = new THREE.InstancedMesh(new THREE.BoxGeometry(3.2, 1.0, 0.05),
    new THREE.MeshPhysicalMaterial({ color: 0xbfd6e6, transmission: 0.6, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.45 }), floors * cols);
  const m = new THREE.Matrix4();
  let k = 0;
  for (let f2 = 0; f2 < floors; f2++) {
    for (let c = 0; c < cols; c++) {
      const x = -5.25 + c * 3.5, y = 8 + f2 * 3.4;
      m.makeTranslation(x, y, 6.8); slab.setMatrixAt(k, m);
      m.makeTranslation(x, y + 0.6, 7.55); rail.setMatrixAt(k, m); k++;
    }
  }
  slab.castShadow = true; g.add(slab, rail);
  const crown = solidBox(15.6, 1.4, 12.6, new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.6 }));
  crown.position.y = 49.7; g.add(crown);
  const screen = brandScreen(g, pillar, { w: 10, h: 5.4, y: 12.4, z: 8.3, posts: 0 });
  return { group: g, depth: 16, height: 51, width: 18, screenAt: screen.at, update: screen };
}

// 06 Global HR & Immigration: terminal hall with an arched roof and a globe
function hrImmigration(pillar) {
  const g = new THREE.Group();
  const hall = glassBox(26, 8, 16, facadeTextures({ cols: 10, rows: 2, spandrel: false, lit: 0.75, glassTop: '#b9cfdf', glassBottom: '#41596d' }), { tileW: 26, tileH: 8 });
  hall.position.y = 4; g.add(hall);
  const R = 22, a = 0.62;
  const arc = new THREE.Shape();
  arc.absarc(0, 0, R, Math.PI / 2 - a, Math.PI / 2 + a, false);
  arc.absarc(0, 0, R - 0.6, Math.PI / 2 + a, Math.PI / 2 - a, true);
  const roof = shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(arc, { depth: 19, bevelEnabled: false, curveSegments: 40 }), metalLight));
  roof.position.set(0, 8.2 - R * Math.cos(a) + 0.2, -9.5); g.add(roof);
  const globe = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const ring = shadowed(new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.06, 8, 64), gold));
    ring.rotation.y = (i / 6) * Math.PI; globe.add(ring);
  }
  for (const y of [-1.2, 0, 1.2]) {
    const r = Math.sqrt(2.4 * 2.4 - y * y);
    const lat = shadowed(new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 8, 64), gold));
    lat.rotation.x = Math.PI / 2; lat.position.y = y; globe.add(lat);
  }
  const ped = solidBox(1.6, 1.6, 1.6, new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.4 }));
  ped.position.set(-7, 0.8, 11); g.add(ped);
  globe.position.set(-7, 4.1, 11); globe.rotation.z = 0.41; g.add(globe);
  const screen = brandScreen(g, pillar, { w: 10, h: 5.6, x: 3, y: 16, z: 6, posts: 12.3 });
  return { group: g, depth: 16, height: 14, width: 26, screenAt: screen.at, update: (t) => { globe.rotation.y = t * 0.25; screen(t); } };
}

// 07 Brandora-S: tower with a giant LED billboard
function branding(pillar) {
  const g = new THREE.Group();
  const conc = concreteTexture('#d7d2ca');
  const body = solidBox(14, 38, 12, texturedMat(conc, 14 / 8, 38 / 8));
  body.position.y = 19; g.add(body);
  const f = facadeTextures({ cols: 8, rows: 10, lit: 0.35 });
  for (const x of [-7.02, 7.02]) {
    const strip = glassBox(0.1, 34, 9, f, { tileW: 12, tileH: 36 });
    strip.position.set(x, 19, -0.5); g.add(strip);
  }
  const screen = ledScreen(768, 980, { mode: 'brand' });
  const frame = solidBox(12.4, 15.4, 0.6, metalDark); frame.position.set(0, 25, 6.3); g.add(frame);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 14.6), new THREE.MeshBasicMaterial({ map: screen.texture, toneMapped: false }));
  panel.position.set(0, 25, 6.61); g.add(panel);
  const edge = new THREE.MeshBasicMaterial({ color: new THREE.Color(pillar.color).multiplyScalar(1.6), toneMapped: false });
  for (const [ex, ey, ew, eh] of [[0, 7.95, 12.6, 0.1], [0, -7.95, 12.6, 0.1], [6.45, 0, 0.1, 16], [-6.45, 0, 0.1, 16]]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(ew, eh, 0.12), edge);
    bar.position.set(ex, 25 + ey, 6.6); g.add(bar);
  }
  const lobby = glassBox(14.2, 5, 12.2, facadeTextures({ cols: 5, rows: 1, spandrel: false, lit: 0.9 }), { tileW: 14, tileH: 5 });
  lobby.position.y = 2.5; g.add(lobby);
  return { group: g, depth: 13, height: 38, width: 14, screenAt: panel.position.clone(), update: (t) => screen.update(t) };
}

// 08 Valora-S (trade & supply): warehouse, container stacks and a gantry crane
function trade(pillar) {
  const g = new THREE.Group();
  const corr = corrugatedTexture('#93a0ab');
  const shed = solidBox(26, 11, 18, texturedMat(corr, 26 / 3, 1, { metalness: 0.5, roughness: 0.5 }));
  shed.position.set(-4, 5.5, -4); g.add(shed);
  const roof = solidBox(27, 0.6, 19, metalDark); roof.position.set(-4, 11.3, -4); g.add(roof);
  const doorMat = texturedMat(corrugatedTexture('#c7ccd1'), 1, 1, { metalness: 0.4, roughness: 0.6 });
  for (const x of [-13, -7, -1, 5]) {
    const d = solidBox(4, 5, 0.2, doorMat); d.position.set(x, 2.5, 5.05); g.add(d);
  }
  // containers under the crane: length along Z, rows along X, stacked 1-3 high
  const palette = [0x1f4e79, 0xb3322d, 0xd9822b, 0x3a7d44, 0x8a8f96, 0x0f6e7a, 0xc9a24a];
  const cont = new THREE.InstancedMesh(new THREE.BoxGeometry(2.44, 2.59, 6.06),
    new THREE.MeshStandardMaterial({ map: corrugatedTexture('#ffffff'), roughness: 0.55, metalness: 0.3 }), 30);
  const m = new THREE.Matrix4(), col = new THREE.Color();
  let k = 0;
  for (const x of [11, 13.7, 16.4, 19.1]) {
    for (const z of [-10, -3.6]) {
      const h = 1 + Math.floor(random() * 3);
      for (let lvl = 0; lvl < h; lvl++) {
        m.makeTranslation(x, 1.3 + lvl * 2.6, z);
        cont.setMatrixAt(k, m);
        cont.setColorAt(k, col.setHex(palette[(random() * palette.length) | 0]));
        k++;
      }
    }
  }
  cont.count = k; cont.castShadow = true; cont.receiveShadow = true; g.add(cont);
  const yellow = new THREE.MeshStandardMaterial({ color: 0xe0b021, roughness: 0.5, metalness: 0.4 });
  for (const [x, z] of [[9, -13], [9, 2], [21, -13], [21, 2]]) {
    const leg = solidBox(0.6, 15, 0.6, yellow); leg.position.set(x, 7.5, z); g.add(leg);
  }
  for (const x of [9, 21]) { const beam = solidBox(0.7, 0.9, 16, yellow); beam.position.set(x, 15.2, -5.5); g.add(beam); }
  const top = solidBox(13, 1, 1, yellow); top.position.set(15, 15.4, -3); g.add(top);
  const trolley = solidBox(2, 1.2, 2, yellow); trolley.position.set(15, 14.4, -3); g.add(trolley);
  const cable = solidBox(0.08, 6, 0.08, metalDark); cable.position.set(15, 10.8, -3); g.add(cable);
  const screen = brandScreen(g, pillar, { w: 12, h: 6, x: -4, y: 15.2, z: 4.6, posts: 11.6 });
  return { group: g, depth: 18, height: 16, width: 26, screenAt: screen.at, update: (t) => { trolley.position.x = 15 + Math.sin(t * 0.3) * 4; cable.position.x = trolley.position.x; screen(t); } };
}

export const BUILDERS = [licensing, finance, technology, legal, realEstate, hrImmigration, branding, trade];
