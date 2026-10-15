// The scroll-driven 3D journey, seen through the eyes of a man walking down a boulevard at night.
// At each of the 8 buildings he stops and turns to face it, reading its billboard.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BUILDERS, billboard, BILLBOARD, monumentSign, blinkAviation, endMonument } from './buildings.js';
import { createAmbient } from './ambient.js';
import { createPalms } from './palms.js';
import { createPhoneHand } from './hand.js';
import { nightSky, lampLighting, billboardLighting, lightBeams, MOONLIGHT_DIR } from './night.js';
import { roadTexture, paverTexture, sandTexture, facadeTextures, random } from './textures.js';

const SPACING = 36;          // metres between buildings
const FIRST_Z = -34;         // first building
const START_Z = 6;           // walker start
const ROAD_HALF = 5, WALK_W = 4;
const EYE = 1.68;             // eye height
const PATH_X = -1.2;          // walks just left of the centre line, so the buildings on the right open up
const BOARD_ANGLE = 0.6;      // billboards turn ~35° from the road toward the approaching walker
const VIEW_DIST = 14.5;       // how far in front of a billboard he stands to read it

export function createJourney(canvas, pillars, contact) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowPower = matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency || 8) <= 4;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.25 : 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 2500);

  // ---- night sky, moonlight -------------------------------------------------------------------
  const sky = nightSky(scene, renderer);
  scene.fog = new THREE.Fog(0x0b1220, 70, 460);

  const moon = new THREE.DirectionalLight(0x9db4e6, 0.5);
  moon.castShadow = true;
  moon.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
  Object.assign(moon.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 420 });
  moon.shadow.bias = -0.0004;
  moon.shadow.normalBias = 0.04;
  scene.add(moon, moon.target);
  scene.add(new THREE.HemisphereLight(0x2a3a5c, 0x1a140f, 0.6));

  // ---- ground, road, sidewalks -------------------------------------------------
  const lastZ = FIRST_Z - (pillars.length - 1) * SPACING;
  const END_Z = lastZ - 34;
  const roadStart = START_Z + 60, roadEnd = END_Z - 220;
  const L = roadStart - roadEnd, midZ = (roadStart + roadEnd) / 2;

  const groundGeo = new THREE.PlaneGeometry(2400, 2400, 220, 220);
  groundGeo.rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    const away = THREE.MathUtils.smoothstep(Math.abs(x), 120, 320) + THREE.MathUtils.smoothstep(-z, 520, 900);
    const h = (Math.sin(x * 0.012 + z * 0.004) * 9 + Math.sin(x * 0.031 - z * 0.017) * 4 + Math.sin(z * 0.02) * 3) * Math.min(1, away);
    gp.setY(i, Math.max(0, h + 6 * away) - 0.02);
  }
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: sandTexture(), roughness: 1, color: 0xf0d7b5 }));
  ground.position.z = -200; ground.receiveShadow = true; scene.add(ground);

  const roadTex = roadTexture(); roadTex.repeat.set(1, L / 40);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, L), new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.62, metalness: 0 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.012, midZ); road.receiveShadow = true; scene.add(road);

  const paver = paverTexture(); paver.repeat.set(1, L / 4);
  const walkMat = new THREE.MeshStandardMaterial({ map: paver, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c6, roughness: 0.8 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x55703a, roughness: 1 });
  for (const s of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.BoxGeometry(WALK_W, 0.16, L), walkMat);
    walk.position.set(s * (ROAD_HALF + WALK_W / 2), 0.08, midZ); walk.receiveShadow = true; scene.add(walk);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, L), curbMat);
    curb.position.set(s * (ROAD_HALF + 0.14), 0.1, midZ); curb.receiveShadow = true; scene.add(curb);
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, L), grassMat);
    lawn.position.set(s * (ROAD_HALF + WALK_W + 1.25), 0.05, midZ); lawn.receiveShadow = true; scene.add(lawn);
  }

  // ---- street lamps (instanced) ---------------------------------------------------
  const lampZs = [];
  const nearStop = (z, r) => pillars.some((_, i) => Math.abs(z - (FIRST_Z - i * SPACING)) < r);
  // keep each billboard's sight line clear: no lamp between where he stands to read it and just past the board
  const inBoardView = (z) => pillars.some((_, i) => {
    const bz = FIRST_Z - i * SPACING + 3, fz = bz + Math.sin(BOARD_ANGLE) * VIEW_DIST;
    return z < fz + 4 && z > bz - 12;
  });
  for (let z = START_Z + 20; z > roadEnd + 40; z -= 26) if (!nearStop(z, 8) && !inBoardView(z)) lampZs.push(z);
  const lampN = lampZs.length * 2;
  const lampHeads = [];
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b2f35, metalness: 0.8, roughness: 0.4 });
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.12, 8, 10), poleMat, lampN);
  const arms = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.1, 0.1), poleMat, lampN);
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.12, 0.26), poleMat, lampN);
  const glows = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.5, 0.18).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd9a0, side: THREE.DoubleSide }), lampN);
  const m = new THREE.Matrix4();
  let li = 0;
  for (const z of lampZs) for (const s of [-1, 1]) {
    const x = s * (ROAD_HALF + 0.7);
    m.makeTranslation(x, 4, z); poles.setMatrixAt(li, m);
    m.makeTranslation(x - s * 0.85, 7.95, z); arms.setMatrixAt(li, m);
    m.makeTranslation(x - s * 1.55, 7.85, z); heads.setMatrixAt(li, m);
    m.makeTranslation(x - s * 1.55, 7.785, z); glows.setMatrixAt(li, m);
    lampHeads.push(new THREE.Vector3(x - s * 1.55, 7.785, z));
    li++;
  }
  poles.castShadow = arms.castShadow = true;
  glows.material.toneMapped = false;
  // lamps switch on one after another as the page opens, each with a short flicker
  const lampOnAt = Array.from({ length: lampN }, () => 0.2 + random() * 1.4);
  const lampLevel = new Float32Array(lampN);
  const lampCol = new THREE.Color();
  // warm pools of light on the ground under each lamp (the far ones have no real light)
  const pool = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 2, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,214,150,0.9)'); g.addColorStop(0.5, 'rgba(255,190,120,0.3)'); g.addColorStop(1, 'rgba(255,180,110,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: pool, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), lampN);
  li = 0;
  for (const z of lampZs) for (const s of [-1, 1]) { m.makeTranslation(s * (ROAD_HALF - 0.85), 0.2, z); pools.setMatrixAt(li++, m); }
  pools.renderOrder = 1;
  pools.material.opacity = 0.5;
  for (let i = 0; i < lampN; i++) { glows.setColorAt(i, lampCol.setScalar(0.3)); pools.setColorAt(i, lampCol.setScalar(0)); }
  function updateLamps(t) {
    for (let i = 0; i < lampN; i++) {
      const s = t - lampOnAt[i];
      const k = s < 0 ? 0 : s > 0.75 ? 1 : (Math.sin(s * 85 + i * 7) > 0.2 ? 0.9 : 0.1);
      lampLevel[i] = k;
      glows.setColorAt(i, lampCol.setScalar(0.3 + k * 3.7));
      pools.setColorAt(i, lampCol.setScalar(k));
    }
    glows.instanceColor.needsUpdate = pools.instanceColor.needsUpdate = true;
  }
  scene.add(poles, arms, heads, glows, pools);

  // ---- date palms ---------------------------------------------------------------------------
  const palmSpots = [];
  let row = 0;
  for (let z = START_Z + 7; z > roadEnd + 40; z -= 13, row++) for (const side of [-1, 1]) {
    if (side > 0 && nearStop(z, 9)) continue;   // keep building frontages clear
    palmSpots.push({ x: side * (ROAD_HALF + WALK_W + 1.25), z, side, row });
  }
  const palms = createPalms(scene, palmSpots, { reduceMotion });

  // ---- distant skyline -------------------------------------------------------------
  const skyF = facadeTextures({ cols: 6, rows: 20, glassTop: '#55687a', glassBottom: '#232d38', lit: 0.4 });
  const skyline = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({
    map: skyF.map, emissiveMap: skyF.emissive, emissive: 0xffffff, emissiveIntensity: 0.35, metalness: 0.7, roughness: 0.2,
  }), 110);
  const tq = new THREE.Quaternion(), tp = new THREE.Vector3(), ts = new THREE.Vector3(), e = new THREE.Euler();
  for (let i = 0; i < 110; i++) {
    const s = random() < 0.5 ? -1 : 1;
    const h = 20 + Math.pow(random(), 2) * 110;
    tp.set(s * (95 + random() * 170), h / 2, START_Z - 80 - random() * (L - 160));
    ts.set(10 + random() * 14, h, 10 + random() * 14);
    tq.setFromEuler(e.set(0, random() * 0.5, 0));
    skyline.setMatrixAt(i, m.compose(tp, tq, ts));
  }
  scene.add(skyline);

  // ---- a row of ordinary office blocks on the left, opposite the eight brand buildings ---------------
  const fillF = facadeTextures({ cols: 8, rows: 16, glassTop: '#8fa6b8', glassBottom: '#2a3a4a', lit: 0.45 });
  const fillRoof = new THREE.MeshStandardMaterial({ color: 0x3c3f44, roughness: 0.9 });
  for (let z = START_Z - 16; z > END_Z - 10; z -= 30 + random() * 10) {
    const w = 14 + random() * 8, d = 12 + random() * 6, h = 16 + Math.pow(random(), 1.5) * 48;
    const tex = (t) => { const c = t.clone(); c.repeat.set(w / 12, h / 57.6); c.needsUpdate = true; return c; };
    const mat = new THREE.MeshStandardMaterial({ map: tex(fillF.map), emissiveMap: tex(fillF.emissive), emissive: 0xffffff, emissiveIntensity: 0.45, metalness: 0.6, roughness: 0.22 });
    const block = new THREE.Mesh(new THREE.BoxGeometry(d, h, w), [mat, mat, fillRoof, fillRoof, mat, mat]);
    block.position.set(-(ROAD_HALF + WALK_W + 3.5 + d / 2), h / 2, z);
    block.castShadow = block.receiveShadow = true;
    scene.add(block);
  }

  // ---- the 8 buildings ---------------------------------------------------------------
  const stops = [];
  const animated = [];
  const boards = [];
  const brandBeams = [];
  pillars.forEach((p, i) => {
    const b = BUILDERS[i](p);
    const side = 1;                           // every building on the right, so its billboard is in view as he walks
    const z = FIRST_Z - i * SPACING;
    const front = ROAD_HALF + WALK_W + 3.5;
    b.group.position.set(side * (front + b.depth / 2), 0, z);
    b.group.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    scene.add(b.group);
    // brand colour: windows take a tint of it, and beams of it wash up the frontage
    const brand = new THREE.Color(p.color);
    b.group.traverse((o) => {
      for (const mat of [].concat(o.material || [])) if (mat.isMeshStandardMaterial && mat.emissiveMap) mat.emissive.lerp(brand, 0.28);
    });
    const faceX = side * (front - 0.4);
    for (let k = 0; k < 4; k++) {
      const along = (k / 3 - 0.5) * Math.min(b.width, 20);
      brandBeams.push({ x: faceX, y: 0.05, z: z + along, height: Math.min(b.height * 0.7, 26), spread: 2.2, color: brand, tiltZ: side * -0.05 });
    }
    // the billboard stands a little ahead of the building, angled toward the approaching walker
    const board = billboard(i + 1, p, contact);
    const bx = ROAD_HALF + WALK_W + 0.6, bz = z + 3;
    board.group.position.set(bx, 0, bz);
    board.group.rotation.y = -Math.PI / 2 + BOARD_ANGLE;
    const nx = -Math.cos(BOARD_ANGLE), nz = Math.sin(BOARD_ANGLE);   // the way the screen faces
    scene.add(board.group);
    animated.push(board.update);
    boards.push(board);
    for (const h of board.hit) h.userData.stop = i;
    const sign = monumentSign(i + 1, p.title, p.brand, p.color);
    sign.position.set(side * (ROAD_HALF + WALK_W + 2.9), 0, z - 9.5);   // just past the building's centre
    sign.rotation.y = b.group.rotation.y;
    scene.add(sign);
    // building screens are canvas-drawn, so only animate the ones near the walker
    if (b.update) animated.push((t) => { if (Math.abs(camera.position.z - z) < 110) b.update(t); });
    // he stops where the billboard faces him square on
    const fz = bz + nz * VIEW_DIST;
    b.group.updateMatrixWorld(true);
    const hoarding = b.group.localToWorld(b.screenAt.clone());   // the building's brand screen
    stops.push({ z, fz, side, height: b.height, distance: START_Z - fz, x: side * (front + b.depth / 2), bx, bz, by: board.centerY, nx, nz, hoarding });
  });

  lightBeams(scene, brandBeams, { strength: 0.13 });

  // ---- the Enabler-S mark at the end of the boulevard ------------------------------------------------
  const finale = endMonument();
  finale.group.position.set(0, 0, END_Z - 24);
  scene.add(finale.group);

  // ---- night lighting --------------------------------------------------------------------------
  // lit windows glow brighter after dark
  scene.traverse((o) => {
    for (const mat of [].concat(o.material || [])) {
      if (mat.isMeshStandardMaterial && mat.emissiveMap && !mat.userData.lit) { mat.emissiveIntensity *= 2.6; mat.userData.lit = true; }
    }
  });
  const lamps = lampLighting(scene, lampHeads, lampLevel, { realLights: lowPower ? 4 : 8 });
  const boardLevels = new Float32Array(boards.length);
  const boardLights = billboardLighting(scene, stops.map((s, i) => ({ x: s.bx, z: s.bz, side: s.side, color: pillars[i].color })));

  const ambient = createAmbient(scene, { reduceMotion });

  // ---- the walker's phone ------------------------------------------------------------------
  const hand = createPhoneHand();
  camera.add(hand.object);
  scene.add(camera);

  // ---- hover and click on billboards (and the phone) ------------------------------------------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pickables = [...boards.flatMap((b) => b.hit), hand.hit];
  let hovered = -1, hoverDirty = false;
  const pick = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    camera.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    if (!hit) return -1;
    if (hit.object !== hand.hit) return hit.object.userData.stop;
    return current >= 0 ? current : next >= 0 ? next : -2;   // -2: past the last building, restart
  };
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { lastPointer = e; hoverDirty = true; } });
  canvas.addEventListener('pointerleave', () => { lastPointer = null; hoverDirty = true; });
  canvas.addEventListener('click', (e) => { const i = pick(e); if (i !== -1) api.onSelect?.(i); });
  let lastPointer = null;
  function updateHover() {
    if (!hoverDirty) return;
    hoverDirty = false;
    const i = lastPointer ? pick(lastPointer) : -1;
    if (i === hovered) return;
    boards[hovered]?.setHover(false);
    boards[i]?.setHover(true);
    hovered = i;
    canvas.style.cursor = i !== -1 ? 'pointer' : '';
  }

  // ---- post-processing -------------------------------------------------------------------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.65, 0.6, 0.85);
  if (!lowPower) composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---- first-person camera rig ------------------------------------------------------------------
  const pathLength = START_Z - END_Z;
  const pos = new THREE.Vector3();
  const view = { yaw: 0, pitch: 0 };            // smoothed head orientation
  const look = { yaw: 0, pitch: 0 };            // where the head wants to point this frame
  const maxX = ROAD_HALF + WALK_W - 0.6;
  let first = true;

  const lerpAngle = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

  // How strongly the walker is facing stop s (0 = looking down the street, 1 = facing the building).
  // He starts turning ~13 m before a building and turns back quickly once past it.
  // HOARDING_AT: metres before the stop where he pauses to read the brand screen; the scroll lingers there too.
  const HOARDING_AT = 2.5;
  const faceWeight = (wz, s) => {
    const dz = wz - s.fz;
    return 1 - THREE.MathUtils.smoothstep(Math.abs(dz), 1.2, dz > 0 ? 13 : 7);
  };

  function cameraTarget(wz, dist, aspect) {
    pos.set(PATH_X, EYE, wz);
    look.yaw = -0.07; look.pitch = 0.05;          // a slight lean toward the buildings on the right

    for (const s of stops) {
      const w = faceWeight(wz, s);
      if (w <= 0) continue;
      // step back across the road so the billboard sits in the middle half of the view with the building
      // above it; narrow screens step back further, until the whole billboard fits
      const hHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect);
      const need = Math.max(14.5, (BILLBOARD.width / 2 + 0.6) / Math.tan(hHalf));
      const standX = THREE.MathUtils.clamp(Math.min(PATH_X, s.bx + s.nx * need), -maxX, maxX);
      pos.x = THREE.MathUtils.lerp(pos.x, standX, w);
      // first the brand hoarding on the building, then square on to the billboard
      const dx = s.bx - pos.x, dy = s.by + 1.2 - EYE, dz = s.bz - wz;
      const hx = s.hoarding.x - pos.x, hy = s.hoarding.y - EYE, hz = s.hoarding.z - wz;
      const onBrand = THREE.MathUtils.smoothstep(wz - s.fz, 0.8, HOARDING_AT - 0.7);
      const yaw = lerpAngle(Math.atan2(-dx, -dz), Math.atan2(-hx, -hz), onBrand);
      const pitch = THREE.MathUtils.lerp(Math.atan2(dy, Math.hypot(dx, dz)), Math.atan2(hy, Math.hypot(hx, hz)), onBrand);
      look.yaw = lerpAngle(look.yaw, yaw, w);
      look.pitch = THREE.MathUtils.lerp(look.pitch, pitch, w);
    }

    // opening: a raised view down the boulevard that settles to eye level
    const intro = 1 - THREE.MathUtils.smoothstep(dist, 0, 14);
    if (intro > 0) {
      pos.y += 4.2 * intro;
      look.yaw = lerpAngle(look.yaw, -0.12, intro);
      look.pitch = THREE.MathUtils.lerp(look.pitch, 0.02, intro);
    }
    // closing: rise above the street
    const outro = THREE.MathUtils.smoothstep(dist, pathLength - 22, pathLength);
    if (outro > 0) {
      pos.y += 20 * outro; pos.z += 14 * outro;
      look.pitch = THREE.MathUtils.lerp(look.pitch, -0.44, outro);   // emblem monument framed above the closing text
    }
  }

  // a touch of mouse look on desktop
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  // ---- state & loop ----------------------------------------------------------------------------
  let target = 0, dist = 0, running = true, last = performance.now(), elapsed = 0;
  let velocity = 0, current = -1, next = 0;
  const startedAt = performance.now();

  function updatePhone(d, wz) {
    const tag = (i) => `${String(i + 1).padStart(2, '0')} / 08 · ${pillars[i].brand.toUpperCase()}`;
    if (d < 6) hand.draw({ kicker: 'WELCOME', title: 'Eight pillars. One partner.', sub: 'Scroll to walk the boulevard. Tap any billboard for details.' });
    else if (current >= 0) hand.draw({ kicker: tag(current), title: pillars[current].title, sub: `${pillars[current].services.length} services · tap the billboard`, cta: 'Tap for details' });
    else if (next >= 0) hand.draw({ kicker: `NEXT · ${Math.max(1, Math.round(wz - stops[next].z))} M`, title: pillars[next].title, sub: pillars[next].line });
    else hand.draw({ kicker: 'YOU\'VE SEEN IT ALL', title: 'Where strategy meets execution', sub: contact.email, cta: '↺ Walk again' });
  }
  const MAX_SPEED = 5;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 1 ? 55 : 42;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  function frame(now) {
    if (!running) return;
    const dt = THREE.MathUtils.clamp((now - last) / 1000, 0, 0.05);   // rAF time can precede performance.now()
    last = now; elapsed += dt;

    // glide toward the scroll target on a critically damped spring: eases in and out,
    // never overshoots, and turns jerky wheel steps into one smooth motion
    const SPRING = 2.6;
    velocity += ((target - dist) * SPRING * SPRING - velocity * 2 * SPRING) * dt;
    velocity = THREE.MathUtils.clamp(velocity, -MAX_SPEED, MAX_SPEED);
    dist = THREE.MathUtils.clamp(dist + velocity * dt, 0, pathLength);
    const speed = velocity;
    const wz = START_Z - dist;

    cameraTarget(wz, dist, camera.aspect);

    pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 3);
    pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 3);
    const k = first ? 1 : 1 - Math.exp(-dt * 3);
    view.yaw = lerpAngle(view.yaw, look.yaw - pointer.sx * 0.08, k);
    view.pitch += (look.pitch - pointer.sy * 0.05 - view.pitch) * k;
    first = false;
    camera.position.copy(pos);
    camera.rotation.set(view.pitch, view.yaw, 0, 'YXZ');

    // which building he is facing, and the next one ahead
    current = -1; next = -1;
    let facing = 0;
    stops.forEach((s, i) => {
      const w = faceWeight(wz, s);
      if (w > facing) facing = w;
      if (w > 0.6) current = i;
      if (next < 0 && s.fz < wz - 1.2) next = i;
    });
    updateLamps((now - startedAt) / 1000);
    lamps.update(camera.position, { pixelRatio: renderer.getPixelRatio(), viewHeight: canvas.clientHeight, fov: camera.fov });
    boards.forEach((b, i) => { boardLevels[i] = b.level; });
    boardLights.update(boardLevels);
    sky.update(camera.position);
    stops.forEach((s, i) => {
      if (wz - s.z < 55) boards[i].wake();   // screens power on as he approaches
      boards[i].active = wz - s.bz < 90 && s.bz - wz < 30;   // and only animate while near
    });
    blinkAviation(elapsed);
    finale.update(elapsed, 1);
    ambient.update(dt, { cam: camera.position, pixelRatio: renderer.getPixelRatio() });
    palms.update(dt, renderer.getPixelRatio());
    updatePhone(dist, wz);
    hand.update(dt, { raised: facing, fov: camera.fov, aspect: camera.aspect });
    hand.object.visible = dist < pathLength - 10;
    if (Math.abs(speed) > 0.05) hoverDirty = true;     // the scene moves under a still cursor
    updateHover();

    v.set(pos.x, 0, wz);
    moon.position.copy(v).addScaledVector(MOONLIGHT_DIR, 160);
    moon.target.position.copy(v);

    for (const u of animated) u(elapsed);
    composer.render(dt);
    api.onFrame?.(dist, speed);
    requestAnimationFrame(frame);
  }

  const v = new THREE.Vector3();
  const api = {
    stops, pathLength, hoardingAt: HOARDING_AT,
    setTarget(d) { target = THREE.MathUtils.clamp(d, 0, pathLength); },
    jump(d) { target = dist = THREE.MathUtils.clamp(d, 0, pathLength); velocity = 0; first = true; },
    get distance() { return dist; },
    get current() { return current; },
    // back to the start: screens go dark again so they power on as he walks
    reset() { boards.forEach((b) => b.sleep()); api.jump(0); },
    onSelect: null,
    pause() { running = false; },
    resume() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } },
    onFrame: null,
  };
  requestAnimationFrame(frame);
  return api;
}
