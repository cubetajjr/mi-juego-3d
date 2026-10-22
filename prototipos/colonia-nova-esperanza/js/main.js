// Colonia Nova · Esperanza — colony defence on the planet where the colony ship Esperanza crashed.
// Gameplay rules come from v3; this edition swaps every visual for the Blender kit, adds
// lighting/post, effects, procedural audio, and the story of the Esperanza.
import * as THREE from '../vendor/three/three.module.min.js';
import { EffectComposer } from '../vendor/three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/three/addons/postprocessing/OutputPass.js';
import { loadKit, spawn, part, ownMaterials, tint, Animator } from './kit.js';
import { buildWorld } from './world.js';
import { FX } from './fx.js';
import * as AU from './audio.js';
import { createStory } from './story.js';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const svgIcon = (id) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); const u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#' + id); s.append(u); return s; };

// ======================= tuning (same rules as v3) =======================
const TAU = Math.PI * 2, COLONY = 26, WORLD = 44, RIFT_R = 38, DAY_LEN = 90, SPAWN_WINDOW = 34;
const OFFLINE_EVERY = 20 * 60, SHIP_GOAL = 10, GRID = 2, PLAYER_RANGE = 8, CMD_HP = 100;
const LV_HP = [1, 1.5, 2.2], LV_WALL = [1, 1.8, 2.8], LV_DMG = [1, 1.45, 2.1], LV_RANGE = [0, 0.8, 1.6], LV_PROD = [1, 1.6, 2.3], LV_SCALE = [1, 1.08, 1.16], LV_COST = [0, 1.6, 3.2];
const CAP = [3, 5, 7], WORKERS = [2, 3, 4];
const DEF = {
  muro:    { name: 'Muro', desc: 'Barato y resistente. Los alienígenas tienen que romperlo para pasar.', cost: 15, hp: 70, r: 0.9, lock: 1, wall: true },
  torreta: { name: 'Torreta', desc: 'Dispara a un enemigo. Alcance medio.', cost: 45, hp: 45, r: 1, lock: 1, range: 8.5, rate: 0.6, dmg: 1.2, def: 1 },
  mina:    { name: 'Mina de chatarra', desc: 'Produce chatarra. Recógela tú o deja que lo hagan los colonos.', cost: 60, hp: 40, r: 1, lock: 1, rate: 0.45, cap: 50 },
  habitat: { name: 'Hábitat', desc: 'Sus colonos llevan la chatarra de las minas al núcleo.', cost: 90, hp: 60, r: 1.3, lock: 2 },
  cuartel: { name: 'Cuartel', desc: 'Entrena soldados e ingenieros que luchan a tu lado.', cost: 120, hp: 80, r: 1.4, lock: 2 },
  laser:   { name: 'Torre láser', desc: 'Disparo muy rápido. Alcance corto. Alcanza a los voladores.', cost: 110, hp: 50, r: 1, lock: 2, range: 6, rate: 0.12, dmg: 0.45, def: 1.5 },
  mortero: { name: 'Mortero', desc: 'Daño en área a gran distancia. No alcanza a los voladores.', cost: 150, hp: 55, r: 1.1, lock: 3, range: 12, min: 3, rate: 2.4, dmg: 4, area: 2.4, def: 2 },
};
const ORDER = ['muro', 'torreta', 'mina', 'habitat', 'cuartel', 'laser', 'mortero'];
const LIMITS = { muro: [10, 16, 24, 32, 40], torreta: [2, 3, 4, 5, 6], mina: [1, 2, 3, 3, 4], habitat: [0, 1, 2, 2, 3], cuartel: [0, 1, 1, 1, 1], laser: [0, 1, 2, 2, 3], mortero: [0, 0, 1, 2, 2] };
const CORE = [{ hp: 120, s: 150, c: 0 }, { hp: 180, s: 350, c: 3 }, { hp: 260, s: 700, c: 6 }, { hp: 350, s: 1100, c: 10 }, { hp: 450 }];
const TROOP = {
  soldado:   { name: 'Soldado', desc: 'Dispara a los alienígenas cercanos.', cost: 30, hp: 50, dmg: 0.8, rate: 0.5, range: 6, accent: 0xe0483e },
  ingeniero: { name: 'Ingeniero', desc: 'Repara edificios y el núcleo mientras luchas.', cost: 40, hp: 35, dmg: 0.4, rate: 0.9, range: 5, repair: 9, accent: 0xf2b84b },
};
const ALIEN = {
  bicho:     { name: 'Bicho', desc: 'Va a por tus edificios.', r: 0.5, hp: 3, spd: 2.3, dmg: 5, rate: 0.8, col: 0xff4fd8, drop: 2, cry: 0 },
  veloz:     { name: 'Veloz', desc: 'Muy rápido. Ataca minas, hábitats y el cuartel.', r: 0.38, hp: 2, spd: 4.2, dmg: 3, rate: 0.6, col: 0x9dff4f, drop: 2, cry: 0 },
  escupidor: { name: 'Escupidor', desc: 'Escupe ácido desde lejos.', r: 0.5, hp: 3, spd: 2, dmg: 7, rate: 1.6, range: 6.5, col: 0x9a6cff, drop: 3, cry: 0 },
  volador:   { name: 'Volador', desc: 'Vuela por encima de los muros. Los morteros no lo alcanzan.', r: 0.45, hp: 2.5, spd: 3, dmg: 4, rate: 0.8, col: 0xffe14f, drop: 3, cry: 0, fly: true },
  acorazado: { name: 'Acorazado', desc: 'Lento y muy resistente. Va a por tus defensas.', r: 0.8, hp: 14, spd: 1.1, dmg: 12, rate: 1.1, col: 0xff5a3d, drop: 6, cry: 0 },
  jefe:      { name: 'Reina de la colmena', desc: 'Enorme. Aparece cada 5 noches.', r: 1.3, hp: 45, spd: 1.2, dmg: 25, rate: 1.2, col: 0xff7a3d, drop: 40, cry: 4 },
};
const CLIP_SPD = { bicho: 2.3, veloz: 4.2, escupidor: 2, volador: 3, acorazado: 1.1, jefe: 1.2 };

const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const lowEnd = isTouch && Math.min(screen.width, screen.height) < 820;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ======================= save =======================
// Own key: on GitHub Pages every prototype shares one origin, and v4 (the solar system) uses 'colonia-nova-v4'.
const SAVE_KEY = 'colonia-nova-esperanza', OLD_KEYS = ['colonia-nova-v3', 'colonia-nova-v2'];
function readJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
let G = readJSON(SAVE_KEY), migrated = false;
if (!G || !Array.isArray(G.buildings)) {
  G = null;
  for (const k of OLD_KEYS) {
    const o = readJSON(k);
    if (o && Array.isArray(o.buildings)) {
      G = { scrap: o.scrap || 0, crys: o.crys || 0, coreLv: o.coreLv || 1, nights: o.nights || 0, lastSeen: o.lastSeen || Date.now(),
        troops: o.troops || { soldado: 0, ingeniero: 0 }, seen: o.seen || {}, pois: o.pois || null,
        buildings: o.buildings.filter((b) => DEF[b.t]).map((b) => ({ t: b.t, x: b.x, z: b.z, lv: b.lv || 1, store: b.store || 0 })) };
      migrated = true; break;
    }
  }
}
const isNew = !G;
if (!G) G = { scrap: 140, crys: 0, coreLv: 1, nights: 0, buildings: [], lastSeen: Date.now() };
G.troops ||= { soldado: 0, ingeniero: 0 };
G.seen ||= {};
G.story ||= {};
G.tut ||= { scrap: 0 };
if (migrated) G.tut.scrap = 3;

// ======================= renderer, post =======================
const canvas = $('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowEnd, powerPreference: 'high-performance' });
const DPR = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.25 : 1.75);
renderer.setPixelRatio(DPR);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 70, 190);
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 700);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.55, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const fx = new FX(scene);
let camScale = 1;
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h);
  bloom.resolution.set(Math.round(w * DPR / 2), Math.round(h * DPR / 2));
  camera.aspect = w / h; camera.updateProjectionMatrix();
  camScale = w < h ? 1.55 : 1;
  fx.setScale(h * DPR);
}
window.addEventListener('resize', resize); resize();

// small helpers for procedural bits (level marks, ghost, rifts)
const MC = {};
function M(c, e, ei) { const k = c + '|' + (e || 0) + '|' + (ei || 0); return MC[k] || (MC[k] = new THREE.MeshStandardMaterial({ color: c, emissive: e || 0, emissiveIntensity: ei || 0, roughness: 0.6, metalness: 0.2 })); }
const GC = {};
function glow(c, i = 1.4) { const k = c + '|' + i; return GC[k] || (GC[k] = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 })); }
function mesh(geo, mat, x, y, z) { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true; return m; }
const beamTex = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 128; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = g; x.fillRect(0, 0, 4, 128); const t = new THREE.CanvasTexture(c); return t; })();
function beam(color, h, rad) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rad || 0.35, rad || 0.35, h, 16, 1, true), new THREE.MeshBasicMaterial({ color, map: beamTex, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
  m.position.y = h / 2; return m;
}

// ======================= boot screen while the kit loads =======================
$('#loadTxt').textContent = 'Cargando modelos 3D…';
// window.KIT_URL lets hosts that cannot serve .glb point at a .gltf copy of the same kit
await loadKit(window.KIT_URL || 'assets/kit.glb', (p) => { $('#loadBar').style.width = Math.round(p * 100) + '%'; }, { charShadows: !lowEnd });
$('#loadBar').style.width = '100%';

// ======================= lights & world =======================
const hemi = new THREE.HemisphereLight(0xffffff, 0x553322, 1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.castShadow = true; sun.shadow.mapSize.set(lowEnd ? 1024 : 2048, lowEnd ? 1024 : 2048);
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.035;
const sc = sun.shadow.camera; sc.left = -36; sc.right = 36; sc.top = 36; sc.bottom = -36; sc.near = 1; sc.far = 120; sc.updateProjectionMatrix();
scene.add(sun, sun.target);
const W = buildWorld(scene, { COLONY, WORLD, renderer });

const PAL = {
  day:   { sky: new THREE.Color('#fff2dc'), gnd: new THREE.Color('#7a5236'), hemi: 1.05, sun: new THREE.Color('#ffe7c4'), sunI: 2.7, near: 75, far: 200, fog: new THREE.Color('#e3c4a2') },
  night: { sky: new THREE.Color('#4a5cb0'), gnd: new THREE.Color('#0c0a18'), hemi: 0.2, sun: new THREE.Color('#7f96ff'), sunI: 0.32, near: 30, far: 95, fog: new THREE.Color('#0d1230') },
  dusk:  { sky: new THREE.Color('#ffb48a'), sun: new THREE.Color('#ff9a5a'), fog: new THREE.Color('#c07a62') },
};
let mix = 0, mixTarget = 0, dusk = 0, coreLight = null, CMD = null;
const tmpC = new THREE.Color();
function applyPalette() {
  const d = PAL.day, n = PAL.night, k = PAL.dusk;
  W.setSky(mix, dusk);
  scene.fog.color.copy(d.fog).lerp(n.fog, mix).lerp(k.fog, dusk * 0.6);
  const fogK = cinematic ? 2.2 : 1;
  scene.fog.near = (d.near + (n.near - d.near) * mix) * fogK; scene.fog.far = (d.far + (n.far - d.far) * mix) * fogK;
  hemi.color.copy(d.sky).lerp(n.sky, mix).lerp(k.sky, dusk * 0.4);
  hemi.groundColor.copy(tmpC.copy(d.gnd).lerp(n.gnd, mix));
  hemi.intensity = d.hemi + (n.hemi - d.hemi) * mix;
  sun.color.copy(d.sun).lerp(n.sun, mix).lerp(k.sun, dusk * 0.7); sun.intensity = d.sunI + (n.sunI - d.sunI) * mix - dusk * 0.6;
  bloom.strength = 0.42 + mix * 0.45;
  renderer.toneMappingExposure = 1.0 - mix * 0.12;
  if (coreLight) coreLight.intensity = 5 + mix * 12;
  if (CMD) CMD.lamp.intensity = CMD.dead ? 0 : mix * 22;
  AU.setNightMix(mix);
}

// ======================= health bars =======================
const barGeo = new THREE.PlaneGeometry(1, 1), barFgGeo = new THREE.PlaneGeometry(1, 1); barFgGeo.translate(0.5, 0, 0);
const barBgMat = new THREE.MeshBasicMaterial({ color: 0x0b0f1c, transparent: true, opacity: 0.8, depthTest: false, toneMapped: false, fog: false });
const BARM = {};
[['good', 0x7dffb0], ['warn', 0xf2b84b], ['bad', 0xff6b5e], ['enemy', 0xff4fd8], ['info', 0x6fe3ff]].forEach(([k, c]) => { BARM[k] = new THREE.MeshBasicMaterial({ color: c, depthTest: false, toneMapped: false, fog: false }); });
function makeBar(w) {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(barGeo, barBgMat); bg.scale.set(w + 0.1, 0.26, 1); bg.renderOrder = 10;
  const fg = new THREE.Mesh(barFgGeo, BARM.good); fg.scale.set(w, 0.16, 1); fg.position.set(-w / 2, 0, 0.001); fg.renderOrder = 11;
  g.add(bg, fg); g.visible = false; scene.add(g); return { g, fg, w };
}
function setBar(bar, pct, x, y, z, mat) {
  bar.g.visible = true; bar.g.position.set(x, y, z); bar.g.quaternion.copy(camera.quaternion);
  bar.fg.scale.x = Math.max(0.001, bar.w * clamp(pct, 0, 1));
  bar.fg.material = mat || (pct > 0.5 ? BARM.good : pct > 0.25 ? BARM.warn : BARM.bad);
}
const killBar = (bar) => { if (bar) scene.remove(bar.g); };

// ======================= core (the Esperanza's reactor) =======================
const coreG = new THREE.Group(); coreG.userData.core = true; scene.add(coreG);
let coreModel = null, coreGem = null, coreRings = [], coreBeacon = null, coreHitT = 0;
const CORE_T = { isCore: true, x: 0, z: 0, r: 3.2, dead: false };
coreLight = new THREE.PointLight(0x7dffb0, 8, 34, 1.4); coreG.add(coreLight);
function buildCore(lv) {
  if (coreModel) coreG.remove(coreModel);
  coreModel = spawn('core'); coreG.add(coreModel);
  const spireH = 2.4 + lv * 0.5;
  part(coreModel, 'core.spire').scale.y = spireH / 2.9;
  coreGem = part(coreModel, 'core.gem'); coreGem.position.y = 2.2 + spireH + 0.9; coreGem.userData.baseY = coreGem.position.y;
  coreRings = [1, 2, 3].map((i) => part(coreModel, 'core.ring' + i));
  coreRings.forEach((r, i) => { r.visible = i < lv; r.position.y = coreGem.position.y; r.rotation.x = 0.5 + i * 0.6; });
  coreBeacon = part(coreModel, 'core.beacon');
  coreLight.position.y = coreGem.position.y;
}

// ======================= astronauts =======================
function astronaut(accent, s, kind) {
  const g = new THREE.Group(), m = spawn('astro');
  tint(m, 'accent', accent); m.scale.setScalar(s); g.add(m);
  const gun = part(m, 'astro.gun'), tool = part(m, 'astro.tool'), crate = part(m, 'astro.crate');
  gun.visible = kind === 'cmd' || kind === 'soldado'; tool.visible = kind === 'ingeniero'; crate.visible = false;
  const anim = new Animator(m, 'astro'); anim.play('Idle', 0); anim.mixer.setTime(Math.random() * 2);
  return { g, m, anim, armR: part(m, 'astro.armR'), armL: part(m, 'astro.armL'), carry: kind === 'worker' ? crate : null, recoil: 0, muzzle: 0 };
}
function animUnit(a, moving, speed, armed, working, dt) {
  if (working) a.anim.play('Work', 0.2);
  else if (moving) a.anim.play('Run', 0.15, Math.max(0.6, speed / 6.2));
  else a.anim.play('Idle', 0.3);
  a.anim.update(dt);
  if (a.carry && a.carry.visible) { a.armR.rotation.x = -0.95; a.armL.rotation.x = -0.95; }
  else if (armed && !working) { a.armR.rotation.x = -1.2 + a.recoil * 1.5; a.armR.rotation.z = 0; if (!moving) a.armL.rotation.x = -0.55; }
  a.recoil = Math.max(0, a.recoil - dt * 6);
}
CMD = Object.assign(astronaut(0xff8a3d, 1, 'cmd'), { kind: 'unit', isCmd: true, hp: CMD_HP, max: CMD_HP, r: 0.5, dead: false, respawnT: 0, cd: 0 });
CMD.lamp = new THREE.SpotLight(0xd8ecff, 0, 26, 0.62, 0.7, 1.1);
CMD.lamp.position.set(0, 2.2, 0.2); CMD.lamp.target.position.set(0, 0, 9);
CMD.g.add(CMD.lamp, CMD.lamp.target);
CMD.bar = makeBar(1.2);
// ground ring so the commander reads at a glance among troops and colonists
CMD.ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.74, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff9a4a).multiplyScalar(1.6), transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }));
CMD.ring.rotation.x = -Math.PI / 2; CMD.ring.position.y = 0.05; CMD.g.add(CMD.ring);
scene.add(CMD.g);
const player = CMD.g;

// ======================= runtime collections =======================
const fallen = [], buildings = [], troops = [], workers = [], aliens = [], bullets = [], acids = [], shells = [], scraps = [], shards = [], meteors = [];
let S = null, started = false, cinematic = false;

// ======================= projectiles =======================
const bulletGeo = new THREE.SphereGeometry(0.12, 8, 6);
const hot = (hex, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), toneMapped: true });
const BMAT = { player: hot(0xffc38a, 4), turret: hot(0xffd36e, 4), troop: hot(0xff8f86, 4) };
const BCOL = { player: 0xffb070, turret: 0xffd36e, troop: 0xff7a70 };
function fire(fx0, fy, fz, tx, tz, kind, dmg, shooter) {
  const m = new THREE.Mesh(bulletGeo, BMAT[kind]); m.position.set(fx0, fy, fz);
  const v = V(tx - fx0, 0, tz - fz); v.normalize();
  fx.muzzle({ x: fx0 + v.x * 0.6, y: fy, z: fz + v.z * 0.6 }, v.x, v.z, BCOL[kind]);
  v.multiplyScalar(30);
  scene.add(m); bullets.push({ m, v, dmg, life: 0.9, kind });
  AU.sfx(kind === 'player' ? 'shot' : kind === 'turret' ? 'turret' : 'troop', panX(fx0, fz), vol(fx0, fz));
  if (shooter) shooter.recoil = 0.25;
}
const shellMat = hot(0xff9f5a, 3), acidMat = hot(0x9dff4f, 3);
const acidGeo = new THREE.SphereGeometry(0.2, 10, 8);
const laserBeamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9ff4ff).multiplyScalar(3), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
const laserBeamGeo = new THREE.CylinderGeometry(0.06, 0.06, 1, 8, 1, true); laserBeamGeo.translate(0, 0.5, 0); laserBeamGeo.rotateX(Math.PI / 2);

// audio helpers: pan and fade by distance to the camera target
const look = V(0, 0, 0);
function panX(x) { return clamp((x - look.x) / 18, -1, 1); }
function vol(x, z) { return clamp(1.25 - dist2(x, z, look.x, look.z) / 34, 0, 1); }

// ======================= targets & damage =======================
const tpos = (t) => (t.kind === 'unit' ? t.g.position : t);
const isGone = (t) => !t || (t.isCore ? false : t.dead);
let hurtFlash = 0;
function damage(t, amt) {
  if (!t) return;
  if (t.isCore) { S.coreHp -= amt; coreHitT = 0.15; fx.sparks({ x: (Math.random() - 0.5) * 4, y: 1.6, z: (Math.random() - 0.5) * 4 }, 0x7dffb0, 4, 3, 2); return; }
  if (t.kind === 'unit') {
    if (t.dead) return;
    t.hp -= amt; t.hurtT = 0.18;
    if (t.isCmd) { hurtFlash = Math.min(1, hurtFlash + amt / 35); AU.sfx('hurt'); }
    if (t.hp <= 0) unitDown(t);
    return;
  }
  if (t.dead) return;
  t.hp -= amt; t.hitT = 0.15;
  fx.sparks({ x: t.x + (Math.random() - 0.5), y: 1, z: t.z + (Math.random() - 0.5) }, 0xffd9a0, 4, 3, 2, 0.25);
  if (t.hp <= 0) destroyBuilding(t);
}
function unitDown(u) {
  fx.sparks(u.g.position.clone().setY(1), 0xff6b5e, 12);
  AU.sfx('down', panX(u.g.position.x), vol(u.g.position.x, u.g.position.z));
  if (u.isCmd) {
    u.dead = true; u.respawnT = 8; u.hp = 0; u.m.rotation.x = -Math.PI / 2; u.m.position.y = 0.35;
    banner('HAS CAÍDO', 'Tu comandante vuelve al núcleo en 8 segundos', 'night'); S.shake = 0.4;
    story.event('cmdDown');
    return;
  }
  u.dead = true; u.g.visible = false; u.bar.g.visible = false;
  troops.splice(troops.indexOf(u), 1); fallen.push(u);
  toast('Tu ' + TROOP[u.type].name.toLowerCase() + ' está herido · vuelve al amanecer');
}

// ======================= buildings =======================
const HEIGHT = { muro: 1.6, torreta: 2, laser: 3.4, mortero: 2.2, mina: 3.3, habitat: 2.3, cuartel: 2.8 };
function buildMesh(t) {
  const g = new THREE.Group(), m = spawn(t), o = { g, m, h: HEIGHT[t] };
  g.add(m);
  if (t === 'torreta') o.head = part(m, 'torreta.head');
  if (t === 'mortero') o.head = part(m, 'mortero.head');
  if (t === 'laser') {
    o.ring = part(m, 'laser.ring'); o.crystal = part(m, 'laser.crystal');
    o.beam = new THREE.Mesh(laserBeamGeo, laserBeamMat); o.beam.visible = false; o.beam.frustumCulled = false; scene.add(o.beam); o.beamT = 0;
  }
  if (t === 'mina') {
    o.drill = part(m, 'mina.drill'); o.pile = part(m, 'mina.pile');
    o.icon = spawn('scrap'); o.icon.scale.setScalar(1.5); o.icon.position.y = 3.3; g.add(o.icon);
  }
  if (t === 'cuartel') o.flag = part(m, 'cuartel.flag');
  return o;
}
const lvColor = [0, 0x6fe3ff, 0xf2b84b];
function applyLevel(b) {
  const s = LV_SCALE[b.lv - 1]; b.g.scale.setScalar(s); b.baseScale = s;
  if (b.deco) { b.g.remove(b.deco); b.deco = null; }
  if (b.lv > 1) {
    const d = new THREE.Group(), mat = glow(lvColor[b.lv - 1], 2);
    if (b.d.wall) d.add(mesh(new THREE.BoxGeometry(1.98, 0.06, 0.06), mat, 0, 1.13, -0.38));
    else { const ring = mesh(new THREE.TorusGeometry(b.d.r * 1.02, 0.05, 6, 40), mat, 0, 0.06, 0); ring.rotation.x = Math.PI / 2; d.add(ring); }
    for (let i = 0; i < b.lv; i++) { const ch = mesh(new THREE.OctahedronGeometry(0.11), mat, (i - (b.lv - 1) / 2) * 0.28, b.d.wall ? 1.35 : 0.3, b.d.wall ? 0 : b.d.r * 1.02); d.add(ch); }
    b.g.add(d); b.deco = d;
  }
  const wasMax = b.max || 0;
  b.max = Math.round(b.d.hp * (b.d.wall ? LV_WALL : LV_HP)[b.lv - 1]);
  b.hp = b.hp == null ? b.max : Math.min(b.max, b.hp + (b.max - wasMax));
  b.r = b.d.r * s;
}
const dmgOf = (b, lv) => b.d.dmg * LV_DMG[(lv || b.lv) - 1];
const rangeOf = (b, lv) => b.d.range + LV_RANGE[(lv || b.lv) - 1];
const prodOf = (b, lv) => b.d.rate * LV_PROD[(lv || b.lv) - 1];
const capOf = (b, lv) => Math.round(b.d.cap * LV_PROD[(lv || b.lv) - 1]);
function addBuilding(t, x, z, lv, store) {
  const d = DEF[t], o = buildMesh(t);
  o.g.position.set(x, 0, z);
  o.g.rotation.y = t === 'muro' ? Math.atan2(x, z) : Math.atan2(-x, -z);
  scene.add(o.g);
  const b = Object.assign({ t, d, x, z, lv: lv || 1, hp: null, max: 0, cd: Math.random() * 0.5, store: store || 0, dead: false, hitT: 0, smokeT: 0 }, o);
  b.g.userData.b = b;
  applyLevel(b);
  b.bar = makeBar(1.6);
  buildings.push(b);
  if (t === 'habitat') syncWorkers(b);
  return b;
}
const rubbleMat = M(0x2c3140);
function destroyBuilding(b) {
  b.dead = true; b.g.visible = false; b.bar.g.visible = false;
  const r = new THREE.Group();
  for (let i = 0; i < 7; i++) { const m = mesh(new THREE.BoxGeometry(0.3 + Math.random() * 0.4, 0.16 + Math.random() * 0.2, 0.3 + Math.random() * 0.3), i % 2 ? rubbleMat : M(0x5d6880), (Math.random() - 0.5) * 1.6, 0.1, (Math.random() - 0.5) * 1.6); m.rotation.set(Math.random(), Math.random() * 3, Math.random()); r.add(m); }
  r.position.set(b.x, 0, b.z); scene.add(r); b.rubble = r;
  fx.explode(V(b.x, 0.6, b.z), 0xff9f5a, 1.1); S.shake = Math.max(S.shake, 0.3);
  AU.sfx('boom', panX(b.x), vol(b.x, b.z));
  if (b.beam) b.beam.visible = false;
  toast(b.d.name + ' destruido');
}
function restoreAll() {
  for (const b of buildings) { if (b.rubble) { scene.remove(b.rubble); b.rubble = null; } b.dead = false; b.g.visible = true; b.hp = b.max; }
}
const count = (t) => buildings.filter((b) => b.t === t).length;
const limit = (t) => LIMITS[t][G.coreLv - 1];
const coreMax = () => CORE[G.coreLv - 1].hp;
const barracks = () => buildings.find((b) => b.t === 'cuartel');
const troopCap = () => { const c = barracks(); return c ? CAP[c.lv - 1] : 0; };
function defenseScore() {
  let s = 0;
  for (const b of buildings) { if (b.d.def) s += b.d.def * LV_DMG[b.lv - 1]; if (b.d.wall) s += 0.1 * b.lv; }
  return s + troops.length * 0.6;
}

// ======================= workers (colonos) =======================
function syncWorkers(h) {
  const want = WORKERS[h.lv - 1], have = workers.filter((w) => w.home === h).length;
  for (let i = have; i < want; i++) {
    const a = astronaut(0x4fb8ff, 0.62, 'worker');
    const w = Object.assign(a, { home: h, state: 'idle', mine: null, load: 0, wait: Math.random() * 2, tx: h.x, tz: h.z, moving: false });
    a.g.position.set(h.x + (Math.random() - 0.5) * 3, 0, h.z + 2); scene.add(a.g); workers.push(w);
  }
}

// ======================= troops =======================
function spawnTroop(type, x, z) {
  const td = TROOP[type];
  const a = astronaut(td.accent, 0.8, type);
  const u = Object.assign(a, { kind: 'unit', type, td, hp: td.hp, max: td.hp, r: 0.4, dead: false, cd: Math.random() * 0.5, hurtT: 0, moving: false });
  u.bar = makeBar(0.9);
  a.g.position.set(x, 0, z); scene.add(a.g); troops.push(u);
  return u;
}
function trainTroop(type) {
  const c = barracks(), td = TROOP[type];
  if (!c || troops.length + fallen.length >= troopCap() || G.scrap < td.cost) return;
  G.scrap -= td.cost;
  spawnTroop(type, c.x + (Math.random() - 0.5) * 2, c.z + 2.2);
  fx.rise(V(c.x, 0.5, c.z + 1.8), td.accent, 14); AU.sfx('place');
  persist();
}
const holdFlag = new THREE.Group();
holdFlag.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 6), M(0xd6dcea), 0, 1, 0));
holdFlag.add(mesh(new THREE.BoxGeometry(0.7, 0.42, 0.04), glow(0xe0483e, 0.8), 0.37, 1.75, 0));
const holdRing = new THREE.Mesh(new THREE.RingGeometry(2.8, 3, 48), new THREE.MeshBasicMaterial({ color: 0xe0483e, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
holdRing.rotation.x = -Math.PI / 2; holdRing.position.y = 0.07; holdFlag.add(holdRing);
holdFlag.visible = false; scene.add(holdFlag);

// ======================= aliens =======================
function spawnAlien(type, x, z, guard) {
  const d = ALIEN[type], g = new THREE.Group(), m = spawn(type);
  const s = type === 'jefe' ? 1 : 0.9 + Math.random() * 0.2;
  m.scale.setScalar(s); g.add(m); g.position.set(x, 0, z); scene.add(g);
  const anim = new Animator(m, type); anim.play('Move', 0); anim.mixer.setTime(Math.random());
  const hp = d.hp * (1 + G.nights * 0.2);
  const a = { g, rig: m, mats: ownMaterials(m), anim, type, d, hp, max: hp, flash: 0, flashing: false, bob: Math.random() * 6, tgt: null, retarget: 0, atkT: d.rate * 0.5, lunge: 0, blockT: 0, stillT: 0, ghostT: 0, guard: guard || null, bar: hp >= 10 ? makeBar(type === 'jefe' ? 2.4 : 1.4) : null, moving: true };
  aliens.push(a);
  fx.sparks(V(x, 0.4, z), d.col, 8, 3, 3); fx.puff(V(x, 0.2, z), 0x6a3a6a, 3, 1.2, 0.8, 1, 0.4);
  if (Math.random() < 0.35) AU.sfx('screech', panX(x), vol(x, z) * 0.7);
  if (!G.seen[type]) { G.seen[type] = 1; toast('Nuevo alienígena: ' + d.name + '. ' + d.desc, 'new'); story.event('alien', type); }
  return a;
}
function removeAlien(a) { scene.remove(a.g); killBar(a.bar); const i = aliens.indexOf(a); if (i >= 0) aliens.splice(i, 1); }
function liveUnits() { const u = troops.slice(); if (!CMD.dead) u.push(CMD); return u; }
function chooseTarget(a) {
  const p = a.g.position, t = a.type;
  const unitR = a.d.range ? 8.5 : 4.5;
  let best = null, bd = Infinity;
  for (const u of liveUnits()) { const d = dist2(u.g.position.x, u.g.position.z, p.x, p.z); if (d < unitR && d < bd) { bd = d; best = u; } }
  if (best) return best;
  best = CORE_T; bd = dist2(p.x, p.z, 0, 0) - CORE_T.r;
  for (const b of buildings) {
    if (b.dead || b.d.wall) continue;
    let d = dist2(p.x, p.z, b.x, b.z) - b.r;
    if (t === 'veloz' && !(b.t === 'mina' || b.t === 'habitat' || b.t === 'cuartel')) d += 8;
    if ((t === 'acorazado' || t === 'jefe') && !b.d.def) d += 8;
    if (t === 'volador' && b.t !== 'mina') d += 6;
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}
function nearestAlien(x, z, range, minR, noFly) {
  let best = null, bd = range;
  for (const a of aliens) {
    if (noFly && a.d.fly) continue;
    const d = dist2(a.g.position.x, a.g.position.z, x, z) - a.d.r;
    if (d < bd && (!minR || d > minR)) { bd = d; best = a; }
  }
  return best;
}
function hurtAlien(a, dmg) {
  if (!aliens.includes(a)) return;
  a.hp -= dmg; a.flash = 0.08;
  if (a.hp <= 0) {
    G.scrap += a.d.drop; G.crys += a.d.cry; popRes('scrap');
    const p = a.g.position.clone().setY(a.d.fly ? 1.9 : a.d.r);
    fx.goo(p, a.d.col, a.type === 'jefe' ? 3 : a.d.r * 1.6);
    AU.sfx(a.type === 'jefe' ? 'bigboom' : 'squish', panX(p.x), vol(p.x, p.z));
    if (a.type === 'jefe') { toast('¡Reina derrotada! +' + a.d.cry + ' cristales', 'good'); S.shake = 0.5; story.event('bossDown'); }
    removeAlien(a);
  } else AU.sfx('hit', panX(a.g.position.x), vol(a.g.position.x, a.g.position.z) * 0.6);
}

// ======================= points of interest (outside the colony) =======================
const shipAvoid = { x: W.shipSpot.x, z: W.shipSpot.z };
function freeSpot(avoid) {
  for (let k = 0; k < 120; k++) {
    const a = Math.random() * TAU, r = 31 + Math.random() * 10, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (avoid.every((u) => dist2(u.x, u.z, x, z) > 9) && dist2(shipAvoid.x, shipAvoid.z, x, z) > 13) return { x: +x.toFixed(2), z: +z.toFixed(2) };
  }
  return { x: 0, z: 36 };
}
if (!G.pois || W.shipCol.some((c) => [...(G.pois.deposits || []), G.pois.nest, G.pois.wreck].some((p) => p && dist2(p.x, p.z, c.x, c.z) < 4))) {
  const used = [];
  const spot = () => { const s = freeSpot(used); used.push(s); return s; };
  G.pois = { deposits: [0, 1, 2].map(() => Object.assign(spot(), { ready: true, regrow: 0 })), nest: Object.assign(spot(), { alive: true, regrow: 0 }), wreck: Object.assign(spot(), { ready: true, regrow: 0 }) };
}
const allPoiSpots = () => [...G.pois.deposits, G.pois.nest, G.pois.wreck];
const crysDim = new THREE.MeshStandardMaterial({ color: 0x4a6b7a, roughness: 0.4 });
const DEP = G.pois.deposits.map((data) => {
  const g = spawn('deposit'); g.position.set(data.x, 0, data.z); g.rotation.y = Math.random() * TAU; scene.add(g);
  const cr = part(g, 'deposit.crystals'), col = beam(0x6fe3ff, 16, 0.32);
  col.position.set(data.x, 8, data.z); scene.add(col);
  return { data, g, cr, mat: cr.material, col, prog: 0, bar: makeBar(1.4) };
});
function refreshDeposit(D) {
  const on = D.data.ready;
  D.cr.material = on ? D.mat : crysDim; D.cr.scale.setScalar(on ? 1 : 0.45);
  D.col.visible = on;
}
DEP.forEach(refreshDeposit);
const NEST = (() => {
  const g = spawn('nest'); scene.add(g);
  const col = beam(0xff4fd8, 16, 0.32); scene.add(col);
  return { g, eye: part(g, 'nest.eye'), col, hp: 0, max: 0, guardT: 0, bar: makeBar(1.8), r: 1.8, x: 0, z: 0 };
})();
function placeNest() {
  const n = G.pois.nest; NEST.g.position.set(n.x, 0, n.z); NEST.g.visible = n.alive; NEST.col.visible = n.alive; NEST.col.position.set(n.x, 8, n.z);
  NEST.max = 30 + G.nights * 6; NEST.hp = NEST.max; NEST.x = n.x; NEST.z = n.z;
}
placeNest();
const WRECK = (() => {
  const g = spawn('wreck'); scene.add(g);
  const col = beam(0xf2b84b, 16, 0.32); scene.add(col);
  return { g, lid: part(g, 'wreck.lid'), col };
})();
const crateAt = () => ({ x: G.pois.wreck.x + 1.6, z: G.pois.wreck.z + 1.0 });
function placeWreck() {
  const w = G.pois.wreck; WRECK.g.position.set(w.x, 0, w.z);
  WRECK.col.visible = w.ready; WRECK.col.position.set(w.x + 1.6, 8, w.z + 1.0);
  WRECK.lid.rotation.x = w.ready ? 0 : -1.2;
}
placeWreck();
function refreshPois() {
  let changed = false;
  G.pois.deposits.forEach((d, i) => { if (!d.ready && G.nights >= d.regrow) { d.ready = true; refreshDeposit(DEP[i]); changed = true; } });
  const n = G.pois.nest;
  if (!n.alive && G.nights >= n.regrow) { Object.assign(n, freeSpot(allPoiSpots().filter((p) => p !== n)), { alive: true }); placeNest(); changed = true; }
  const w = G.pois.wreck;
  if (!w.ready && G.nights >= w.regrow) { Object.assign(w, freeSpot(allPoiSpots().filter((p) => p !== w)), { ready: true }); placeWreck(); changed = true; }
  return changed;
}

// ======================= the Esperanza: repair progress shows on the wreck =======================
const shipLightMats = W.shipLights.map((l) => { const m = l.material.clone(); l.material = m; return m; });
const engineMats = W.shipEngines.map((l) => { const m = l.material.clone(); l.material = m; return m; });
function refreshShip() {
  const n = Math.min(G.nights, SHIP_GOAL), lit = Math.floor(n / 2);
  shipLightMats.forEach((m, i) => { m.emissiveIntensity = i < lit ? 2.2 : 0.02; m.color.setHex(i < lit ? 0x7dffb0 : 0x334455); });
  engineMats.forEach((m) => { m.emissiveIntensity = n >= SHIP_GOAL ? 3 : 0.05 + n * 0.04; });
  W.ship.visible = !G.shipGone;
}
refreshShip();

// ======================= persistence =======================
function persist() {
  G.buildings = buildings.map((b) => ({ t: b.t, x: b.x, z: b.z, lv: b.lv, store: Math.floor(b.store || 0) }));
  const all = troops.concat(fallen); G.troops = { soldado: all.filter((t) => t.type === 'soldado').length, ingeniero: all.filter((t) => t.type === 'ingeniero').length };
  G.lastSeen = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) {}
}

// ======================= UI helpers =======================
let toastTimer = 0, bannerTimer = 0;
function toast(text, kind) {
  const e = $('#toast'); e.textContent = text; e.className = 'show' + (kind ? ' ' + kind : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { e.className = kind || ''; }, kind === 'new' ? 3600 : 1900);
}
function banner(big, small, kind) {
  const e = $('#banner'); e.textContent = big; e.className = kind || '';
  if (small) e.append(el('small', null, small));
  requestAnimationFrame(() => e.classList.add('show')); clearTimeout(bannerTimer); bannerTimer = setTimeout(() => e.classList.remove('show'), 2800);
}
function popRes(k) { const c = document.querySelector('.res-chip.' + k); if (!c) return; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
function costNode(s, c) {
  const w = el('span');
  if (s) { const a = el('span', 'cost s'); a.append(svgIcon('i-scrap'), document.createTextNode(String(s))); w.append(a); }
  if (c) { const b = el('span', 'cost c'); b.append(svgIcon('i-crystal'), document.createTextNode(String(c))); w.append(b); }
  return w;
}
const fmt = (t) => { const s = Math.max(0, Math.ceil(t)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function fmtDur(sec) { const m = Math.round(sec / 60); if (m < 60) return m + ' min'; const h = Math.floor(m / 60), r = m % 60; return h + ' h' + (r ? ' ' + r + ' min' : ''); }
const PANELS = ['#corePanel', '#bPanel', '#reportPanel', '#menuPanel', '#startScreen'];
const anyPanelOpen = () => PANELS.some((p) => !$(p).hidden);
function updateHint() {
  if (!S) return;
  let h = '';
  if (S.placing) h = '';
  else if (CMD.dead) h = 'Tu comandante se está recuperando en el núcleo';
  else if (S.phase === 'day') {
    if (S.rifts.length) h = 'Los portales morados marcan por dónde atacarán esta noche';
    else h = (isTouch ? 'Arrastra para moverte' : 'WASD o flechas para moverte') + ' · Toca un edificio para mejorarlo · Sal del círculo para explorar';
  } else h = 'Defiende la colonia · Tu comandante y tus tropas disparan solos';
  $('#hint').textContent = h;
}
function objective() {
  if (G.tut.scrap < 3 && G.nights < 1) return ['Primeros pasos', 'Recoge la chatarra dispersa por la colonia (' + G.tut.scrap + '/3).', G.tut.scrap / 3];
  if (count('torreta') < 2 && G.nights < 1) return ['Primeros pasos', 'Pulsa «Construir» y levanta una segunda torreta.', count('torreta') / 2];
  if (G.nights < 1) return ['Primera noche', 'Prepárate y sobrevive a la primera noche.', 0];
  if (!G.shipGone && G.nights < SHIP_GOAL) return ['Reparar la Esperanza', 'Cada noche superada, los colonos reparan la nave. Noches: ' + G.nights + '/' + SHIP_GOAL + '.', G.nights / SHIP_GOAL];
  if (!G.shipGone) return ['La Esperanza está lista', 'Supera esta noche: al amanecer despegará.', 1];
  return ['Resiste', 'La Esperanza volverá del Planeta Rojo. Aguanta todas las noches que puedas (' + G.nights + ').', 1];
}
let lastObj = '';
function hud() {
  $('#scrap').textContent = Math.floor(G.scrap);
  $('#crys').textContent = G.crys;
  $('#troopChip').hidden = !barracks() && !troops.length && !fallen.length;
  $('#troopCount').textContent = troops.length + (fallen.length ? ' (+' + fallen.length + ')' : '') + '/' + troopCap();
  const max = coreMax(), pct = clamp(S.coreHp / max, 0, 1);
  $('#coreLbl').textContent = 'Núcleo · nv ' + G.coreLv;
  $('#coreTxt').textContent = Math.ceil(Math.max(0, S.coreHp)) + '/' + max;
  const bar = $('#coreBar'); bar.style.width = (pct * 100).toFixed(1) + '%'; bar.style.background = pct < 0.3 ? 'var(--danger)' : 'var(--core)';
  const chip = $('#timerChip'), dialFg = $('#dialFg');
  if (S.phase === 'day') {
    chip.classList.remove('night'); $('#timerLbl').textContent = 'Próximo ataque en'; $('#timer').textContent = fmt(S.t);
    dialFg.style.strokeDashoffset = String(100 - (S.t / DAY_LEN) * 100);
  } else {
    chip.classList.add('night'); $('#timerLbl').textContent = '¡Ataque! · noche ' + S.wave.n;
    const left = S.queue.length + aliens.filter((a) => !a.guard).length;
    $('#timer').textContent = left + (left === 1 ? ' alienígena' : ' alienígenas');
    dialFg.style.strokeDashoffset = String(100 - (left / Math.max(1, S.wave.total)) * 100);
  }
  $('#nightBtn').hidden = S.phase !== 'day';
  $('#buildBtn').disabled = S.phase !== 'day';
  const sq = $('#squadBtn'); sq.hidden = !troops.length && !fallen.length;
  sq.querySelector('span').textContent = 'Escuadrón: ' + (S.squad === 'follow' ? 'te sigue' : 'defiende aquí');
  const [t, txt, p] = objective(), key = t + txt;
  if (key !== lastObj) { lastObj = key; $('#objTitle').textContent = t; $('#objText').textContent = txt; }
  $('#objBar').style.width = (clamp(p, 0, 1) * 100).toFixed(0) + '%';
}

// ======================= shop thumbnails rendered from the real models =======================
const THUMB = {};
(function makeThumbs() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(104, 104); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
  const s = new THREE.Scene(); s.add(new THREE.HemisphereLight(0xffffff, 0x444466, 1.4)); const l = new THREE.DirectionalLight(0xffffff, 2.2); l.position.set(-3, 5, 4); s.add(l);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  for (const t of [...ORDER, 'soldado', 'ingeniero']) {
    const o = t in DEF ? spawn(t) : astronaut(TROOP[t].accent, 1, t).g;
    s.add(o);
    const b = new THREE.Box3().setFromObject(o), c = b.getCenter(V(0, 0, 0)), z = b.getSize(V(0, 0, 0)).length();
    cam.position.set(c.x + z * 0.9, c.y + z * 0.75, c.z + z * 1.35); cam.lookAt(c);
    r.render(s, cam); THUMB[t] = r.domElement.toDataURL();
    s.remove(o);
  }
  r.dispose();
})();
const thumb = (t) => { const d = el('span', 'thumb'); const i = new Image(); i.alt = ''; i.src = THUMB[t] || ''; d.append(i); return d; };

// ======================= shop & placement =======================
function openShop() {
  if (!S || S.phase !== 'day') { toast('Solo puedes construir de día'); AU.sfx('deny'); return; }
  renderShop(); $('#shop').hidden = false; AU.sfx('click');
}
function renderShop() {
  const grid = $('#shopGrid'); grid.innerHTML = '';
  for (const t of ORDER) {
    const d = DEF[t], lim = limit(t), n = count(t), locked = G.coreLv < d.lock;
    const btn = el('button', 'item'); btn.type = 'button';
    const meta = el('span', 'meta');
    meta.append(costNode(d.cost, 0), locked ? el('span', 'lock', 'Núcleo nivel ' + d.lock) : el('span', null, n + ' / ' + lim));
    btn.append(thumb(t), el('strong', null, d.name), el('span', 'd', d.desc), meta);
    btn.disabled = locked || n >= lim || G.scrap < d.cost;
    btn.setAttribute('aria-label', d.name + ', cuesta ' + d.cost + ' de chatarra' + (locked ? ', bloqueado' : ''));
    btn.addEventListener('click', () => startPlacing(t));
    grid.append(btn);
  }
}
const ghost = new THREE.Group();
const ghostMat = new THREE.MeshBasicMaterial({ color: 0x7dffb0, transparent: true, opacity: 0.35, depthWrite: false });
const ghostBody = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.2, 24), ghostMat); ghostBody.position.y = 0.6; ghost.add(ghostBody);
const ghostRing = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 96), new THREE.MeshBasicMaterial({ color: 0x6fe3ff, transparent: true, opacity: 0.4, depthWrite: false }));
ghostRing.rotation.x = -Math.PI / 2; ghostRing.position.y = 0.06; ghost.add(ghostRing);
ghost.visible = false; scene.add(ghost);
const selRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.12, 64), new THREE.MeshBasicMaterial({ color: 0x6fe3ff, transparent: true, opacity: 0.9, depthWrite: false }));
selRing.rotation.x = -Math.PI / 2; selRing.position.y = 0.09; selRing.visible = false; scene.add(selRing);
function startPlacing(t) {
  $('#shop').hidden = true; S.placing = t;
  const d = DEF[t];
  ghostBody.scale.set(d.r, 1, d.r); ghostRing.visible = !!d.range; if (d.range) ghostRing.scale.setScalar(d.range);
  ghost.visible = false;
  $('#placeTxt').textContent = 'Colocando: ' + d.name + ' · ' + (isTouch ? 'toca el suelo' : 'haz clic en el suelo');
  $('#placeBar').hidden = false; $('#controls').hidden = true; updateHint();
}
function stopPlacing() { if (!S) return; S.placing = null; ghost.visible = false; $('#placeBar').hidden = true; $('#controls').hidden = false; updateHint(); }
const snap = (v) => Math.round(v / GRID) * GRID;
function placeProblem(t, x, z) {
  const d = DEF[t];
  if (Math.hypot(x, z) > COLONY - 1.5) return 'Fuera de la colonia: construye dentro del círculo';
  if (Math.hypot(x, z) < CORE_T.r + d.r + 0.8) return 'Demasiado cerca del núcleo';
  if (buildings.some((b) => dist2(b.x, b.z, x, z) < b.r + d.r - 0.2)) return 'Ya hay algo construido ahí';
  if (count(t) >= limit(t)) return 'Límite alcanzado: mejora el núcleo para construir más';
  if (G.scrap < d.cost) return 'Necesitas ' + d.cost + ' de chatarra';
  return null;
}
function tryPlace(p) {
  const t = S.placing, x = snap(p.x), z = snap(p.z), err = placeProblem(t, x, z);
  if (err) { toast(err); AU.sfx('deny'); return; }
  G.scrap -= DEF[t].cost; const b = addBuilding(t, x, z, 1, 0);
  b.g.scale.setScalar(0.01); b.popT = 0.35;
  fx.ring(V(x, 0.2, z), 0x6fe3ff, 26, 5); fx.puff(V(x, 0.2, z), 0xb08a68, 6, 1.6, 0.6, 1.2, 0.5);
  AU.sfx('place', panX(x), 1);
  story.event('built', t);
  persist();
  if (count(t) >= limit(t) || G.scrap < DEF[t].cost) stopPlacing();
}

// ======================= core panel =======================
function addRow(box, a, b) { const r = el('div', 'row'); r.append(el('span', null, a), el('span', null, b)); box.append(r); }
function openCore() {
  const lv = G.coreLv, cur = CORE[lv - 1], next = CORE[lv];
  $('#cpTitle').textContent = 'Núcleo · nivel ' + lv;
  const rows = $('#cpRows'); rows.innerHTML = '';
  addRow(rows, 'Vida del núcleo', cur.hp + (next ? '  →  ' + next.hp : ''));
  addRow(rows, 'Noches superadas', String(G.nights));
  addRow(rows, G.shipGone ? 'La Esperanza' : 'Reparación de la Esperanza', G.shipGone ? 'rumbo al Planeta Rojo' : Math.min(G.nights, SHIP_GOAL) + ' / ' + SHIP_GOAL + ' noches');
  const up = $('#cpUpgrade');
  if (next) {
    const unlocks = ORDER.filter((t) => DEF[t].lock === lv + 1).map((t) => DEF[t].name);
    const more = ORDER.filter((t) => LIMITS[t][lv] > LIMITS[t][lv - 1] && DEF[t].lock <= lv).map((t) => DEF[t].name.toLowerCase());
    $('#cpNext').textContent = 'Nivel ' + (lv + 1) + ': ' + (unlocks.length ? 'desbloquea ' + unlocks.join(', ') + '. ' : '') + (more.length ? 'Permite más ' + more.join(', ') + '. ' : '') + 'Los edificios pueden subir a nivel ' + Math.min(3, lv + 1) + '.';
    up.hidden = false; up.innerHTML = ''; up.append(document.createTextNode('Mejorar · '), costNode(cur.s, cur.c));
    up.disabled = G.scrap < cur.s || G.crys < cur.c || S.phase !== 'day';
  } else { $('#cpNext').textContent = 'Nivel máximo.'; up.hidden = true; }
  selRing.visible = true; selRing.position.set(0, 0.09, 0); selRing.scale.setScalar(4);
  $('#corePanel').hidden = false; AU.sfx('click');
}
function upgradeCore() {
  const cur = CORE[G.coreLv - 1];
  if (!CORE[G.coreLv] || G.scrap < cur.s || G.crys < cur.c) return;
  G.scrap -= cur.s; G.crys -= cur.c; G.coreLv++;
  buildCore(G.coreLv); S.coreHp = coreMax();
  fx.ring(V(0, 0.4, 0), 0x7dffb0, 48, 12); fx.rise(V(0, 2, 0), 0x7dffb0, 40, 4); AU.sfx('upgrade');
  persist(); openCore(); banner('NÚCLEO NIVEL ' + G.coreLv, 'Nuevos edificios y mejoras disponibles', 'day');
  story.event('coreUp', G.coreLv);
}

// ======================= building panel =======================
let selected = null;
function upgradeCost(b) { return { s: Math.round(b.d.cost * LV_COST[b.lv]), c: b.lv === 2 ? 2 : 0 }; }
function statsLine(b, lv) {
  const out = [];
  out.push('vida ' + Math.round(b.d.hp * (b.d.wall ? LV_WALL : LV_HP)[lv - 1]));
  if (b.d.def) out.push('daño ' + dmgOf(b, lv).toFixed(1), 'alcance ' + rangeOf(b, lv).toFixed(1));
  if (b.t === 'mina') out.push(Math.round(prodOf(b, lv) * 60) + ' de chatarra por minuto', 'almacén ' + capOf(b, lv));
  if (b.t === 'habitat') out.push(WORKERS[lv - 1] + ' colonos');
  if (b.t === 'cuartel') out.push(CAP[lv - 1] + ' tropas');
  return out.join(', ');
}
function openBuilding(b) {
  selected = b;
  $('#bpEyebrow').textContent = b.dead ? 'Destruido · se reconstruye al amanecer' : 'Edificio';
  $('#bpTitle').textContent = b.d.name + ' · nivel ' + b.lv;
  $('#bpDesc').textContent = b.d.desc;
  const rows = $('#bpRows'); rows.innerHTML = '';
  addRow(rows, 'Vida', Math.ceil(Math.max(0, b.hp)) + ' / ' + b.max);
  if (b.d.def) { addRow(rows, 'Daño por disparo', dmgOf(b).toFixed(1)); addRow(rows, 'Alcance', rangeOf(b).toFixed(1)); }
  if (b.t === 'mina') { addRow(rows, 'Producción', Math.round(prodOf(b) * 60) + ' por minuto'); addRow(rows, 'Almacén', Math.floor(b.store) + ' / ' + capOf(b)); }
  if (b.t === 'habitat') addRow(rows, 'Colonos', String(WORKERS[b.lv - 1]));
  const train = $('#bpTrain'); train.innerHTML = ''; train.hidden = b.t !== 'cuartel';
  if (b.t === 'cuartel') {
    const h = el('h4', null, 'Entrenar tropas'); h.append(el('span', null, (troops.length + fallen.length) + ' / ' + troopCap())); train.append(h);
    const grid = el('div', 'train-grid');
    for (const [type, td] of Object.entries(TROOP)) {
      const btn = el('button', 'item'); btn.type = 'button';
      const meta = el('span', 'meta'); meta.append(costNode(td.cost, 0), el('span', null, String(troops.filter((t) => t.type === type).length)));
      btn.append(thumb(type), el('strong', null, td.name), el('span', 'd', td.desc), meta);
      btn.disabled = b.dead || troops.length + fallen.length >= troopCap() || G.scrap < td.cost;
      btn.addEventListener('click', () => { trainTroop(type); openBuilding(b); });
      grid.append(btn);
    }
    train.append(grid);
    if (troops.length + fallen.length >= troopCap()) train.append(el('p', 'muted', 'Cuartel lleno. Mejóralo para tener más tropas.'));
  }
  const up = $('#bpUpgrade');
  if (b.lv >= 3) { $('#bpNext').textContent = 'Nivel máximo.'; up.hidden = true; }
  else {
    const c = upgradeCost(b), needCore = b.lv + 1;
    up.hidden = false; up.innerHTML = ''; up.append(document.createTextNode('Mejorar a nivel ' + (b.lv + 1) + ' · '), costNode(c.s, c.c));
    let why = '';
    if (G.coreLv < needCore) why = 'Necesitas el núcleo a nivel ' + needCore + '.';
    else if (S.phase !== 'day') why = 'Solo se puede mejorar de día.';
    else if (b.dead) why = 'Espera a que se reconstruya.';
    $('#bpNext').textContent = 'Nivel ' + (b.lv + 1) + ': ' + statsLine(b, b.lv + 1) + '. ' + why;
    up.disabled = !!why || G.scrap < c.s || G.crys < c.c;
  }
  selRing.visible = true; selRing.position.set(b.x, 0.09, b.z); selRing.scale.setScalar(b.r + 0.4);
  $('#bPanel').hidden = false; AU.sfx('click');
}
function upgradeBuilding() {
  const b = selected; if (!b || b.lv >= 3) return;
  const c = upgradeCost(b);
  if (G.coreLv < b.lv + 1 || G.scrap < c.s || G.crys < c.c || S.phase !== 'day' || b.dead) return;
  G.scrap -= c.s; G.crys -= c.c; b.lv++; applyLevel(b); b.hp = b.max;
  if (b.t === 'habitat') syncWorkers(b);
  fx.ring(V(b.x, 0.3, b.z), lvColor[b.lv - 1], 30, 6); fx.rise(V(b.x, 0.6, b.z), lvColor[b.lv - 1], 20);
  AU.sfx('upgrade');
  persist(); openBuilding(b);
  toast(b.d.name + ' mejorado a nivel ' + b.lv, 'good');
}

// ======================= reports =======================
const reportQueue = [];
function showReport(eyebrow, title, items) {
  if (!$('#reportPanel').hidden) { reportQueue.push([eyebrow, title, items]); return; }
  $('#rpEyebrow').textContent = eyebrow; $('#rpTitle').textContent = title;
  const ul = $('#rpList'); ul.innerHTML = '';
  items.forEach(([cls, text]) => ul.append(el('li', cls, text)));
  $('#reportPanel').hidden = false; $('#rpClose').focus();
}
function closeReport() { $('#reportPanel').hidden = true; if (reportQueue.length) showReport(...reportQueue.shift()); }
function simulateAway(sec) {
  const items = [];
  let prod = 0;
  for (const b of buildings) if (b.t === 'mina') { const add = Math.min(capOf(b) - b.store, prodOf(b) * sec); if (add > 0) { b.store += add; prod += add; } }
  if (prod >= 1) items.push(['gold', 'Tus minas han producido ' + Math.floor(prod) + ' de chatarra.']);
  const attacks = Math.min(3, Math.floor(sec / OFFLINE_EVERY));
  for (let i = 0; i < attacks; i++) {
    const n = G.nights + 1;
    const def = defenseScore() + G.coreLv * 1.5, threat = 2 + n * 1.2;
    const p = clamp(def / threat * 0.75, 0.1, 0.92);
    if (Math.random() < p) { const r = 15 + n * 4; G.scrap += r; G.nights++; items.push(['good', 'Ataque ' + (i + 1) + ': tus defensas lo rechazaron. +' + r + ' de chatarra.']); }
    else { const lost = Math.floor(G.scrap * 0.25); G.scrap -= lost; items.push(['bad', 'Ataque ' + (i + 1) + ': la colonia cayó. Perdiste ' + lost + ' de chatarra. Mejora tus defensas.']); }
  }
  if (!attacks) items.push(['', 'No ha habido ataques. Los alienígenas atacan cada ' + OFFLINE_EVERY / 60 + ' minutos mientras no juegas.']);
  if (refreshPois()) items.push(['new', 'Fuera de la colonia han vuelto a aparecer cristales, nidos o restos de naves.']);
  refreshShip();
  persist();
  showReport('Informe de la colonia', 'Mientras no estabas (' + fmtDur(sec) + ')', items);
}

// ======================= rifts =======================
const riftTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.translate(64, 64);
  for (let i = 0; i < 5; i++) { x.rotate(TAU / 5); const g = x.createLinearGradient(0, 0, 60, 0); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.strokeStyle = g; x.lineWidth = 7; x.beginPath(); x.arc(14, 0, 40, -1.2, 0.6); x.stroke(); }
  return new THREE.CanvasTexture(c);
})();
const riftMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xc04bff).multiplyScalar(2), map: beamTex, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
const riftDiscMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd46bff).multiplyScalar(2.5), map: riftTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
function makeRifts() {
  const n = G.nights + 1 >= 3 ? 3 : 2, base = Math.random() * TAU;
  for (let i = 0; i < n; i++) {
    const a = base + i * (TAU / n) + (Math.random() - 0.5) * 0.8, x = Math.cos(a) * RIFT_R, z = Math.sin(a) * RIFT_R;
    const g = new THREE.Group();
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.6, 20, 20, 1, true), riftMat); col.position.y = 10; g.add(col);
    const ring = new THREE.Mesh(new THREE.CircleGeometry(2.4, 40), riftDiscMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; g.add(ring);
    const tor = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.09, 8, 48), glow(0xc04bff, 2.5)); tor.rotation.x = Math.PI / 2; tor.position.y = 0.15; g.add(tor);
    const l = new THREE.PointLight(0xc04bff, 18, 14, 1.4); l.position.y = 2; g.add(l);
    g.position.set(x, 0, z); scene.add(g);
    S.rifts.push({ g, x, z, ring, tor });
  }
  AU.sfx('portal');
  story.event('rifts');
  updateHint();
}
function clearRifts() { S.rifts.forEach((r) => scene.remove(r.g)); S.rifts.length = 0; }

// ======================= meteors =======================
const meteorMat = new THREE.MeshStandardMaterial({ color: 0x3a2a22, emissive: 0xff6a1a, emissiveIntensity: 2.2, roughness: 0.8 });
function startMeteors() {
  S.meteorDone = true;
  banner('¡LLUVIA DE METEORITOS!', 'Aléjate de los círculos rojos · dejan cristales', 'night');
  S.shake = 0.3; story.event('meteors');
  const n = 6 + Math.min(8, G.nights);
  for (let i = 0; i < n; i++) S.meteorQueue.push(i * 0.7 + Math.random() * 0.4);
}
const markMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3b3b).multiplyScalar(2), transparent: true, opacity: 0.8, depthWrite: false });
function dropMeteor() {
  let x, z;
  const live = buildings.filter((b) => !b.dead);
  if (live.length && Math.random() < 0.6) { const b = live[Math.floor(Math.random() * live.length)]; x = b.x + (Math.random() - 0.5) * 2; z = b.z + (Math.random() - 0.5) * 2; }
  else { const a = Math.random() * TAU, r = 5 + Math.random() * (COLONY - 7); x = Math.cos(a) * r; z = Math.sin(a) * r; }
  const mark = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.4, 40), markMat.clone()); mark.rotation.x = -Math.PI / 2; mark.position.set(x, 0.1, z); scene.add(mark);
  const m = mesh(new THREE.DodecahedronGeometry(0.75, 1), meteorMat, x + 10, 28, z - 7); scene.add(m);
  meteors.push({ m, mark, x, z, t: 0, dur: 1.7 });
  AU.sfx('meteor', panX(x), vol(x, z));
}
function impact(me) {
  fx.explode(V(me.x, 0.4, me.z), 0xff9f5a, 1.3); S.shake = Math.max(S.shake, 0.4);
  AU.sfx('boom', panX(me.x), vol(me.x, me.z));
  for (const b of buildings) if (!b.dead && dist2(b.x, b.z, me.x, me.z) < 2.4 + b.r * 0.5) damage(b, 25);
  for (const u of liveUnits()) if (dist2(u.g.position.x, u.g.position.z, me.x, me.z) < 2.4) damage(u, 30);
  if (dist2(0, 0, me.x, me.z) < CORE_T.r + 1.5) damage(CORE_T, 15);
  if (Math.random() < 0.55) { const s = spawn('shard'); s.scale.setScalar(1.3); s.position.set(me.x, 0.5, me.z); scene.add(s); shards.push({ m: s, ph: Math.random() * 6 }); }
}

// ======================= phases =======================
function spawnScraps(n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, r = 6 + Math.random() * (WORLD - 9);
    const m = spawn('scrap'); m.scale.setScalar(1.6); m.position.set(Math.cos(a) * r, 0.45, Math.sin(a) * r);
    scene.add(m); scraps.push({ m, ph: Math.random() * 6 });
  }
}
function startDay() {
  S.phase = 'day'; S.t = DAY_LEN; mixTarget = 0; S.meteorDone = false; S.meteorQueue = []; S.mclock = 0;
  S.meteorAt = G.nights >= 1 && Math.random() < 0.4 ? DAY_LEN * (0.35 + Math.random() * 0.35) : -1;
  spawnScraps(3); updateHint();
}
function pickType(n) {
  const w = [['bicho', 1]];
  if (n >= 2) w.push(['veloz', 0.3], ['escupidor', 0.35]);
  if (n >= 3) w.push(['volador', 0.3]);
  if (n >= 4) w.push(['acorazado', 0.25]);
  let tot = 0; w.forEach((x) => { tot += x[1]; });
  let r = Math.random() * tot;
  for (const [t, k] of w) { r -= k; if (r <= 0) return t; }
  return 'bicho';
}
function startNight() {
  if (S.placing) stopPlacing();
  $('#shop').hidden = true; $('#corePanel').hidden = true; $('#bPanel').hidden = true; selRing.visible = false;
  if (!S.rifts.length) makeRifts();
  const n = G.nights + 1;
  let total = Math.round(6 + n * 2.4 + defenseScore() * 0.5);
  if (G.nestKilled) total = Math.round(total * 0.75);
  G.nestKilled = false;
  const q = [];
  for (let i = 0; i < total; i++) { const r = S.rifts[i % S.rifts.length]; q.push({ type: pickType(n), x: r.x + (Math.random() - 0.5) * 3, z: r.z + (Math.random() - 0.5) * 3 }); }
  if (G.pois.nest.alive) for (let i = 0; i < 4; i++) q.push({ type: pickType(n), x: NEST.x + (Math.random() - 0.5) * 3, z: NEST.z + (Math.random() - 0.5) * 3 });
  for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const tmp = q[i]; q[i] = q[j]; q[j] = tmp; }
  const boss = n % 5 === 0;
  if (boss) { const r = S.rifts[0]; q.unshift({ type: 'jefe', x: r.x, z: r.z }); }
  S.queue = q; S.wave = { n, total: q.length }; S.spawnT = 0.6; S.spawnEvery = SPAWN_WINDOW / q.length; S.phase = 'night'; mixTarget = 1;
  aliens.forEach((a) => { a.guard = null; });
  banner('NOCHE ' + n, boss ? '¡La reina de la colmena viene a por el reactor!' : 'Protege el núcleo hasta el amanecer', 'night');
  AU.sfx('night');
  if (boss) S.shake = 0.5;
  story.event('night', n, boss);
  updateHint();
}
function clearHostiles() {
  aliens.slice().forEach((a) => { fx.goo(a.g.position.clone().setY(0.6), a.d.col, 0.6); removeAlien(a); });
  [bullets, acids, shells].forEach((arr) => { arr.forEach((b) => scene.remove(b.m)); arr.length = 0; });
}
function dawn(win) {
  clearHostiles(); clearRifts(); restoreAll(); S.coreHp = coreMax();
  if (CMD.dead) respawnCmd();
  const bk = barracks();
  fallen.splice(0).forEach((u) => { u.dead = false; u.hp = u.max; u.g.visible = true; u.g.position.set((bk ? bk.x : 0) + (Math.random() - 0.5) * 2, 0, (bk ? bk.z : 4) + 2.5); troops.push(u); });
  if (win) {
    const n = S.wave.n, rs = 25 + n * 8, rc = 1 + (n % 3 === 0 ? 1 : 0);
    G.nights++; G.scrap += rs; G.crys += rc;
    banner('AMANECE', 'Noche ' + n + ' superada · +' + rs + ' chatarra · +' + rc + ' cristales', 'day');
    AU.sfx('dawn');
  } else {
    const lost = Math.floor(G.scrap * 0.3); G.scrap -= lost;
    banner('LA COLONIA HA CAÍDO', 'Pierdes ' + lost + ' de chatarra · Reconstruyendo al amanecer', 'night');
    AU.sfx('down');
  }
  refreshShip();
  if (refreshPois()) setTimeout(() => toast('Han aparecido cosas nuevas fuera de la colonia', 'new'), 2800);
  persist(); startDay();
  story.event(win ? 'dawn' : 'lost', G.nights);
}
function respawnCmd() {
  CMD.dead = false; CMD.hp = CMD.max; CMD.m.rotation.x = 0; CMD.m.position.y = 0; CMD.g.position.set(0, 0, 4.6);
  fx.rise(V(0, 0.5, 4.6), 0x7dffb0, 18); updateHint();
}

// ======================= input =======================
const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (!started || !S || cinematic) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { if (S.placing) stopPlacing(); $('#shop').hidden = true; $('#corePanel').hidden = true; $('#bPanel').hidden = true; $('#menuPanel').hidden = true; selRing.visible = false; return; }
  if (anyPanelOpen()) return;
  keys.add(k);
  if (k === 'b') { if ($('#shop').hidden) openShop(); else $('#shop').hidden = true; }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floor = new THREE.Plane(V(0, 1, 0), 0);
function setRay(x, y) { ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); }
function groundPoint(x, y) { setRay(x, y); const out = V(0, 0, 0); return ray.ray.intersectPlane(floor, out) ? out : null; }
function pickAt(x, y) {
  setRay(x, y);
  const list = buildings.filter((b) => !b.dead).map((b) => b.g); list.push(coreG);
  const hits = ray.intersectObjects(list, true);
  for (const h of hits) { let o = h.object; while (o) { if (o.userData.b) return o.userData.b; if (o.userData.core) return 'core'; o = o.parent; } }
  const p = groundPoint(x, y);
  if (p) { const b = buildings.find((bb) => dist2(bb.x, bb.z, p.x, p.z) < bb.r + 0.3); if (b) return b; if (Math.hypot(p.x, p.z) < CORE_T.r) return 'core'; }
  return null;
}
let joy = null, down = null;
const stick = $('#stick'), knob = $('#knob');
canvas.addEventListener('pointerdown', (e) => {
  if (!started || !S || anyPanelOpen() || cinematic) return;
  if (!$('#shop').hidden) { $('#shop').hidden = true; return; }
  if (S.placing) { const p = groundPoint(e.clientX, e.clientY); if (p) tryPlace(p); return; }
  down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
  joy = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  stick.style.left = e.clientX + 'px'; stick.style.top = e.clientY + 'px'; knob.style.transform = '';
});
canvas.addEventListener('pointermove', (e) => {
  if (S && S.placing && !isTouch) {
    const p = groundPoint(e.clientX, e.clientY);
    if (p) { const x = snap(p.x), z = snap(p.z); ghost.position.set(x, 0, z); ghost.visible = true; ghostMat.color.set(placeProblem(S.placing, x, z) ? 0xff6b5e : 0x7dffb0); }
  }
  if (joy && e.pointerId === joy.id) {
    let dx = (e.clientX - joy.x) / 50, dy = (e.clientY - joy.y) / 50; const l = Math.hypot(dx, dy);
    if (l > 0.2) stick.hidden = false;
    if (l > 1) { dx /= l; dy /= l; }
    joy.dx = dx; joy.dy = dy; knob.style.transform = 'translate(' + dx * 34 + 'px,' + dy * 34 + 'px)';
  }
});
const endPointer = (e) => {
  if (down && e.pointerId === down.id) {
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
    if (moved < 10 && dt < 400 && e.type === 'pointerup') {
      const hit = pickAt(e.clientX, e.clientY);
      if (hit === 'core') openCore(); else if (hit) openBuilding(hit);
    }
    down = null;
  }
  if (joy && e.pointerId === joy.id) { joy = null; stick.hidden = true; }
};
canvas.addEventListener('pointerup', endPointer); canvas.addEventListener('pointercancel', endPointer);

function closeSel() { selRing.visible = false; selected = null; }
$('#buildBtn').addEventListener('click', openShop);
$('#shopClose').addEventListener('click', () => { $('#shop').hidden = true; });
$('#placeDone').addEventListener('click', stopPlacing);
$('#coreBtn').addEventListener('click', openCore);
$('#cpClose').addEventListener('click', () => { $('#corePanel').hidden = true; closeSel(); });
$('#cpUpgrade').addEventListener('click', upgradeCore);
$('#bpClose').addEventListener('click', () => { $('#bPanel').hidden = true; closeSel(); });
$('#bpUpgrade').addEventListener('click', upgradeBuilding);
$('#nightBtn').addEventListener('click', () => { if (S && S.phase === 'day') startNight(); });
$('#squadBtn').addEventListener('click', () => {
  if (S.squad === 'follow') { S.squad = 'hold'; S.hold = { x: player.position.x, z: player.position.z }; holdFlag.position.set(S.hold.x, 0, S.hold.z); holdFlag.visible = true; toast('Tus tropas defienden esta zona', 'good'); }
  else { S.squad = 'follow'; holdFlag.visible = false; toast('Tus tropas te siguen', 'good'); }
  AU.sfx('click');
});
$('#rpClose').addEventListener('click', closeReport);
$('#menuBtn').addEventListener('click', () => { $('#resetConfirm').hidden = true; $('#resetBox').hidden = false; $('#menuPanel').hidden = false; AU.sfx('click'); });
$('#menuClose').addEventListener('click', () => { $('#menuPanel').hidden = true; });
$('#simBtn').addEventListener('click', () => { $('#menuPanel').hidden = true; if (S.phase === 'night') dawn(true); simulateAway(2 * 3600); });
$('#resetBtn').addEventListener('click', () => { $('#resetBox').hidden = true; $('#resetConfirm').hidden = false; });
$('#resetNo').addEventListener('click', () => { $('#resetConfirm').hidden = true; $('#resetBox').hidden = false; });
$('#resetYes').addEventListener('click', () => { try { localStorage.removeItem(SAVE_KEY); OLD_KEYS.forEach((k) => localStorage.removeItem(k)); } catch (e) {} location.reload(); });
const muteBtn = $('#muteBtn');
function syncMute() { muteBtn.querySelector('use').setAttribute('href', AU.isMuted() ? '#i-mute' : '#i-sound'); muteBtn.setAttribute('aria-label', AU.isMuted() ? 'Activar sonido' : 'Silenciar'); }
muteBtn.addEventListener('click', () => { AU.unlockAudio(); AU.setMuted(!AU.isMuted()); syncMute(); });
syncMute();
if (isTouch) $('#moveHelp').textContent = 'Arrastra el dedo por la pantalla.';
if (!isNew) $('#startBtn').textContent = 'Volver a la colonia';

// ======================= boot =======================
buildCore(G.coreLv);
S = { phase: 'day', t: DAY_LEN, coreHp: 0, wave: null, queue: [], spawnT: 0, spawnEvery: 1, placing: null, shake: 0, rifts: [], squad: 'follow', hold: null, meteorAt: -1, meteorDone: false, meteorQueue: [], mclock: 0 };
S.coreHp = coreMax();
if (isNew) {
  [[-6, 4], [6, 4], [-6, -4], [6, -4]].forEach(([x, z]) => addBuilding('muro', x, z, 1));
  addBuilding('torreta', 0, 6, 1); addBuilding('mina', -8, 0, 1);
} else {
  G.buildings.forEach((b) => { if (DEF[b.t]) addBuilding(b.t, b.x, b.z, b.lv || 1, b.store); });
  const c = barracks();
  if (c) {
    const cap = CAP[c.lv - 1]; let n = 0;
    for (const type of ['soldado', 'ingeniero']) for (let i = 0; i < (G.troops[type] || 0) && n < cap; i++, n++) spawnTroop(type, c.x + (Math.random() - 0.5) * 3, c.z + 2.5);
  }
}
const awaySec = isNew || migrated ? 0 : (Date.now() - (G.lastSeen || Date.now())) / 1000;
player.position.set(3, 0, 9.5);
spawnScraps(isNew ? 5 : 4);
if (isNew) { scraps[0].m.position.set(3, 0.45, 9); scraps[1].m.position.set(-4, 0.45, 10); scraps[2].m.position.set(7, 0.45, 2); }
startDay();

// story, intro cinematic and ARIA lines
function setColonyVisible(v) {
  coreG.visible = v; player.visible = v; holdFlag.visible = v && S.squad === 'hold';
  buildings.forEach((b) => { b.g.visible = v && !b.dead; if (b.rubble) b.rubble.visible = v; });
  troops.forEach((u) => { u.g.visible = v; }); workers.forEach((w) => { w.g.visible = v; }); scraps.forEach((s) => { s.m.visible = v; });
  W.colony.forEach((o) => { o.visible = v; });
}
const story = createStory({ setColonyVisible, G, S: () => S, scene, camera, fx, AU, W, spawn, persist, banner, toast, SHIP_GOAL, setCinematic: (v) => { cinematic = v; if (started) { $('#hud').hidden = v; $('#controls').hidden = v; } }, refreshShip, look });

function enterGame() {
  $('#startScreen').hidden = true; $('#hud').hidden = false; $('#controls').hidden = false; started = true;
  updateHint();
  if (migrated && !G.story.migratedNote) {
    G.story.migratedNote = 1;
    showReport('Novedades', 'Colonia Nova · edición Esperanza', [
      ['new', 'Tu colonia de la versión 3 se ha cargado tal cual.'],
      ['new', 'Todo el mundo está hecho de nuevo en 3D con Blender, con animaciones, luces, efectos y sonido.'],
      ['new', 'Hay historia: los restos de la nave Esperanza están junto a la colonia y se reparan con cada noche superada.'],
    ]);
  }
  persist();
  if (awaySec > 120) simulateAway(awaySec);
  else banner('DÍA ' + (G.nights + 1), 'Prepara la colonia antes del ataque', 'day');
  story.begin();
}
$('#startBtn').addEventListener('click', () => {
  AU.unlockAudio(); AU.sfx('click');
  if (!G.story.intro) { $('#startScreen').hidden = true; story.playIntro(() => { G.story.intro = 1; persist(); enterGame(); }); }
  else enterGame();
});
$('#storyBtn').addEventListener('click', () => { AU.unlockAudio(); $('#startScreen').hidden = true; story.playIntro(() => { G.story.intro = 1; persist(); enterGame(); }); });
$('#replayBtn').addEventListener('click', () => { $('#menuPanel').hidden = true; $('#hud').hidden = true; $('#controls').hidden = true; story.playIntro(() => { $('#hud').hidden = false; $('#controls').hidden = false; }); });
setInterval(() => { if (started) persist(); }, 5000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && started) persist(); });
window.addEventListener('pagehide', () => { if (started) persist(); });

// ======================= update =======================
function pushOut(o, x, z, r) {
  const dx = o.position.x - x, dz = o.position.z - z, d = Math.hypot(dx, dz);
  if (d < r && d > 0.001) { o.position.x = x + dx / d * r; o.position.z = z + dz / d * r; return true; }
  return false;
}
function collideStatic(o, rad) {
  pushOut(o, 0, 0, CORE_T.r + rad);
  for (const b of buildings) if (!b.dead) pushOut(o, b.x, b.z, b.r + rad);
  if (!G.shipGone) for (const c of W.shipCol) pushOut(o, c.x, c.z, c.r + rad);
  const r = Math.hypot(o.position.x, o.position.z);
  if (r > WORLD - 0.8) { o.position.x *= (WORLD - 0.8) / r; o.position.z *= (WORLD - 0.8) / r; }
}
function moveTo(o, gx, gz, speed, dt, stopAt) {
  const dx = gx - o.position.x, dz = gz - o.position.z, d = Math.hypot(dx, dz);
  if (d <= (stopAt || 0.25)) return false;
  const st = Math.min(d, speed * dt); o.position.x += dx / d * st; o.position.z += dz / d * st;
  return true;
}

let ambT = 0, shipSmokeT = 0;
function updateAmbient(dt, time) {
  if (coreGem) { coreGem.rotation.y += dt; coreGem.position.y = coreGem.userData.baseY + Math.sin(time * 2) * 0.15; }
  coreRings.forEach((r, i) => { r.rotation.z += dt * (0.6 + i * 0.25) * (i % 2 ? -1 : 1); r.position.y = coreGem.position.y; });
  if (coreBeacon) coreBeacon.visible = Math.sin(time * 4) > -0.3;
  if (coreHitT > 0) { coreHitT -= dt; coreG.scale.setScalar(1 + Math.max(0, coreHitT) * 0.2); } else coreG.scale.setScalar(1);
  for (const s of scraps) { s.m.rotation.y += dt * 1.5; s.m.position.y = 0.45 + Math.sin(time * 3 + s.ph) * 0.08; }
  for (const s of shards) { s.m.rotation.y += dt * 2; s.m.position.y = 0.55 + Math.sin(time * 3 + s.ph) * 0.12; }
  for (const b of buildings) {
    if (b.popT > 0) { b.popT -= dt; const k = 1 - Math.max(0, b.popT) / 0.35; b.g.scale.setScalar(b.baseScale * Math.max(0.01, 1 - Math.pow(1 - k, 3) + Math.sin(k * Math.PI) * 0.15)); continue; }
    if (b.t === 'mina') {
      if (!b.dead) { b.drill.rotation.y += dt * 6; if (Math.random() < dt * 3) fx.puff(V(b.x + (Math.random() - 0.5), 0.3, b.z + (Math.random() - 0.5)), 0xb08a68, 1, 0.8, 0.6, 0.9, 0.35); }
      b.pile.scale.setScalar(0.4 + (b.store / capOf(b)) * 1.1);
      b.icon.visible = b.store >= 10 && !b.dead; b.icon.position.y = 3.3 + Math.sin(time * 3 + b.x) * 0.15; b.icon.rotation.y += dt * 2;
    }
    if (b.flag) b.flag.rotation.y = Math.sin(time * 3 + b.x) * 0.25;
    if (b.ring) { b.ring.rotation.z += dt * 2; b.crystal.rotation.y += dt * 1.5; b.crystal.position.y = 2.85 + Math.sin(time * 2 + b.x) * 0.08; }
    if (b.beam && b.beamT > 0) { b.beamT -= dt; if (b.beamT <= 0) b.beam.visible = false; }
    if (b.hitT > 0) { b.hitT -= dt; const k = 1 + Math.max(0, b.hitT) * 0.5; b.g.scale.set(b.baseScale * k, b.baseScale / k, b.baseScale * k); } else if (!b.dead) b.g.scale.setScalar(b.baseScale);
    if (b.dead) { b.smokeT -= dt; if (b.smokeT <= 0) { b.smokeT = 0.25; fx.puff(V(b.x, 0.4, b.z), 0x2a2522, 1, 1.6, 1.8, 2.2, 0.5); } }
    if (!b.dead && b.hp < b.max * 0.4 && Math.random() < dt * 4) fx.puff(V(b.x, b.h * 0.7, b.z), 0x3a332e, 1, 0.9, 1.2, 1.4, 0.45);
  }
  const pulse = 0.38 + Math.sin(time * 2) * 0.12;
  DEP.forEach((D) => { D.col.material.opacity = pulse; if (D.data.ready && Math.random() < dt * 3) fx.rise(V(D.data.x, 0.6, D.data.z), 0x6fe3ff, 1, 1.4); });
  NEST.col.material.opacity = pulse; NEST.eye.scale.setScalar(1 + Math.sin(time * 3) * 0.12);
  WRECK.col.material.opacity = pulse;
  if (S) S.rifts.forEach((r, i) => {
    r.ring.rotation.z -= dt * 1.6; r.tor.scale.setScalar(1 + Math.sin(time * 4 + i) * 0.06);
    if (Math.random() < dt * 14) { const a = Math.random() * TAU; fx.rise(V(r.x + Math.cos(a) * 1.6, 0.2, r.z + Math.sin(a) * 1.6), 0xd46bff, 1, 0.3); }
  });
  riftMat.opacity = 0.5 + Math.sin(time * 5) * 0.12;
  holdRing.rotation.z += dt * 0.5;
  // ship wreck smoulders until the colonists have made progress on it
  if (!G.shipGone && G.nights < 6) { shipSmokeT -= dt; if (shipSmokeT <= 0) { shipSmokeT = 0.35; const p = W.shipSmoke[Math.floor(Math.random() * W.shipSmoke.length)]; fx.puff(p, 0x2e2a2a, 1, 2.4, 2.2, 4, 0.45); } }
  // drifting motes around the player for depth; spores glow at night
  ambT -= dt;
  if (ambT <= 0) {
    ambT = 0.08;
    const a = Math.random() * TAU, r = 4 + Math.random() * 16;
    const c = mix > 0.5 ? (Math.random() < 0.5 ? 0x6fe3ff : 0xc77dff) : 0xfff0d0;
    fx.glow.emit(look.x + Math.cos(a) * r, 0.5 + Math.random() * 3, look.z + Math.sin(a) * r, (Math.random() - 0.5) * 0.6, 0.15, (Math.random() - 0.5) * 0.6, ...rgbOf(c), mix > 0.5 ? 0.9 : 0.35, mix > 0.5 ? 0.22 : 0.12, 3 + Math.random() * 2);
  }
}
const _rc = new THREE.Color();
function rgbOf(hex) { _rc.set(hex); return [_rc.r, _rc.g, _rc.b]; }

let hudT = 0;
function update(dt, time) {
  updateAmbient(dt, time);
  mix += (mixTarget - mix) * Math.min(1, dt * 1.2);
  const duskTarget = cinematic ? story.dusk() : (S && S.phase === 'day' && S.t < 22 ? (1 - S.t / 22) * 0.85 : 0);
  dusk += (duskTarget - dusk) * Math.min(1, dt * 1.5);
  applyPalette();
  // creature and unit animation always runs (also behind menus and in cinematics)
  for (const a of aliens) a.anim.update(dt);
  if (!started || !S || anyPanelOpen() || cinematic) { idleAnims(dt); return; }
  hurtFlash = Math.max(0, hurtFlash - dt * 1.4);
  $('#hurt').style.opacity = (hurtFlash * 0.8).toFixed(3);

  for (const b of buildings) if (b.t === 'mina' && !b.dead) b.store = Math.min(capOf(b), b.store + prodOf(b) * dt);

  if (S.phase === 'day') {
    S.t -= dt;
    if (S.t <= 20 && !S.rifts.length) makeRifts();
    if (S.meteorAt > 0 && !S.meteorDone && S.t <= S.meteorAt) { startMeteors(); S.mclock = 0; }
    if (S.t <= 0) startNight();
  } else {
    S.spawnT -= dt;
    if (S.queue.length && S.spawnT <= 0) { const q = S.queue.shift(); spawnAlien(q.type, q.x, q.z); S.spawnT = S.spawnEvery; }
    if (!S.queue.length && !aliens.some((a) => !a.guard)) { dawn(true); return; }
  }
  if (S.meteorQueue.length) {
    S.mclock += dt;
    while (S.meteorQueue.length && S.meteorQueue[0] <= S.mclock) { S.meteorQueue.shift(); dropMeteor(); }
  }

  // ---- commander
  let mx = 0, mz = 0;
  if (CMD.dead) {
    CMD.respawnT -= dt;
    if (CMD.respawnT <= 0) { respawnCmd(); toast('Tu comandante ha vuelto al núcleo', 'good'); }
  } else {
    if (keys.has('w') || keys.has('arrowup')) mz -= 1;
    if (keys.has('s') || keys.has('arrowdown')) mz += 1;
    if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
    if (keys.has('d') || keys.has('arrowright')) mx += 1;
    if (joy) { mx += joy.dx; mz += joy.dy; }
  }
  const ml = Math.hypot(mx, mz), moving = ml > 0.05 && !CMD.dead;
  if (moving) { const k = Math.min(1, ml) / ml * 7.5 * dt; player.position.x += mx * k; player.position.z += mz * k; if (Math.random() < dt * 8) fx.puff(V(player.position.x, 0.1, player.position.z), 0xc09a74, 1, 0.5, 0.4, 0.6, 0.35); }
  let armed = false;
  if (!CMD.dead) {
    collideStatic(player, 0.45);
    if (S.phase === 'day') CMD.hp = Math.min(CMD.max, CMD.hp + 5 * dt);
    for (let i = scraps.length - 1; i >= 0; i--) {
      const s = scraps[i];
      if (dist2(s.m.position.x, s.m.position.z, player.position.x, player.position.z) < 1.4) {
        G.scrap += 8; G.tut.scrap = Math.min(3, G.tut.scrap + 1); fx.sparks(s.m.position, 0xf2b84b, 10, 3, 4); fx.flashAt(s.m.position, 0xf2b84b, 2, 0.12); AU.sfx('pickup'); popRes('scrap');
        scene.remove(s.m); scraps.splice(i, 1); story.event('scrap');
      }
    }
    for (let i = shards.length - 1; i >= 0; i--) { const s = shards[i]; if (dist2(s.m.position.x, s.m.position.z, player.position.x, player.position.z) < 1.4) { G.crys += 1; fx.sparks(s.m.position, 0x6fe3ff, 12, 3, 4); AU.sfx('crystal'); popRes('crystal'); scene.remove(s.m); shards.splice(i, 1); toast('+1 cristal', 'new'); } }
    for (const b of buildings) {
      if (b.t === 'mina' && !b.dead && b.store >= 5 && dist2(b.x, b.z, player.position.x, player.position.z) < b.r + 1.6) {
        const n = Math.floor(b.store); G.scrap += n; b.store -= n; fx.sparks(V(b.x, 1.5, b.z), 0xf2b84b, 10); AU.sfx('pickup'); popRes('scrap'); toast('+' + n + ' de chatarra', 'gold');
      }
    }
    DEP.forEach((D) => {
      if (!D.data.ready) { D.prog = 0; return; }
      if (dist2(D.data.x, D.data.z, player.position.x, player.position.z) < 2.6) {
        D.prog += dt / 2.5;
        if (Math.random() < dt * 10) fx.sparks(V(D.data.x + (Math.random() - 0.5), 1, D.data.z + (Math.random() - 0.5)), 0x6fe3ff, 1, 2, 2, 0.25);
        if (Math.random() < dt * 8) AU.sfx('repair');
        if (D.prog >= 1) {
          D.prog = 0; D.data.ready = false; D.data.regrow = G.nights + 2; G.crys += 2;
          fx.ring(V(D.data.x, 0.6, D.data.z), 0x6fe3ff, 30, 6); fx.rise(V(D.data.x, 0.6, D.data.z), 0x6fe3ff, 20); AU.sfx('crystal'); popRes('crystal');
          refreshDeposit(D); toast('+2 cristales · el yacimiento volverá en 2 noches', 'new'); persist(); story.event('crystal');
        }
      } else D.prog = Math.max(0, D.prog - dt);
    });
    const w = G.pois.wreck, ca = crateAt();
    if (w.ready && dist2(ca.x, ca.z, player.position.x, player.position.z) < 2.4) {
      const s = 50 + Math.floor(Math.random() * 40), c = Math.random() < 0.35 ? 1 : 0;
      G.scrap += s; G.crys += c; w.ready = false; w.regrow = G.nights + 2; placeWreck();
      fx.sparks(V(ca.x, 1, ca.z), 0xf2b84b, 24, 4, 5); AU.sfx('pickup'); popRes('scrap');
      toast('Restos de nave: +' + s + ' de chatarra' + (c ? ' y +1 cristal' : ''), 'gold'); persist(); story.event('wreck');
    }
    if (G.pois.nest.alive && dist2(NEST.x, NEST.z, player.position.x, player.position.z) < 13) story.event('nestSeen');
    if (!G.shipGone && dist2(W.shipSpot.x, W.shipSpot.z, player.position.x, player.position.z) < 12) story.event('shipSeen');
  }
  CMD.cd -= dt;
  if (!CMD.dead) {
    const pt = nearestAlien(player.position.x, player.position.z, PLAYER_RANGE);
    if (pt) {
      armed = true;
      player.rotation.y = Math.atan2(pt.g.position.x - player.position.x, pt.g.position.z - player.position.z);
      if (CMD.cd <= 0) { fire(player.position.x, 1.15, player.position.z, pt.g.position.x, pt.g.position.z, 'player', 1, CMD); CMD.cd = 0.3; }
    } else if (G.pois.nest.alive && dist2(NEST.x, NEST.z, player.position.x, player.position.z) < PLAYER_RANGE + 1.6) {
      armed = true;
      player.rotation.y = Math.atan2(NEST.x - player.position.x, NEST.z - player.position.z);
      if (CMD.cd <= 0) { fire(player.position.x, 1.15, player.position.z, NEST.x, NEST.z, 'player', 1, CMD); CMD.cd = 0.3; }
    } else if (moving) player.rotation.y = Math.atan2(mx, mz);
  }
  animUnit(CMD, moving, 7.5, armed || S.phase === 'night', false, dt);

  // ---- nest guards (day)
  if (G.pois.nest.alive && S.phase === 'day' && !CMD.dead) {
    NEST.guardT -= dt;
    const near = dist2(NEST.x, NEST.z, player.position.x, player.position.z) < 11;
    if (near && NEST.guardT <= 0 && aliens.filter((a) => a.guard).length < 3) { spawnAlien(G.nights >= 2 && Math.random() < 0.4 ? 'escupidor' : 'bicho', NEST.x + (Math.random() - 0.5) * 2, NEST.z + (Math.random() - 0.5) * 2, NEST); NEST.guardT = 3; }
  }

  // ---- troops
  const anchor = S.squad === 'hold' && S.hold ? S.hold : { x: player.position.x, z: player.position.z };
  troops.forEach((u, i) => {
    const p = u.g.position; let gx = null, gz = null, tArmed = false, working = false;
    u.cd -= dt;
    let job = null;
    if (u.type === 'ingeniero') {
      let best = null, bd = 11;
      for (const b of buildings) { if (b.dead || b.hp >= b.max) continue; const d = dist2(b.x, b.z, anchor.x, anchor.z); if (d < bd) { bd = d; best = b; } }
      if (!best && S.coreHp < coreMax() && dist2(0, 0, anchor.x, anchor.z) < 11) best = CORE_T;
      job = best;
    }
    const foe = nearestAlien(anchor.x, anchor.z, 9);
    if (job) {
      gx = job.x; gz = job.z;
      if (dist2(job.x, job.z, p.x, p.z) < (job.r || 1) + 1.1) {
        gx = p.x; gz = p.z; working = true;
        if (job.isCore) S.coreHp = Math.min(coreMax(), S.coreHp + u.td.repair * 0.6 * dt); else job.hp = Math.min(job.max, job.hp + u.td.repair * dt);
        if (Math.random() < dt * 8) fx.sparks(V(job.x + (Math.random() - 0.5), 1.2, job.z + (Math.random() - 0.5)), 0x7dffb0, 2, 2, 2, 0.25);
        if (Math.random() < dt * 4) AU.sfx('repair', panX(p.x), vol(p.x, p.z) * 0.6);
        u.g.rotation.y = Math.atan2(job.x - p.x, job.z - p.z);
      }
    } else if (foe) {
      const d = dist2(foe.g.position.x, foe.g.position.z, p.x, p.z);
      tArmed = true; u.g.rotation.y = Math.atan2(foe.g.position.x - p.x, foe.g.position.z - p.z);
      if (d > u.td.range) { gx = foe.g.position.x; gz = foe.g.position.z; } else { gx = p.x; gz = p.z; }
      if (u.cd <= 0 && d < u.td.range + 0.5) { fire(p.x, 0.95, p.z, foe.g.position.x, foe.g.position.z, 'troop', u.td.dmg, u); u.cd = u.td.rate; }
    }
    if (gx === null) {
      const n = troops.length;
      if (S.squad === 'follow') { const ang = player.rotation.y + Math.PI + (i - (n - 1) / 2) * 0.55; const rr = 2.2 + Math.floor(i / 5) * 1.2; gx = anchor.x + Math.sin(ang) * rr; gz = anchor.z + Math.cos(ang) * rr; }
      else { const ang = i / Math.max(1, n) * TAU; gx = anchor.x + Math.sin(ang) * 1.8; gz = anchor.z + Math.cos(ang) * 1.8; }
    }
    u.moving = moveTo(u.g, gx, gz, 5.5, dt, 0.3);
    if (u.moving && !tArmed) u.g.rotation.y = Math.atan2(gx - p.x, gz - p.z);
    collideStatic(u.g, 0.35);
    animUnit(u, u.moving, 5.5, tArmed || (u.type === 'soldado' && S.phase === 'night'), working, dt);
    if (u.hp < u.max) setBar(u.bar, u.hp / u.max, p.x, 1.85, p.z); else u.bar.g.visible = false;
  });

  // ---- workers
  for (const w of workers) {
    const p = w.g.position, h = w.home;
    if (S.phase === 'night') {
      w.load = 0; w.carry.visible = false; w.state = 'idle';
      if (moveTo(w.g, h.x, h.z, 4, dt, 0.6)) { w.g.visible = true; w.moving = true; w.g.rotation.y = Math.atan2(h.x - p.x, h.z - p.z); } else { w.g.visible = false; w.moving = false; }
      animUnit(w, w.moving, 4, false, false, dt);
      continue;
    }
    w.g.visible = true;
    if (w.state === 'idle') {
      const mines = buildings.filter((b) => b.t === 'mina' && !b.dead && b.store >= 8);
      if (mines.length) { mines.sort((a, b) => b.store - a.store); w.mine = mines[Math.floor(Math.random() * Math.min(2, mines.length))]; w.state = 'toMine'; }
      else {
        w.wait -= dt;
        if (w.wait <= 0) { const a = Math.random() * TAU, r = 2 + Math.random() * 2.5; w.tx = h.x + Math.cos(a) * r; w.tz = h.z + Math.sin(a) * r; w.wait = 2 + Math.random() * 3; }
      }
    }
    let gx = w.tx, gz = w.tz, stop = 0.3;
    if (w.state === 'toMine') {
      if (w.mine.dead) { w.state = 'idle'; continue; }
      gx = w.mine.x; gz = w.mine.z; stop = w.mine.r + 0.7;
      if (dist2(gx, gz, p.x, p.z) <= stop + 0.05) { const take = Math.min(Math.floor(w.mine.store), 20); w.mine.store -= take; w.load = take; w.carry.visible = take > 0; w.state = take > 0 ? 'toCore' : 'idle'; }
    } else if (w.state === 'toCore') {
      gx = 0; gz = 0; stop = CORE_T.r + 0.7;
      if (dist2(0, 0, p.x, p.z) <= stop + 0.05) { G.scrap += w.load; w.load = 0; w.carry.visible = false; fx.sparks(V(p.x, 1, p.z), 0xf2b84b, 6); popRes('scrap'); w.state = 'idle'; }
    }
    w.moving = moveTo(w.g, gx, gz, 3.6, dt, stop);
    if (w.moving) w.g.rotation.y = Math.atan2(gx - p.x, gz - p.z);
    for (const b of buildings) if (!b.dead && b !== w.mine) pushOut(w.g, b.x, b.z, b.r + 0.3);
    if (w.state !== 'toCore') pushOut(w.g, 0, 0, CORE_T.r + 0.3);
    animUnit(w, w.moving, 3.6, false, false, dt);
  }

  // ---- defenses
  for (const b of buildings) {
    if (b.dead || !b.d.range) continue;
    b.cd -= dt;
    const a = nearestAlien(b.x, b.z, rangeOf(b), b.d.min, b.t === 'mortero');
    if (!a) continue;
    const ang = Math.atan2(a.g.position.x - b.x, a.g.position.z - b.z);
    if (b.head) b.head.rotation.y = ang - b.g.rotation.y;
    if (b.cd > 0) continue;
    b.cd = b.d.rate;
    if (b.t === 'torreta') {
      const side = (b.side = -(b.side || 1)) * 0.17 * b.baseScale;
      const cx = Math.cos(ang), sx = Math.sin(ang);
      fire(b.x + sx * 1.05 + cx * side, 1.05 * b.baseScale, b.z + cx * 1.05 - sx * side, a.g.position.x, a.g.position.z, 'turret', dmgOf(b));
    } else if (b.t === 'laser') {
      const from = V(b.x, 2.85 * b.baseScale, b.z), to = V(a.g.position.x, a.d.fly ? 1.9 : a.d.r, a.g.position.z);
      b.beam.position.copy(from); b.beam.lookAt(to); b.beam.scale.set(1, 1, from.distanceTo(to));
      b.beam.visible = true; b.beamT = 0.07; hurtAlien(a, dmgOf(b));
      fx.flashAt(to, 0x9ff4ff, 0.9, 0.06); if (Math.random() < 0.5) fx.sparks(to, 0x9ff4ff, 2, 3, 2, 0.2);
      AU.sfx('laser', panX(b.x), vol(b.x, b.z) * 0.6);
    } else if (b.t === 'mortero') {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), shellMat); m.position.set(b.x, 1.6, b.z); scene.add(m);
      shells.push({ m, fx: b.x, fz: b.z, tx: a.g.position.x, tz: a.g.position.z, t: 0, dur: 0.9, dmg: dmgOf(b), area: b.d.area });
      fx.muzzle({ x: b.x + Math.sin(ang) * 0.8, y: 1.8, z: b.z + Math.cos(ang) * 0.8 }, 0, 0, 0xff9f5a); fx.puff(V(b.x, 1.6, b.z), 0x5a524a, 3, 1, 1.2, 1, 0.5);
      AU.sfx('mortar', panX(b.x), vol(b.x, b.z)); AU.sfx('whistle', panX(b.x), vol(b.x, b.z) * 0.5);
    }
  }

  // ---- aliens
  for (const a of aliens.slice()) {
    const p = a.g.position, d = a.d;
    a.retarget -= dt;
    if (a.guard) {
      a.tgt = !CMD.dead && dist2(NEST.x, NEST.z, player.position.x, player.position.z) < 15 ? CMD : null;
    } else if (isGone(a.tgt) || a.retarget <= 0) { a.tgt = chooseTarget(a); a.retarget = 0.7; }
    let tx, tz, stop;
    if (a.tgt) { const tp = tpos(a.tgt); tx = tp.x; tz = tp.z; stop = d.range ? d.range : (a.tgt.r || 0.5) + d.r + 0.25; }
    else { tx = NEST.x; tz = NEST.z; stop = 2.5; }
    const dx = tx - p.x, dz = tz - p.z, dd = Math.hypot(dx, dz) || 0.001;
    const want = Math.atan2(dx, dz); let dr = want - a.g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); a.g.rotation.y += dr * Math.min(1, dt * 10);
    let movingNow = false;
    if (dd > stop) {
      const step = d.spd * dt, px = p.x, pz = p.z;
      p.x += dx / dd * step; p.z += dz / dd * step;
      let blocker = null;
      if (!d.fly && a.ghostT <= 0) {
        for (const b of buildings) {
          if (b.dead || b === a.tgt) continue;
          const rr = b.r + d.r, bx = p.x - b.x, bz = p.z - b.z, bd = Math.hypot(bx, bz);
          if (bd < rr && bd > 0.001) { p.x = b.x + bx / bd * rr; p.z = b.z + bz / bd * rr; blocker = b; }
        }
      }
      if (a.tgt !== CORE_T) pushOut(a.g, 0, 0, CORE_T.r + d.r);
      if (a.ghostT > 0) a.ghostT -= dt;
      const moved = Math.hypot(p.x - px, p.z - pz);
      movingNow = moved > step * 0.3;
      if (blocker && moved < step * 0.35) { a.blockT += dt; if (a.blockT > 0.45 && !a.guard) { a.tgt = blocker; a.retarget = 3; a.blockT = 0; } }
      else a.blockT = Math.max(0, a.blockT - dt * 2);
      if (moved < step * 0.15) { a.stillT += dt; if (a.stillT > 2.5) { a.ghostT = 1.5; a.stillT = 0; } } else a.stillT = 0;
    } else if (a.tgt) {
      a.stillT = 0;
      a.atkT -= dt;
      if (a.atkT <= 0) {
        a.atkT = d.rate;
        a.anim.once('Attack', 'Move', Math.max(1, a.anim.actions.Attack.getClip().duration / (d.rate * 0.8)));
        if (d.range) {
          const m = new THREE.Mesh(acidGeo, acidMat); m.position.set(p.x, d.r * 1.2, p.z); scene.add(m);
          acids.push({ m, tgt: a.tgt, dmg: d.dmg, life: 3 });
          AU.sfx('spit', panX(p.x), vol(p.x, p.z) * 0.7);
        } else {
          damage(a.tgt, d.dmg);
          const tp = tpos(a.tgt); fx.sparks(V(tp.x + (p.x - tp.x) * 0.4, 1, tp.z + (p.z - tp.z) * 0.4), d.col, 5, 3, 2, 0.3);
          AU.sfx(a.type === 'acorazado' || a.type === 'jefe' ? 'crash' : 'bite', panX(p.x), vol(p.x, p.z) * 0.7);
        }
      }
    }
    if (a.anim.cur === a.anim.actions.Move) a.anim.actions.Move.timeScale = movingNow ? d.spd / CLIP_SPD[a.type] : 0.35;
    if (d.fly) { a.rig.position.y = 1.9 + Math.sin(time * 4 + a.bob) * 0.2; if (Math.random() < dt * 2) AU.sfx('buzz', panX(p.x), vol(p.x, p.z) * 0.4); }
    if (a.flash > 0) { a.flash -= dt; if (!a.flashing) { a.flashing = true; a.mats.forEach((o) => { o.m.emissive.setHex(0xffffff); o.m.emissiveIntensity = 1.4; }); } }
    else if (a.flashing) { a.flashing = false; a.mats.forEach((o) => { o.m.emissive.copy(o.e); o.m.emissiveIntensity = o.ei; }); }
    if (a.bar) setBar(a.bar, a.hp / a.max, p.x, (d.fly ? 1.9 : 0) + d.r * 2 + 1.1, p.z, BARM.enemy);
  }
  for (let i = 0; i < aliens.length; i++) for (let j = i + 1; j < aliens.length; j++) {
    const A = aliens[i].g.position, B = aliens[j].g.position, rr = aliens[i].d.r + aliens[j].d.r;
    const dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz);
    if (d < rr && d > 0.001) { const k = (rr - d) / 2 / d; A.x -= dx * k; A.z -= dz * k; B.x += dx * k; B.z += dz * k; }
  }
  if (S.coreHp <= 0) { dawn(false); return; }

  // ---- projectiles
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.m.position.addScaledVector(b.v, dt); b.life -= dt;
    fx.trail(b.m.position, BCOL[b.kind], 0.32, 0.12);
    let hit = null;
    for (const a of aliens) if (dist2(a.g.position.x, a.g.position.z, b.m.position.x, b.m.position.z) < a.d.r + 0.3) { hit = a; break; }
    if (hit) { hurtAlien(hit, b.dmg); fx.sparks(b.m.position, hit.d.col, 4, 3, 2, 0.25); }
    else if (G.pois.nest.alive && dist2(NEST.x, NEST.z, b.m.position.x, b.m.position.z) < NEST.r) {
      hit = true; NEST.hp -= b.dmg; NEST.eye.scale.setScalar(1.4); fx.sparks(b.m.position, 0xff4fd8, 4, 3, 2, 0.25);
      if (NEST.hp <= 0) {
        const n = G.pois.nest; n.alive = false; n.regrow = G.nights + 3; NEST.g.visible = false; NEST.col.visible = false; NEST.bar.g.visible = false; G.nestKilled = true;
        G.crys += 3; G.scrap += 30; fx.explode(V(NEST.x, 0.8, NEST.z), 0xff4fd8, 1.6); fx.goo(V(NEST.x, 0.5, NEST.z), 0xff4fd8, 2.5); S.shake = 0.4;
        AU.sfx('bigboom', panX(NEST.x), vol(NEST.x, NEST.z));
        aliens.filter((a) => a.guard).forEach((a) => { fx.goo(a.g.position.clone().setY(0.6), a.d.col, 0.8); removeAlien(a); });
        toast('¡Nido destruido! +3 cristales · esta noche vendrán menos alienígenas', 'good'); persist(); story.event('nestDown');
      }
    }
    if (hit || b.life <= 0) { scene.remove(b.m); bullets.splice(i, 1); }
  }
  for (let i = acids.length - 1; i >= 0; i--) {
    const s = acids[i]; s.life -= dt;
    if (isGone(s.tgt) || s.life <= 0) { scene.remove(s.m); acids.splice(i, 1); continue; }
    const tp = tpos(s.tgt), dx = tp.x - s.m.position.x, dz = tp.z - s.m.position.z, d = Math.hypot(dx, dz);
    fx.trail(s.m.position, 0x9dff4f, 0.45, 0.25);
    if (d < 0.6 + (s.tgt.r || 0) * 0.6) { damage(s.tgt, s.dmg); fx.goo(s.m.position, 0x9dff4f, 0.6); AU.sfx('acid', panX(s.m.position.x), vol(s.m.position.x, s.m.position.z)); scene.remove(s.m); acids.splice(i, 1); continue; }
    const st = 11 * dt; s.m.position.x += dx / d * st; s.m.position.z += dz / d * st; s.m.position.y = 0.8 + Math.min(1.2, d * 0.15);
  }
  for (let i = shells.length - 1; i >= 0; i--) {
    const s = shells[i]; s.t += dt / s.dur;
    const k = Math.min(1, s.t);
    s.m.position.set(s.fx + (s.tx - s.fx) * k, 1.6 + Math.sin(Math.PI * k) * 6, s.fz + (s.tz - s.fz) * k);
    fx.trail(s.m.position, 0xff9f5a, 0.5, 0.3);
    if (s.t >= 1) {
      fx.explode(V(s.tx, 0.3, s.tz), 0xff9f5a, 0.9); AU.sfx('boom', panX(s.tx), vol(s.tx, s.tz) * 0.8);
      aliens.slice().forEach((a) => { if (!a.d.fly && dist2(a.g.position.x, a.g.position.z, s.tx, s.tz) < s.area + a.d.r) hurtAlien(a, s.dmg); });
      scene.remove(s.m); shells.splice(i, 1);
    }
  }
  for (let i = meteors.length - 1; i >= 0; i--) {
    const me = meteors[i]; me.t += dt / me.dur;
    const k = Math.min(1, me.t);
    me.m.position.set(me.x + 10 * (1 - k), 28 * (1 - k) + 0.4, me.z - 7 * (1 - k)); me.m.rotation.x += dt * 5;
    me.mark.material.opacity = 0.5 + Math.sin(me.t * 30) * 0.3;
    fx.trail(me.m.position, 0xffa040, 1.4, 0.3); if (Math.random() < 0.5) fx.puff(me.m.position, 0x3a2a22, 1, 1.2, 0.3, 1.2, 0.5);
    if (me.t >= 1) { impact(me); scene.remove(me.m); scene.remove(me.mark); meteors.splice(i, 1); }
  }

  // ---- bars
  for (const b of buildings) { if (!b.dead && b.hp < b.max) setBar(b.bar, b.hp / b.max, b.x, b.h * b.baseScale + 0.5, b.z); else b.bar.g.visible = false; }
  if (!CMD.dead && CMD.hp < CMD.max) setBar(CMD.bar, CMD.hp / CMD.max, player.position.x, 2.3, player.position.z); else CMD.bar.g.visible = false;
  if (G.pois.nest.alive && NEST.hp < NEST.max) setBar(NEST.bar, NEST.hp / NEST.max, NEST.x, 3.4, NEST.z, BARM.enemy); else NEST.bar.g.visible = false;
  DEP.forEach((D) => { if (D.prog > 0) setBar(D.bar, D.prog, D.data.x, 3, D.data.z, BARM.info); else D.bar.g.visible = false; });
}
function idleAnims(dt) {
  animUnit(CMD, false, 0, false, false, dt);
  troops.forEach((u) => animUnit(u, false, 0, false, false, dt));
  workers.forEach((w) => animUnit(w, false, 0, false, false, dt));
}

const camGoal = V(0, 0, 0);
function updateCamera(dt, time) {
  if (cinematic) { story.camera(dt, time); sun.position.set(camera.position.x - 24, 38, camera.position.z - 4); sun.target.position.set(look.x, 0, look.z); return; }
  if (started) { const r = Math.hypot(player.position.x, player.position.z), k = clamp(0.6 + (r - 10) / 20 * 0.4, 0.6, 1); look.set(player.position.x * k, 0, player.position.z * k); }
  else look.set(-8 + Math.sin(time * 0.08) * 6, 0, Math.cos(time * 0.08) * 6);
  if (started) camGoal.set(look.x, 20.5 * camScale, look.z + 15.5 * camScale);
  else camGoal.set(look.x + 14, 9, look.z + 22);
  camera.position.lerp(camGoal, Math.min(1, dt * (started ? 4 : 1)));
  if (S && S.shake > 0) { S.shake -= dt; if (!reduceMotion) { camera.position.x += (Math.random() - 0.5) * S.shake; camera.position.y += (Math.random() - 0.5) * S.shake * 0.5; camera.position.z += (Math.random() - 0.5) * S.shake; } }
  if (started) camera.lookAt(camera.position.x, 0, camera.position.z - 15.5 * camScale);
  else camera.lookAt(look.x - 4, 3, look.z - 4);
  sun.position.set(camera.position.x - 24, 38, camera.position.z - 4); sun.target.position.set(camera.position.x, 0, camera.position.z - 16);
}

// ======================= loop =======================
const clock = new THREE.Clock();
camera.position.set(6, 9, 22);
$('#loading').hidden = true;
$('#startScreen').hidden = false;
renderer.info.autoReset = false;
renderer.setAnimationLoop(() => {
  renderer.info.reset();
  const raw = clock.getDelta(), dt = Math.min(0.05, raw), time = clock.elapsedTime;
  if (!testPaused) { story.update(Math.min(0.25, raw), time); update(dt, time); fx.update(dt); updateCamera(dt, time); }
  AU.tickMusic();
  hudT -= dt; if (started && !cinematic && hudT <= 0) { hud(); hudT = 0.1; }
  composer.render();
});
// ======================= test hooks (canvas inspector / screenshots) =======================
let testPaused = false;
window.__THREE_GAME_TEST_HOOKS__ = {
  async setState(name) {
    const go = () => { if (!started) { G.story.intro = 1; enterGame(); } $('#reportPanel').hidden = true; $('#aria').hidden = true; };
    if (name === 'title') { return { state: name }; }
    if (name === 'day') { go(); player.position.set(3, 0, 9.5); }
    else if (name === 'night-fight') {
      go(); if (S.phase !== 'night') startNight();
      mix = mixTarget = 1;
      [['bicho', 6, 12], ['veloz', -6, 11], ['escupidor', 1, 14], ['volador', -3, 10], ['acorazado', 9, 9]].forEach(([t, x, z]) => spawnAlien(t, x, z));
    } else if (name === 'boss') {
      go(); if (S.phase !== 'night') startNight(); mix = mixTarget = 1; spawnAlien('jefe', 4, 12); spawnAlien('bicho', -2, 11);
    } else if (name === 'explore') { go(); player.position.set(G.pois.deposits[0].x * 0.9, 0, G.pois.deposits[0].z * 0.9 + 2); }
    else throw new Error('unknown state ' + name);
    for (let i = 0; i < 90; i++) { update(1 / 30, clock.elapsedTime + i / 30); fx.update(1 / 30); updateCamera(1 / 30, clock.elapsedTime); }
    return { state: name };
  },
  setPausedForScreenshot(p) { testPaused = !!p; },
};
Object.defineProperty(window, '__THREE_GAME_DIAGNOSTICS__', { get: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, aliens: aliens.length, phase: S && S.phase }) });
window.__cn = { fallen, G, S: () => S, buildings, aliens, troops, workers, CMD, startNight, dawn, spawnAlien, startMeteors, trainTroop, addBuilding, openBuilding, renderer, story, fx, scene, camera, setMix: (m) => { mix = mixTarget = m; } };
