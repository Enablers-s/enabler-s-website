// Date palms along the boulevard: tapered ringed trunks, two tiers of fronds (plus a few dry ones),
// date clusters, stone planters, coloured uplights and strings of fairy lights.
import * as THREE from 'three';
import { barkTexture, frondTexture, random } from './textures.js';
import { lightBeams } from './night.js';

const H = 8.4;                                    // trunk height before scaling
const bend = (y) => Math.sin((y / 2.1) * 0.5) * 0.25;
const TOP = new THREE.Vector3(bend(H), H, 0);
const UPLIGHTS = [0xff4fa0, 0x31c6ff, 0xffb347, 0x8f6bff, 0x2fe0b0];
const FAIRY = [0xff5a8a, 0xffd34d, 0x4fd8ff, 0x9dff6a, 0xc77dff];
const LEAF = [0xc8d6a0, 0xa9c27a, 0xd6dc9a, 0x9fb86e, 0xb9cf86];
const DRY = [0xc9b27a, 0xb89a62];
const DATES = [0xd9822b, 0xc2571f, 0xe0a33a, 0x9c3b1b];

// tapered trunk with the knobbly rings left by old leaf bases
function trunkGeometry() {
  const g = new THREE.CylinderGeometry(1, 1, H, 14, 40, true);
  g.translate(0, H / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = y / H;
    const r = THREE.MathUtils.lerp(0.33, 0.21, t) * (1 + 0.08 * Math.max(0, Math.sin(y * 7.5)));
    p.setXYZ(i, x * r + bend(y), y, z * r);
  }
  g.computeVertexNormals();
  return g;
}

// frond with a drooping tip and a V-fold along the midrib
function frondGeometry() {
  const g = new THREE.PlaneGeometry(1.6, 4.8, 2, 14);
  g.translate(0, 2.4, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), t = p.getY(i) / 4.8;
    p.setX(i, x * (1 - t * 0.55));
    p.setZ(i, -t * t * 2.0 - Math.abs(x) * 0.35);
  }
  g.rotateX(-Math.PI / 2 + 0.55);
  g.computeVertexNormals();
  return g;
}

// Adds a per-instance coloured glow to a standard material (the uplight hitting it) and, for fronds,
// the breeze. heightFade: glow fades with local height (trunks are lit from below).
function patch(material, time, { sway = false, heightFade = 0 } = {}) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = 'uniform float uTime;\nattribute vec3 aGlow;\nvarying vec3 vGlow;\nvarying float vY;\n' +
      sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vGlow = aGlow; vY = position.y;
        ${sway ? `
        float tip = dot(transformed, transformed) * 0.012;
        float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.21;
        float gust = 0.7 + 0.3 * sin(uTime * 0.35 + ph * 0.2);
        transformed.y += sin(uTime * 1.6 + ph) * tip * gust;
        transformed.x += sin(uTime * 1.1 + ph * 1.3) * tip * 0.6 * gust;` : ''}`);
    sh.fragmentShader = 'varying vec3 vGlow;\nvarying float vY;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float fade = ${heightFade ? `1.0 - smoothstep(0.0, ${heightFade.toFixed(1)}, vY)` : '1.0'};
        totalEmissiveRadiance += vGlow * mix(diffuseColor.rgb, vec3(1.0), 0.45) * fade;`);
  };
}

// instanced mesh with a per-instance uplight colour (aGlow) for patch()
function instanced(geo, mat, count) {
  geo.setAttribute('aGlow', new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3));
  return new THREE.InstancedMesh(geo, mat, count);
}

// spots: [{ x, z, side, row }] palm positions. Returns { update(dt, pixelRatio) }.
export function createPalms(scene, spots, { reduceMotion }) {
  const time = { value: 0 };
  const N = spots.length;
  const OUTER = 12, INNER = 6, DRYN = 2, PER = OUTER + INNER + DRYN, CLUSTERS = 5, LIGHTS = 30;

  const bark = barkTexture(); bark.repeat.set(1, 4);
  const trunkMat = new THREE.MeshStandardMaterial({ map: bark, roughness: 0.95 });
  patch(trunkMat, time, { heightFade: 4.5 });
  const trunks = instanced(trunkGeometry(), trunkMat, N);

  const frondMat = new THREE.MeshStandardMaterial({ map: frondTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 });
  patch(frondMat, time, { sway: !reduceMotion });
  const fronds = instanced(frondGeometry(), frondMat, N * PER);

  const bootMat = new THREE.MeshStandardMaterial({ color: 0x5a4a2c, roughness: 0.95 });
  patch(bootMat, time);
  const boots = instanced(new THREE.SphereGeometry(0.5, 14, 10).scale(1, 0.85, 1), bootMat, N);

  const dateMat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 });
  patch(dateMat, time);
  const dates = instanced(new THREE.IcosahedronGeometry(0.17, 1).scale(1, 1.7, 1), dateMat, N * CLUSTERS);

  const planters = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.15, 1.25, 0.45, 28), new THREE.MeshStandardMaterial({ color: 0x8f877a, roughness: 0.85 }), N);
  const soil = new THREE.InstancedMesh(new THREE.CircleGeometry(1.02, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a1f16, roughness: 1 }), N);

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler(), c = new THREE.Color();
  const beams = [], lightPos = [], lightCol = [], lightSeed = [];
  let fi = 0, di = 0;
  const glowAttr = (mesh) => mesh.geometry.attributes.aGlow;

  spots.forEach((spot, i) => {
    const sc = 0.85 + random() * 0.35, rot = random() * Math.PI * 2;
    const uplight = new THREE.Color(UPLIGHTS[spot.row % UPLIGHTS.length]);
    const glow = uplight.clone().multiplyScalar(0.55);
    q.setFromEuler(e.set(0, rot, 0)); s.setScalar(sc); p.set(spot.x, 0.42, spot.z);
    trunks.setMatrixAt(i, m.compose(p, q, s));
    glowAttr(trunks).setXYZ(i, glow.r * 0.22, glow.g * 0.22, glow.b * 0.22);
    const top = TOP.clone().applyQuaternion(q).multiplyScalar(sc).add(p);
    boots.setMatrixAt(i, m.compose(top, q, s));
    glowAttr(boots).setXYZ(i, glow.r * 0.25, glow.g * 0.25, glow.b * 0.25);

    // fronds: an outer drooping ring, an inner upright tier of young leaves, and a couple of dry ones
    for (let k = 0; k < PER; k++) {
      const inner = k >= OUTER && k < OUTER + INNER, dry = k >= OUTER + INNER;
      const yaw = (k / (inner ? INNER : dry ? DRYN : OUTER)) * Math.PI * 2 + random() * 0.4 + (inner ? 0.3 : 0);
      const pitch = inner ? -0.95 + random() * 0.3 : dry ? 0.55 + random() * 0.2 : -0.15 + random() * 0.35;
      q2.setFromEuler(e.set(pitch, yaw, 0, 'YXZ'));
      const fs = sc * (inner ? 0.62 : dry ? 0.85 : 1);
      s.set(fs, fs * (0.85 + random() * 0.3), fs);
      fronds.setMatrixAt(fi, m.compose(top, q2, s));
      fronds.setColorAt(fi, c.setHex(dry ? DRY[(random() * DRY.length) | 0] : LEAF[(random() * LEAF.length) | 0]));
      const gk = inner ? 0.75 : dry ? 0.35 : 0.55;
      glowAttr(fronds).setXYZ(fi, glow.r * gk, glow.g * gk, glow.b * gk);
      fi++;
    }
    s.setScalar(sc);
    // date clusters hanging under the crown
    for (let k = 0; k < CLUSTERS; k++) {
      const a = rot + (k / CLUSTERS) * Math.PI * 2 + random() * 0.4;
      p.set(Math.cos(a) * 0.55 * sc, -0.75 * sc, Math.sin(a) * 0.55 * sc).add(top);
      q2.setFromEuler(e.set(Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25));
      dates.setMatrixAt(di, m.compose(p, q2, s.setScalar(sc * (0.8 + random() * 0.4))));
      dates.setColorAt(di, c.setHex(DATES[(random() * DATES.length) | 0]));
      glowAttr(dates).setXYZ(di, glow.r * 0.12, glow.g * 0.12, glow.b * 0.12);
      di++;
    }
    planters.setMatrixAt(i, m.makeTranslation(spot.x, 0.225, spot.z));
    soil.setMatrixAt(i, m.makeTranslation(spot.x, 0.43, spot.z));

    // the uplight beam rises from the planter on the road side of the trunk, leaning in
    beams.push({ x: spot.x - spot.side * 0.55, y: 0.45, z: spot.z, height: 7.5 * sc, spread: 1.3, color: uplight, tiltZ: spot.side * -0.08 });

    // fairy lights spiral up the trunk; every other palm is multicoloured, the rest warm white
    const multi = spot.row % 2 === 0;
    for (let j = 0; j < LIGHTS; j++) {
      const y = 0.7 + j * (H - 1.4) / LIGHTS, ang = j * 0.95;
      const r = THREE.MathUtils.lerp(0.33, 0.21, y / H) * 1.1 + 0.07;   // just outside the trunk's rings
      p.set(Math.cos(ang) * r + bend(y), y, Math.sin(ang) * r).applyQuaternion(q).multiplyScalar(sc).add(new THREE.Vector3(spot.x, 0.42, spot.z));
      lightPos.push(p.x, p.y, p.z);
      c.setHex(multi ? FAIRY[j % FAIRY.length] : 0xffd9a0);
      lightCol.push(c.r, c.g, c.b);
      lightSeed.push(random());
    }
  });

  for (const mesh of [trunks, fronds, boots, dates]) { mesh.castShadow = true; glowAttr(mesh).needsUpdate = true; }
  planters.castShadow = planters.receiveShadow = soil.receiveShadow = true;
  scene.add(trunks, fronds, boots, dates, planters, soil);
  lightBeams(scene, beams, { strength: 0.2 });

  // coloured light spilling onto the lawn around each planter
  const pc = document.createElement('canvas'); pc.width = pc.height = 128;
  const px = pc.getContext('2d'), pg = px.createRadialGradient(64, 64, 20, 64, 64, 64);
  pg.addColorStop(0, 'rgba(255,255,255,0.7)'); pg.addColorStop(1, 'rgba(255,255,255,0)');
  px.fillStyle = pg; px.fillRect(0, 0, 128, 128);
  const pool = new THREE.CanvasTexture(pc);
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(4.2, 4.2).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: pool, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }), N);
  spots.forEach((spot, i) => {
    pools.setMatrixAt(i, m.makeTranslation(spot.x, 0.13, spot.z));
    pools.setColorAt(i, c.setHex(UPLIGHTS[spot.row % UPLIGHTS.length]));
  });
  pools.renderOrder = 1;
  scene.add(pools);

  // fairy lights: twinkling points
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lightPos, 3));
  lg.setAttribute('aColor', new THREE.Float32BufferAttribute(lightCol, 3));
  lg.setAttribute('aSeed', new THREE.Float32BufferAttribute(lightSeed, 1));
  const fairyMat = new THREE.ShaderMaterial({
    uniforms: { uTime: time, uPx: { value: 1 } },
    vertexShader: `
      uniform float uTime; uniform float uPx;
      attribute vec3 aColor; attribute float aSeed;
      varying vec3 vC;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.55 + 0.45 * sin(uTime * (1.5 + aSeed * 2.5) + aSeed * 30.0);
        vC = aColor * tw * smoothstep(170.0, 50.0, -mv.z) * 1.6;
        gl_PointSize = clamp(110.0 / -mv.z, 2.0, 9.0) * uPx;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vC;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        gl_FragColor = vec4(vC * exp(-r * r * 4.0), 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const fairy = new THREE.Points(lg, fairyMat);
  fairy.frustumCulled = false;
  scene.add(fairy);

  let t = 0;
  return {
    update(dt, pixelRatio) {
      if (!reduceMotion) t += dt;
      time.value = t;
      fairyMat.uniforms.uPx.value = pixelRatio;
    },
  };
}
