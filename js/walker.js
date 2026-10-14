// A procedural businessman (1.80 m) with a walk/run cycle driven by distance travelled,
// so his feet never slide on the road. Faces +Z in local space.
import * as THREE from 'three';

const suit = new THREE.MeshStandardMaterial({ color: 0x1b2433, roughness: 0.78, metalness: 0.0 });
const suitDark = new THREE.MeshStandardMaterial({ color: 0x141b27, roughness: 0.82 });
const shirt = new THREE.MeshStandardMaterial({ color: 0xf1efe9, roughness: 0.6 });
const tie = new THREE.MeshStandardMaterial({ color: 0xb8913f, roughness: 0.45, metalness: 0.2 });
const skin = new THREE.MeshPhysicalMaterial({ color: 0xb98563, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color(0xffc7a8) });
const hair = new THREE.MeshStandardMaterial({ color: 0x1c1612, roughness: 0.9 });
const leather = new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.32, metalness: 0.05 });
const caseMat = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.45 });
const brass = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.3, metalness: 1 });

// Smooth tapered limb hanging down from its pivot (y = 0 .. -len)
function limb(r1, r2, len, mat, flatten = 1) {
  const pts = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI / 2;
    pts.push(new THREE.Vector2(Math.sin(a) * r1, Math.cos(a) * r1 * 0.6));
  }
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    const r = r1 + (r2 - r1) * t + Math.sin(t * Math.PI) * (r1 * 0.08);
    pts.push(new THREE.Vector2(r, -len * t));
  }
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI / 2;
    pts.push(new THREE.Vector2(Math.cos(a) * r2, -len - Math.sin(a) * r2 * 0.6));
  }
  const g = new THREE.LatheGeometry(pts, 24);
  g.scale(1, 1, flatten);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}

function pivot(parent, x, y, z) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  parent.add(p);
  return p;
}

export function createWalker() {
  const root = new THREE.Group();
  const hips = pivot(root, 0, 0.98, 0);

  // pelvis
  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.13, 6, 16), suitDark);
  pelvis.rotation.z = Math.PI / 2; pelvis.scale.set(1, 1, 0.82); pelvis.position.y = 0.02;
  pelvis.castShadow = true; hips.add(pelvis);

  // torso (jacket) as a lathe: waist → chest → shoulders
  const spine = pivot(hips, 0, 0.06, 0);
  const torsoPts = [
    [0.0, 0.0], [0.15, 0.0], [0.155, 0.08], [0.165, 0.2], [0.19, 0.34], [0.205, 0.43],
    [0.19, 0.5], [0.13, 0.545], [0.07, 0.56], [0.0, 0.565],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const torsoGeo = new THREE.LatheGeometry(torsoPts, 32);
  torsoGeo.scale(1.12, 1, 0.66);
  const torso = new THREE.Mesh(torsoGeo, suit);
  torso.castShadow = true; spine.add(torso);

  // shirt V, tie and lapels on the chest
  const v = new THREE.Mesh(new THREE.CircleGeometry(0.075, 3), shirt);
  v.rotation.z = -Math.PI / 2; v.scale.set(1.4, 0.75, 1); v.position.set(0, 0.47, 0.128); spine.add(v);
  const tieMesh = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.26, 0.01), tie);
  tieMesh.position.set(0, 0.36, 0.132); tieMesh.rotation.x = -0.12; spine.add(tieMesh);
  for (const s of [-1, 1]) {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.012), suitDark);
    lapel.position.set(0.045 * s, 0.4, 0.13); lapel.rotation.set(-0.1, 0, 0.35 * s); spine.add(lapel);
  }
  // jacket buttons
  for (let i = 0; i < 2; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), suitDark);
    b.position.set(0, 0.17 + i * 0.08, 0.103); spine.add(b);
  }

  // neck + head
  const neckP = pivot(spine, 0, 0.56, 0.0);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.09, 16), skin);
  neck.position.y = 0.035; neckP.add(neck);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.014, 8, 20), shirt);
  collar.rotation.x = Math.PI / 2; collar.position.y = 0.005; neckP.add(collar);
  const head = pivot(neckP, 0, 0.17, 0.01);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.105, 32, 24), skin);
  skull.scale.set(0.88, 1.12, 1.0); skull.castShadow = true; head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), skin);
  jaw.scale.set(1.0, 0.8, 1.0); jaw.position.set(0, -0.06, 0.03); head.add(jaw);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairCap.scale.set(0.9, 1.08, 1.04); hairCap.position.set(0, 0.012, -0.006); hairCap.rotation.x = -0.25; head.add(hairCap);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.045, 10), skin);
  nose.rotation.x = Math.PI / 2 + 0.3; nose.position.set(0, -0.005, 0.11); head.add(nose);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), skin);
    ear.scale.set(0.5, 1, 0.8); ear.position.set(0.093 * s, 0.0, 0.0); head.add(ear);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.01), hair);
    brow.position.set(0.033 * s, 0.035, 0.094); head.add(brow);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 8), suitDark);
    eye.position.set(0.032 * s, 0.017, 0.093); head.add(eye);
  }

  // arms
  const arms = {};
  for (const [name, s] of [['L', 1], ['R', -1]]) {
    const shoulder = pivot(spine, 0.215 * s, 0.47, -0.005);
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 12), suit);
    pad.scale.set(1.05, 0.8, 0.95); pad.castShadow = true; shoulder.add(pad);
    shoulder.add(limb(0.06, 0.05, 0.29, suit, 0.92));
    const elbow = pivot(shoulder, 0, -0.3, 0);
    elbow.add(limb(0.05, 0.042, 0.25, suit, 0.92));
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.02, 14), shirt);
    cuff.position.y = -0.255; elbow.add(cuff);
    const wrist = pivot(elbow, 0, -0.27, 0);
    const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.06, 4, 10), skin);
    hand.scale.set(0.75, 1, 1.15); hand.position.y = -0.055; hand.castShadow = true; wrist.add(hand);
    arms[name] = { shoulder, elbow, wrist };
  }

  // briefcase in the right hand
  const bc = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.42), caseMat);
  body.position.y = -0.2; body.castShadow = true; bc.add(body);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.009, 8, 16, Math.PI), leather);
  handle.rotation.y = Math.PI / 2; handle.position.y = -0.05; bc.add(handle);
  for (const z of [-0.12, 0.12]) {
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.025, 0.03), brass);
    latch.position.set(0, -0.08, z); bc.add(latch);
  }
  bc.position.y = -0.06; arms.R.wrist.add(bc);

  // legs
  const legs = {};
  for (const [name, s] of [['L', 1], ['R', -1]]) {
    const hip = pivot(hips, 0.095 * s, -0.02, 0);
    hip.add(limb(0.085, 0.062, 0.45, suitDark, 0.95));
    const knee = pivot(hip, 0, -0.45, 0);
    knee.add(limb(0.064, 0.05, 0.44, suitDark, 0.95));
    const ankle = pivot(knee, 0, -0.45, 0);
    const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.18, 4, 12), leather);
    shoe.rotation.x = Math.PI / 2; shoe.scale.set(1.05, 1, 0.75);
    shoe.position.set(0, -0.045, 0.06); shoe.castShadow = true; ankle.add(shoe);
    legs[name] = { hip, knee, ankle };
  }

  root.traverse((o) => { if (o.isMesh) o.receiveShadow = false; });

  const state = { phase: 0, amp: 0, run: 0, t: 0 };

  // speed in m/s (signed), dt in s
  function update(speed, dt) {
    state.t += dt;
    const s = Math.abs(speed);
    const targetAmp = Math.min(1, s / 1.1);
    const targetRun = THREE.MathUtils.clamp((s - 2.4) / 1.8, 0, 1);
    state.amp += (targetAmp - state.amp) * Math.min(1, dt * 6);
    state.run += (targetRun - state.run) * Math.min(1, dt * 3);
    const stride = THREE.MathUtils.lerp(1.5, 2.7, state.run);   // metres per full cycle
    state.phase += (s * dt / stride) * Math.PI * 2;

    const a = state.amp, r = state.run, p = state.phase;
    const hipA = THREE.MathUtils.lerp(0.42, 0.78, r) * a;
    const kneeA = THREE.MathUtils.lerp(1.05, 1.75, r) * a;
    const armA = THREE.MathUtils.lerp(0.32, 0.85, r) * a;

    for (const [name, off] of [['L', 0], ['R', Math.PI]]) {
      const ph = p + off;
      const leg = legs[name];
      leg.hip.rotation.x = -hipA * Math.sin(ph);
      const swing = Math.max(0, Math.cos(ph + 0.35));
      const stance = Math.max(0, Math.sin(ph - Math.PI / 2)) * 0.12;
      leg.knee.rotation.x = kneeA * swing * swing + stance * a;
      leg.ankle.rotation.x = (-0.22 * Math.sin(ph + 0.4) + 0.25 * swing) * a;
    }
    // arms swing against the legs; the briefcase arm swings less
    for (const [name, off, k] of [['L', 0, 1], ['R', Math.PI, 0.35]]) {
      const ph = p + off;
      const arm = arms[name];
      arm.shoulder.rotation.x = armA * k * Math.sin(ph);
      arm.shoulder.rotation.z = (name === 'L' ? 0.07 : -0.1);
      const bend = name === 'R' ? 0.12 : THREE.MathUtils.lerp(0.25, 1.45, r) + 0.25 * a * Math.max(0, -Math.sin(ph));
      arm.elbow.rotation.x = -bend;
    }
    // body motion
    const bob = THREE.MathUtils.lerp(0.022, 0.06, r) * a;
    hips.position.y = 0.98 + bob * Math.cos(2 * p) - 0.02 * r;
    hips.position.x = 0.018 * a * Math.sin(p - Math.PI / 2);
    hips.rotation.y = 0.09 * a * Math.sin(p);
    spine.rotation.y = -0.15 * a * Math.sin(p);
    spine.rotation.x = 0.04 * a + 0.16 * r;
    head.rotation.y = 0.05 * a * Math.sin(p);
    head.rotation.x = -0.05 * r;
    // idle breathing when standing
    const idle = 1 - a;
    spine.scale.y = 1 + 0.006 * idle * Math.sin(state.t * 1.7);
    arms.L.shoulder.rotation.x += idle * 0.04 * Math.sin(state.t * 0.9);
  }

  return { object: root, update };
}
