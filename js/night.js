// Night lighting: a sky dome with a moon and city glow on the horizon, real light from the street
// lamps nearest the walker, visible lamp cones and glare, and the billboards' glow on the pavement.
import * as THREE from 'three';

const deg = THREE.MathUtils.degToRad;
// moon ahead of the walker and a little to the left, high enough to sit in view down the boulevard
export const MOON_DIR = new THREE.Vector3().setFromSphericalCoords(1, deg(90 - 17), deg(180 + 20));
// The moonlight itself falls from high behind the walker: from ahead, the glass towers would mirror
// it straight back at him as hot spots. Nobody reads the direction of moon shadows.
export const MOONLIGHT_DIR = new THREE.Vector3().setFromSphericalCoords(1, deg(90 - 42), deg(25));
const LAMP_COLOR = 0xffc98a;

function radialTexture(stops, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---- sky ---------------------------------------------------------------------------------------
function skyMaterial({ moon = true } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uMoon: { value: MOON_DIR }, uMoonOn: { value: moon ? 1 : 0 } },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uMoon; uniform float uMoonOn; varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 horizon = vec3(0.075, 0.05, 0.06);     // warm glow of the city on the haze
        vec3 mid = vec3(0.012, 0.02, 0.045);
        vec3 zenith = vec3(0.002, 0.005, 0.014);
        vec3 col = mix(horizon, mid, smoothstep(-0.02, 0.2, h));
        col = mix(col, zenith, smoothstep(0.2, 0.8, h));
        if (h < 0.0) col = horizon * 0.5;
        float m = max(dot(d, normalize(uMoon)), 0.0);
        col += vec3(0.5, 0.58, 0.75) * (pow(m, 40.0) * 0.05 + pow(m, 400.0) * 0.12) * uMoonOn;   // halo
        col += vec3(2.4, 2.35, 2.2) * smoothstep(0.99976, 0.99986, m) * uMoonOn;                // disc
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
}

export function nightSky(scene, renderer) {
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1800, 48, 24), skyMaterial());
  dome.renderOrder = -2;
  dome.frustumCulled = false;
  scene.add(dome);
  // reflections come from the same night sky, minus the moon (it mirrors as hot spots in the glass towers)
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMaterial({ moon: false })));
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(envScene, 0.04).texture;
  return { update(cam) { dome.position.copy(cam); } };
}

// ---- street lamps ------------------------------------------------------------------------------
// heads: lamp head positions. levels: 0..1 per lamp (lets lamps flicker on).
export function lampLighting(scene, heads, levels, { realLights }) {
  // visible cones of light under each lamp
  const coneGeo = new THREE.CylinderGeometry(0.22, 3.4, 7.7, 28, 1, true);
  coneGeo.translate(0, -7.7 / 2, 0);
  const cones = new THREE.InstancedMesh(coneGeo, new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(LAMP_COLOR) }, uStrength: { value: 0.11 } },
    vertexShader: `
      varying float vH; varying float vF; varying float vL;
      void main() {
        vec4 p = vec4(position, 1.0);
        vec3 n = normal;
        vL = 1.0;
        #ifdef USE_INSTANCING
          p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vL = instanceColor.r;
        #endif
        vec4 mv = modelViewMatrix * p;
        vF = abs(dot(normalize(normalMatrix * n), normalize(-mv.xyz)));
        vH = uv.y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uStrength;
      varying float vH; varying float vF; varying float vL;
      void main() {
        float a = pow(vH, 1.6) * pow(vF, 2.2) * uStrength * vL;
        gl_FragColor = vec4(uColor * a, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }), heads.length);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  heads.forEach((h, i) => { cones.setMatrixAt(i, m.makeTranslation(h.x, h.y - 0.05, h.z)); cones.setColorAt(i, c.setScalar(0)); });
  cones.renderOrder = 2;
  scene.add(cones);

  // glare around each lamp head; capped in size and faded out when a lamp is right overhead
  const glareGeo = new THREE.BufferGeometry().setFromPoints(heads.map((h) => h.clone().setY(h.y - 0.12)));
  glareGeo.setAttribute('aLevel', new THREE.BufferAttribute(new Float32Array(heads.length), 1));
  const glare = new THREE.Points(glareGeo, new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0xffd6a0) }, uPx: { value: 1 }, uScale: { value: 600 } },
    vertexShader: `
      uniform float uPx; uniform float uScale; attribute float aLevel; varying float vL;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float d = -mv.z;
        gl_PointSize = min(1.7 * uScale / d, 80.0) * uPx;
        vL = aLevel * smoothstep(4.0, 10.0, d);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vL;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float g = exp(-r * r * 9.0) * 0.9 + exp(-r * 3.5) * 0.25;
        gl_FragColor = vec4(uColor * g * vL * (1.0 - smoothstep(0.85, 1.0, r)), 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  glare.frustumCulled = false;
  glare.renderOrder = 3;
  scene.add(glare);

  // real light only from the lamps around the walker; the pool is reassigned as he moves and
  // each light fades with distance, so the hand-over is never visible
  // downlights, like the real fixtures: they light the street, not the glass high above it
  const lights = Array.from({ length: realLights }, () => {
    const l = new THREE.SpotLight(LAMP_COLOR, 0, 30, THREE.MathUtils.degToRad(62), 0.75, 2);
    scene.add(l, l.target);
    return l;
  });
  const order = heads.map((_, i) => i), dist = new Float32Array(heads.length), focus = new THREE.Vector3();

  return {
    update(cam, { pixelRatio, viewHeight, fov }) {
      const lv = glareGeo.attributes.aLevel;
      heads.forEach((_, i) => { cones.setColorAt(i, c.setScalar(levels[i])); lv.setX(i, levels[i]); });
      cones.instanceColor.needsUpdate = true;
      lv.needsUpdate = true;
      // point size in pixels per metre at 1 m, so the glare keeps the same world size at any resolution
      glare.material.uniforms.uPx.value = pixelRatio;
      glare.material.uniforms.uScale.value = viewHeight / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));

      focus.set(cam.x, 4, cam.z - 14);
      heads.forEach((h, i) => { dist[i] = h.distanceTo(focus); });
      order.sort((a, b) => dist[a] - dist[b]);
      lights.forEach((l, k) => {
        const i = order[k];
        l.position.copy(heads[i]).setY(heads[i].y - 0.2);
        l.target.position.set(heads[i].x, 0, heads[i].z);
        l.intensity = 170 * levels[i] * (1 - THREE.MathUtils.smoothstep(dist[i], 26, 44));
      });
    },
  };
}

// ---- billboards ----------------------------------------------------------------------------------
// Each billboard throws a soft glow, tinted with its brand colour, onto the pavement in front of it. (Real area lights were
// tried here, but they mirror as hard white rectangles in the glass towers.)
export function billboardLighting(scene, boards) {
  const glowTex = radialTexture([[0, 'rgba(255,255,255,0.6)'], [0.45, 'rgba(255,255,255,0.2)'], [1, 'rgba(255,255,255,0)']]);
  const decals = boards.map(({ x, z, side, color }) => {
    // mostly the screen's cool white, with a wash of the brand colour
    const tint = new THREE.Color(0xc8d4ff).lerp(new THREE.Color(color), 0.45);
    const d = new THREE.Mesh(new THREE.PlaneGeometry(7, 13).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: glowTex, color: tint, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    d.position.set(x - side * 3.2, 0.2, z);
    d.renderOrder = 1;
    scene.add(d);
    return d;
  });
  return {
    update(levels) {
      decals.forEach((d, i) => { d.material.opacity = 0.9 * levels[i]; });
    },
  };
}

// ---- coloured light beams ------------------------------------------------------------------------
// Upward beams of coloured light in the night haze: architectural uplights on the buildings and
// under the palms. beams: [{ x, y, z, height, spread, color, tilt? }]. Returns the mesh.
export function lightBeams(scene, beams, { strength = 0.16 } = {}) {
  const geo = new THREE.CylinderGeometry(1, 0.12, 1, 24, 1, true);
  geo.translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.ShaderMaterial({
    uniforms: { uStrength: { value: strength } },
    vertexShader: `
      varying float vH; varying float vF; varying vec3 vC;
      void main() {
        vec4 p = vec4(position, 1.0);
        vec3 n = normal;
        vC = vec3(1.0);
        #ifdef USE_INSTANCING
          p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vC = instanceColor;
        #endif
        vec4 mv = modelViewMatrix * p;
        vF = abs(dot(normalize(normalMatrix * n), normalize(-mv.xyz)));
        vH = uv.y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uStrength; varying float vH; varying float vF; varying vec3 vC;
      void main() {
        float a = pow(1.0 - vH, 1.8) * pow(vF, 2.0) * uStrength;
        gl_FragColor = vec4(vC * a, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }), beams.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), e = new THREE.Euler();
  beams.forEach((b, i) => {
    q.setFromEuler(e.set(b.tiltX || 0, 0, b.tiltZ || 0));
    mesh.setMatrixAt(i, m.compose(pos.set(b.x, b.y, b.z), q, sc.set(b.spread, b.height, b.spread)));
    mesh.setColorAt(i, new THREE.Color(b.color));
  });
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  scene.add(mesh);
  return mesh;
}
