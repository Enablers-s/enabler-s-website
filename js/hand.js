// The walker's right hand holding a phone, drawn in camera space at the bottom right of the view.
// It rides low while walking and lifts into view when he stops at a building.
import * as THREE from 'three';
import { phoneScreen } from './textures.js';

const skin = new THREE.MeshStandardMaterial({ color: 0xb98462, roughness: 0.62 });
const sleeve = new THREE.MeshStandardMaterial({ color: 0x18202c, roughness: 0.85 });
const cuff = new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.7 });
const body = new THREE.MeshStandardMaterial({ color: 0x1c1f24, metalness: 0.7, roughness: 0.3 });

function capsule(r, len, mat, x, y, z, rz = 0, rx = 0) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), mat);
  m.position.set(x, y, z); m.rotation.set(rx, 0, rz);
  return m;
}

export function createPhoneHand() {
  const screen = phoneScreen();
  const rig = new THREE.Group();          // positioned each frame
  const hand = new THREE.Group();         // the hand and phone, tilted toward the eye
  rig.add(hand);

  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.152, 0.009), body);
  hand.add(phone);
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.142),
    new THREE.MeshBasicMaterial({ map: screen.texture, toneMapped: false, color: 0xdedede }));
  display.position.z = 0.0047; hand.add(display);

  // palm behind the phone, thumb on the left edge, fingers curling round the right edge
  const palm = capsule(0.03, 0.045, skin, 0.012, -0.045, -0.022);
  palm.scale.z = 0.55; hand.add(palm);
  hand.add(capsule(0.0105, 0.04, skin, -0.041, -0.03, 0.002, 0.55));
  for (let i = 0; i < 3; i++) hand.add(capsule(0.0088, 0.022, skin, 0.043, 0.012 - i * 0.025, -0.004, Math.PI / 2 - 0.15));
  // wrist, cuff and sleeve running out of frame
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.027, 0.06, 14), skin);
  wrist.position.set(0.02, -0.1, -0.03); wrist.rotation.z = 0.32; hand.add(wrist);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 16), cuff);
  c.position.set(0.032, -0.135, -0.034); c.rotation.z = 0.32; hand.add(c);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.046, 0.34, 16), sleeve);
  s.position.set(0.085, -0.3, -0.05); s.rotation.z = 0.32; hand.add(s);

  hand.rotation.set(-0.28, -0.18, 0.1);
  rig.traverse((o) => { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; o.renderOrder = 10; });

  let raise = 0, raiseV = 0, pulse = 0, shown = '';
  return {
    object: rig,
    hit: display,
    draw(o) {
      // a new screen (not just the distance ticking down) gets a small buzz and brighten
      const k = o.title + o.cta;
      if (k !== shown) { if (shown) pulse = 1; shown = k; }
      screen.draw(o);
    },
    // raised: 0..1 how far the phone is lifted
    update(dt, { raised, fov, aspect }) {
      // springy lift with a slight overshoot
      raiseV += ((raised - raise) * 38 - raiseV * 7.5) * dt;
      raise += raiseV * dt;
      pulse = Math.max(0, pulse - dt * 2.2);
      hand.rotation.z = 0.1 + Math.sin(pulse * Math.PI * 4) * 0.045 * pulse;
      display.material.color.setScalar(0.87 + 0.13 * pulse);
      const d = 0.85;
      const halfH = d * Math.tan(THREE.MathUtils.degToRad(fov / 2));
      const halfW = halfH * aspect;
      const x = Math.min(halfW * 0.8, halfW - 0.06);
      const y = -halfH + THREE.MathUtils.lerp(0.025, 0.07, raise);
      rig.position.set(x, y, -d);
      hand.rotation.x = -0.28 - 0.12 * (1 - raise);
    },
  };
}
