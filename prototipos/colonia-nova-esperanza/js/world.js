// Terrain, sky (gradient dome, stars, gas giant with rings, moons) and scattered scenery.
import * as THREE from '../vendor/three/three.module.min.js';
import { spawn, bake, part } from './kit.js';

const TAU = Math.PI * 2;

// --- small deterministic value noise so the planet looks the same every visit
function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x, z) => vnoise(x, z) * 0.5 + vnoise(x * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, z * 4.3) * 0.2;
function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 4; }
  return t;
}

export function buildWorld(scene, { COLONY, WORLD, renderer }) {
  const rnd = mulberry(1234);
  const height = (x, z) => {
    const r = Math.hypot(x, z);
    let h = (fbm(x * 0.08, z * 0.08) - 0.5) * 0.12;
    if (r > COLONY + 1) h += (fbm(x * 0.05 + 7, z * 0.05) - 0.4) * Math.min(1, (r - COLONY - 1) / 6) * 0.9;
    if (r > WORLD + 1) h += (r - WORLD - 1) * (0.32 + fbm(x * 0.03, z * 0.03) * 0.5);
    return h;
  };

  // ------------------------------------------------------------ terrain
  const g = new THREE.PlaneGeometry(240, 240, 180, 180); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, cols = new Float32Array(pos.count * 3);
  const sand = new THREE.Color('#c08a5c'), sandDark = new THREE.Color('#9b6a46'), sandLight = new THREE.Color('#d7a978'), rockC = new THREE.Color('#7c4e36'), padC = new THREE.Color('#cfae86');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z), h = height(x, z);
    pos.setY(i, h);
    const n = fbm(x * 0.12 + 3, z * 0.12);
    c.copy(sandDark).lerp(sandLight, n);
    c.lerp(sand, 0.35);
    if (r < COLONY) c.lerp(padC, 0.45 * Math.min(1, (COLONY - r) / 3));
    if (r > WORLD) c.lerp(rockC, Math.min(1, (r - WORLD) / 10));
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.computeVertexNormals();
  const detail = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = 100 + Math.random() * 70; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    for (let i = 0; i < 60; i++) { x.strokeStyle = 'rgba(70,70,70,0.25)'; x.lineWidth = 1; x.beginPath(); const y0 = Math.random() * h; x.moveTo(0, y0); x.bezierCurveTo(w / 3, y0 + 6, w * 2 / 3, y0 - 6, w, y0); x.stroke(); }
  }, 60);
  detail.colorSpace = THREE.NoColorSpace;
  const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0, map: detail });
  groundMat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', 'diffuseColor.rgb *= texture2D(map, vMapUv).rgb * 1.6;'); };
  const ground = new THREE.Mesh(g, groundMat); ground.receiveShadow = true; scene.add(ground);

  // colony deck: panel grid decal and glowing perimeter
  const deckTex = canvasTex(1024, 1024, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.translate(w / 2, h / 2);
    for (let r = 60; r < w / 2; r += 70) { x.strokeStyle = 'rgba(60,40,25,0.13)'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.stroke(); }
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; x.strokeStyle = 'rgba(60,40,25,0.09)'; x.lineWidth = 3; x.beginPath(); x.moveTo(Math.cos(a) * 60, Math.sin(a) * 60); x.lineTo(Math.cos(a) * (w / 2), Math.sin(a) * (w / 2)); x.stroke(); }
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + TAU / 8; x.fillStyle = 'rgba(242,184,75,0.14)'; x.save(); x.rotate(a); x.fillRect(150, -10, 330, 20); x.restore(); }
  });
  const deck = new THREE.Mesh(new THREE.CircleGeometry(COLONY, 96), new THREE.MeshStandardMaterial({ map: deckTex, transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
  deck.rotation.x = -Math.PI / 2; deck.position.y = 0.02; deck.receiveShadow = true; scene.add(deck);
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x6fe3ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const edge = new THREE.Mesh(new THREE.RingGeometry(COLONY - 0.12, COLONY + 0.05, 160), edgeMat);
  edge.rotation.x = -Math.PI / 2; edge.position.y = 0.06; scene.add(edge);

  // ------------------------------------------------------------ sky dome
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(-0.5, 0.35, -0.8).normalize() }, sunCol: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, mid, bot, sunCol; uniform vec3 sunDir; varying vec3 vDir;
      void main(){ float y = vDir.y; vec3 c = y > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, y)) : mix(mid, bot, smoothstep(0.0, 0.25, -y));
        float s = max(dot(normalize(vDir), sunDir), 0.0); c += sunCol * (pow(s, 380.0) * 2.5 + pow(s, 12.0) * 0.35);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), skyMat); scene.add(sky);
  const starGeo = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 1400; i++) { const a = rnd() * TAU, e = Math.asin(rnd() * 0.96 + 0.04), R = 300; sp.push(Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R, Math.sin(a) * Math.cos(e) * R); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  scene.add(new THREE.Points(starGeo, starMat));

  // gas giant "Tauris" and its rings: the signature of the sky
  const giantTex = canvasTex(512, 256, (x, w, h) => {
    const bands = ['#e8c79a', '#d9a066', '#f1dcb8', '#c47d45', '#e7b98a', '#b8683a', '#f0d7ae', '#d29763'];
    let y = 0; while (y < h) { const bh = 6 + Math.random() * 26; x.fillStyle = bands[Math.floor(Math.random() * bands.length)]; x.fillRect(0, y, w, bh); y += bh; }
    x.globalAlpha = 0.25; for (let i = 0; i < 300; i++) { x.fillStyle = Math.random() < 0.5 ? '#fff3df' : '#a85a2e'; x.fillRect(Math.random() * w, Math.random() * h, 20 + Math.random() * 80, 1 + Math.random() * 3); }
    x.globalAlpha = 0.8; x.fillStyle = '#b5552c'; x.beginPath(); x.ellipse(w * 0.62, h * 0.62, 26, 12, 0, 0, TAU); x.fill();
  });
  const giantMat = new THREE.MeshBasicMaterial({ map: giantTex, fog: false, transparent: true });
  const giant = new THREE.Mesh(new THREE.SphereGeometry(58, 48, 32), giantMat);
  giant.position.set(-150, 95, -235); giant.rotation.set(0.25, 0, 0.35); scene.add(giant);
  const shade = new THREE.Mesh(new THREE.SphereGeometry(58.4, 48, 32), new THREE.ShaderMaterial({
    transparent: true, fog: false, depthWrite: false,
    uniforms: { dir: { value: new THREE.Vector3(0.8, 0.1, 0.6).normalize() } },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 dir; varying vec3 vN; void main(){ float d = dot(vN, dir); gl_FragColor = vec4(0.02,0.02,0.06, smoothstep(0.3,-0.5,d)*0.92); }',
  }));
  shade.position.copy(giant.position); scene.add(shade);
  const ringTex = canvasTex(512, 8, (x, w) => { for (let i = 0; i < w; i++) { const a = (0.25 + 0.6 * Math.abs(Math.sin(i * 0.09) * Math.sin(i * 0.023))) * (i < 30 ? i / 30 : 1); x.fillStyle = `rgba(240,215,170,${a.toFixed(3)})`; x.fillRect(i, 0, 1, 8); } });
  const ringGeo = new THREE.RingGeometry(74, 118, 128, 1);
  const rp = ringGeo.attributes.position, ruv = ringGeo.attributes.uv;
  for (let i = 0; i < rp.count; i++) { const r = Math.hypot(rp.getX(i), rp.getY(i)); ruv.setXY(i, (r - 74) / 44, 0.5); }
  const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, fog: false, depthWrite: false });
  const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.copy(giant.position); ring.rotation.set(-1.25, 0.15, 0.35); scene.add(ring);
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xd9e4ff, fog: false, transparent: true, opacity: 0 });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 16), moonMat); moon.position.set(120, 120, -230); scene.add(moon);
  const moon2Mat = new THREE.MeshBasicMaterial({ color: 0xffb3e6, fog: false, transparent: true, opacity: 0 });
  const moon2 = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 12), moon2Mat); moon2.position.set(60, 80, -260); scene.add(moon2);

  // ------------------------------------------------------------ scenery (merged into a few draw calls)
  const decor = new THREE.Group();
  const putAt = (name, x, z, s, ry, sink = 0) => { const o = spawn(name); o.position.set(x, height(x, z) - sink, z); o.scale.setScalar(s); o.rotation.y = ry; decor.add(o); return o; };
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU + rnd() * 0.2, r = 62 + rnd() * 12;
    const o = putAt('cliff' + (1 + (i % 3)), Math.cos(a) * r, Math.sin(a) * r, 2.2 + rnd() * 1.4, -a + Math.PI / 2, 1);
    o.scale.y *= 1.4 + rnd() * 0.8;
  }
  for (let i = 0; i < 60; i++) { const a = rnd() * TAU, r = WORLD + 3 + rnd() * 18; putAt('rock' + (1 + (i % 5)), Math.cos(a) * r, Math.sin(a) * r, 1.4 + rnd() * 2.6, rnd() * TAU, 0.3); }
  for (let i = 0; i < 70; i++) { const a = rnd() * TAU, r = COLONY + 3 + rnd() * (WORLD - COLONY - 5); putAt('rock' + (1 + (i % 5)), Math.cos(a) * r, Math.sin(a) * r, 0.4 + rnd() * 0.8, rnd() * TAU, 0.1); }
  const floraNames = ['shroom1', 'shroom2', 'shroom3', 'coral', 'shroom1', 'coral'];
  for (let i = 0; i < 90; i++) { // clustered so the plain reads as patches of alien growth
    const ca = rnd() * TAU, cr = COLONY + 3 + rnd() * (WORLD - COLONY + 2), n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) { const a = ca + (rnd() - 0.5) * 0.12, r = cr + (rnd() - 0.5) * 3; putAt(floraNames[(i + k) % floraNames.length], Math.cos(a) * r, Math.sin(a) * r, 0.6 + rnd() * 1.0, rnd() * TAU); }
  }
  for (let i = 0; i < 10; i++) { const a = rnd() * TAU, r = COLONY + 6 + rnd() * (WORLD - COLONY); putAt('sporetree', Math.cos(a) * r, Math.sin(a) * r, 0.9 + rnd() * 0.6, rnd() * TAU); }
  scene.add(decor);
  const baked = bake(decor, scene);
  scene.remove(decor);
  // colony perimeter: lamps on the boundary ring and a few props (hidden in the intro, before the colony exists)
  const camp = new THREE.Group();
  const putCamp = (name, x, z, s, ry) => { const o = spawn(name); o.position.set(x, height(x, z), z); o.scale.setScalar(s); o.rotation.y = ry; camp.add(o); return o; };
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + TAU / 24; putCamp('lamp', Math.cos(a) * (COLONY + 0.6), Math.sin(a) * (COLONY + 0.6), 1, -a + Math.PI); }
  const propSpots = [['crate', 0.3], ['barrel', 0.5], ['crate', 1.9], ['solar', 2.2], ['barrel', 3.4], ['antenna', 4.1], ['solar', 5.0], ['crate', 5.6]];
  propSpots.forEach(([n, a], i) => putCamp(n, Math.cos(a) * (COLONY + 2.2 + (i % 2)), Math.sin(a) * (COLONY + 2.2 + (i % 2)), 1, rnd() * TAU));
  scene.add(camp);
  const campBaked = bake(camp, scene);
  scene.remove(camp);

  // ------------------------------------------------------------ the crashed ship (landmark)
  const shipSpot = { x: -31, z: -16, a: 0.5 };
  const ship = spawn('esperanza');
  ship.position.set(shipSpot.x, -1.1, shipSpot.z);
  ship.rotation.set(0.09, shipSpot.a, -0.12);
  ship.scale.setScalar(0.95);
  scene.add(ship);
  const shipLights = [1, 2, 3, 4, 5].map((i) => part(ship, 'esperanza.light' + i));
  const shipEngines = [1, 2, 3].map((i) => part(ship, 'esperanza.engine' + i));
  // debris field: pieces of the hull and cargo thrown around the crash site
  const debris = new THREE.Group();
  for (let i = 0; i < 22; i++) {
    const a = rnd() * TAU, r = 7 + rnd() * 9, x = shipSpot.x + Math.cos(a) * r, z = shipSpot.z + Math.sin(a) * r;
    if (Math.hypot(x, z) < COLONY + 1.5) continue;
    const n = ['crate', 'barrel', 'rock2', 'rock4', 'solar', 'crate'][i % 6];
    const o = spawn(n); o.position.set(x, height(x, z) - (n.startsWith('rock') ? 0.2 : 0), z); o.scale.setScalar(n.startsWith('rock') ? 0.6 : 0.9);
    o.rotation.set(n === 'solar' ? 1.2 : (rnd() - 0.5) * 0.6, rnd() * TAU, (rnd() - 0.5) * 0.5); debris.add(o);
  }
  scene.add(debris); bake(debris, scene); scene.remove(debris);
  // collision circles along the hull (world space)
  ship.updateMatrixWorld(true);
  const shipCol = [-6, -3, 0, 3, 6].map((y) => { const v = new THREE.Vector3(0, 2, y).applyMatrix4(ship.matrixWorld); return { x: v.x, z: v.z, r: 2.4 }; });
  const shipSmoke = [new THREE.Vector3(0, 3, 6.9), new THREE.Vector3(1.6, 4.6, -1), new THREE.Vector3(-3.2, 1.6, -1.5)].map((v) => v.applyMatrix4(ship.matrixWorld));

  // gather emissive materials of the decor so they glow more at night
  const glowMats = new Set();
  [baked, campBaked].forEach((g) => g.traverse((o) => { if (o.isMesh && o.material.emissive && o.material.emissive.getHex() !== 0) glowMats.add(o.material); }));
  const glowBase = new Map([...glowMats].map((m) => [m, m.emissiveIntensity]));

  const PAL = {
    day: { top: new THREE.Color('#3f7fc4'), mid: new THREE.Color('#e9c9a6'), bot: new THREE.Color('#b68a63'), sun: new THREE.Color('#ffe0b0') },
    night: { top: new THREE.Color('#050816'), mid: new THREE.Color('#1c1f45'), bot: new THREE.Color('#120d1c'), sun: new THREE.Color('#2b2f66') },
    dusk: { top: new THREE.Color('#2a2f6b'), mid: new THREE.Color('#ff8d5a'), bot: new THREE.Color('#5a3040'), sun: new THREE.Color('#ff9a5a') },
  };
  function setSky(mix, dusk = 0) {
    const d = PAL.day, n = PAL.night, k = PAL.dusk;
    for (const key of ['top', 'mid', 'bot']) {
      const u = skyMat.uniforms[key].value.copy(d[key]).lerp(n[key], mix);
      if (dusk > 0) u.lerp(k[key], dusk);
    }
    skyMat.uniforms.sunCol.value.copy(d.sun).lerp(n.sun, mix).lerp(k.sun, dusk);
    starMat.opacity = Math.max(mix, dusk * 0.5); moonMat.opacity = mix; moon2Mat.opacity = mix * 0.9;
    giantMat.color.setScalar(0.85 - mix * 0.45);
    ringMat.opacity = 0.85 - mix * 0.35;
    edgeMat.opacity = 0.35 + mix * 0.5;
    for (const m of glowMats) m.emissiveIntensity = glowBase.get(m) * (0.35 + mix * 1.4);
  }
  sky.onBeforeRender = (r, s, cam) => { sky.position.copy(cam.position); };
  return { height, ground, sky, setSky, colony: [deck, edge, campBaked], ship, shipLights, shipEngines, shipCol, shipSmoke, shipSpot, baked };
}
