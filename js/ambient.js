// Twinkling stars over the night scene. (The palms sway in palms.js.)
import * as THREE from 'three';
import { random } from './textures.js';

const time = { value: 0 };

export function createAmbient(scene, { reduceMotion }) {
  // ---- stars on the upper sky, twinkling ---------------------------------------------------------
  const STARS = 1400;
  const sp = new Float32Array(STARS * 3), ss = new Float32Array(STARS);
  for (let i = 0; i < STARS; i++) {
    const u = random(), v = 0.04 + random() * 0.96;          // keep stars above the horizon haze
    const th = u * Math.PI * 2, y = v, r = Math.sqrt(1 - y * y);
    sp[i * 3] = Math.cos(th) * r * 1500; sp[i * 3 + 1] = y * 1500; sp[i * 3 + 2] = Math.sin(th) * r * 1500;
    ss[i] = random();
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  starGeo.setAttribute('aSeed', new THREE.BufferAttribute(ss, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uTime: time, uOpacity: { value: 1 }, uPx: { value: 1 } },
    vertexShader: `
      uniform float uTime; uniform float uPx; attribute float aSeed; varying float vB;
      void main() {
        vB = (0.35 + 0.65 * aSeed) * (0.7 + 0.3 * sin(uTime * (1.0 + aSeed * 3.0) + aSeed * 40.0));
        vB *= smoothstep(0.0, 0.25, normalize(position).y);
        gl_PointSize = (1.0 + aSeed * 1.8) * uPx;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uOpacity; varying float vB;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(vec3(1.4, 1.4, 1.55) * vB, smoothstep(0.5, 0.1, d) * uOpacity);
      }`,
    transparent: true, depthWrite: false, fog: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  stars.renderOrder = -1;
  scene.add(stars);

  let t = 0;
  return {
    update(dt, { cam, pixelRatio }) {
      if (!reduceMotion) t += dt;
      time.value = t;
      starMat.uniforms.uPx.value = pixelRatio;
      stars.position.copy(cam);
    },
  };
}
