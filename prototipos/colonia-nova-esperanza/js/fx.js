// Effects: GPU point particles (additive glow and soft smoke), pooled flash lights and
// fading ground decals. Everything is preallocated so combat never allocates per frame.
import * as THREE from '../vendor/three/three.module.min.js';

function radialTexture(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GLOW_TEX = radialTexture([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]);
const SMOKE_TEX = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  for (let i = 0; i < 14; i++) {
    const px = 20 + Math.random() * 24, py = 20 + Math.random() * 24, r = 10 + Math.random() * 14;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();

const VERT = `
attribute float size; attribute vec4 tint;
varying vec4 vTint;
uniform float scale;
void main() {
  vTint = tint;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * scale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform sampler2D map; varying vec4 vTint;
void main() {
  vec4 c = texture2D(map, gl_PointCoord) * vTint;
  if (c.a < 0.01) discard;
  gl_FragColor = c;
}`;

class Particles {
  constructor(scene, max, tex, additive) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4); this.base = new Float32Array(max * 4);
    this.size = new Float32Array(max); this.size0 = new Float32Array(max); this.grow = new Float32Array(max);
    this.life = new Float32Array(max); this.life0 = new Float32Array(max); this.grav = new Float32Array(max); this.drag = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('tint', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, scale: { value: 400 } }, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = additive ? 5 : 4;
    this.geo = g; scene.add(this.pts);
  }
  emit(x, y, z, vx, vy, vz, r, gg, b, a, size, life, { grav = 0, drag = 0, grow = 0 } = {}) {
    let i = this.n;
    if (i >= this.max) { i = Math.floor(Math.random() * this.max); } else this.n++;
    const i3 = i * 3, i4 = i * 4;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.base[i4] = r; this.base[i4 + 1] = gg; this.base[i4 + 2] = b; this.base[i4 + 3] = a;
    this.size0[i] = size; this.grow[i] = grow; this.life[i] = life; this.life0[i] = life; this.grav[i] = grav; this.drag[i] = drag;
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.kill(i); i--; continue; }
      const i3 = i * 3, i4 = i * 4, k = this.life[i] / this.life0[i], dr = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i3] *= dr; this.vel[i3 + 2] *= dr; this.vel[i3 + 1] = this.vel[i3 + 1] * dr - this.grav[i] * dt;
      this.pos[i3] += this.vel[i3] * dt; this.pos[i3 + 1] += this.vel[i3 + 1] * dt; this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      if (this.pos[i3 + 1] < 0.03 && this.grav[i] > 0) { this.pos[i3 + 1] = 0.03; this.vel[i3 + 1] *= -0.3; this.vel[i3] *= 0.6; this.vel[i3 + 2] *= 0.6; }
      const fade = Math.min(1, k * 2.2);
      this.col[i4] = this.base[i4]; this.col[i4 + 1] = this.base[i4 + 1]; this.col[i4 + 2] = this.base[i4 + 2]; this.col[i4 + 3] = this.base[i4 + 3] * fade;
      this.size[i] = this.size0[i] * (1 + this.grow[i] * (1 - k));
    }
    this.geo.setDrawRange(0, this.n);
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.tint.needsUpdate = true; this.geo.attributes.size.needsUpdate = true;
  }
  kill(i) {
    const j = --this.n;
    if (i === j) return;
    const c3 = (a, s) => { a[i * s] = a[j * s]; a[i * s + 1] = a[j * s + 1]; a[i * s + 2] = a[j * s + 2]; if (s === 4) a[i * s + 3] = a[j * s + 3]; };
    c3(this.pos, 3); c3(this.vel, 3); c3(this.base, 4); c3(this.col, 4);
    for (const a of [this.size, this.size0, this.grow, this.life, this.life0, this.grav, this.drag]) a[i] = a[j];
  }
}

const tmpC = new THREE.Color();
export class FX {
  constructor(scene) {
    this.scene = scene;
    this.glow = new Particles(scene, 2600, GLOW_TEX, true);
    this.smoke = new Particles(scene, 700, SMOKE_TEX, false);
    this.lights = [];
    for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xffaa55, 0, 9, 1.6); l.userData.t = 0; scene.add(l); this.lights.push(l); }
    this.decals = [];
    this.decalTex = {
      scorch: radialTexture([[0, 'rgba(10,8,6,0.9)'], [0.55, 'rgba(25,18,12,0.6)'], [1, 'rgba(0,0,0,0)']]),
      goo: radialTexture([[0, 'rgba(255,255,255,0.85)'], [0.5, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]),
    };
    const dg = new THREE.PlaneGeometry(1, 1); dg.rotateX(-Math.PI / 2);
    for (let i = 0; i < 70; i++) {
      const m = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, fog: true }));
      m.visible = false; m.renderOrder = 1; m.userData = { t: 0, life: 0 }; scene.add(m); this.decals.push(m);
    }
    this.di = 0;
  }
  setScale(h) { this.glow.mat.uniforms.scale.value = h * 0.55; this.smoke.mat.uniforms.scale.value = h * 0.55; }
  color(hex) { tmpC.set(hex); return tmpC; }

  sparks(p, hex, n = 10, speed = 5, up = 3, size = 0.35) {
    const c = this.color(hex);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
      this.glow.emit(p.x, p.y, p.z, Math.cos(a) * s, up * (0.5 + Math.random()), Math.sin(a) * s, c.r, c.g, c.b, 1, size * (0.6 + Math.random() * 0.6), 0.35 + Math.random() * 0.45, { grav: 12, drag: 1.5 });
    }
  }
  flashAt(p, hex, size = 1.4, life = 0.08) { const c = this.color(hex); this.glow.emit(p.x, p.y, p.z, 0, 0, 0, c.r, c.g, c.b, 1, size, life); }
  muzzle(p, dirx, dirz, hex = 0xffc38a) {
    this.flashAt(p, hex, 1.1, 0.06);
    const c = this.color(hex);
    for (let i = 0; i < 3; i++) this.glow.emit(p.x, p.y, p.z, dirx * (6 + Math.random() * 6) + (Math.random() - 0.5) * 2, Math.random(), dirz * (6 + Math.random() * 6) + (Math.random() - 0.5) * 2, c.r, c.g, c.b, 1, 0.25, 0.12, { drag: 6 });
    this.light(p, hex, 3, 0.07);
  }
  trail(p, hex, size = 0.35, life = 0.18) { const c = this.color(hex); this.glow.emit(p.x, p.y, p.z, 0, 0, 0, c.r, c.g, c.b, 0.7, size, life); }
  puff(p, hex = 0x8a7a6a, n = 6, size = 1.4, rise = 1.2, life = 1.4, alpha = 0.55) {
    const c = this.color(hex);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * 1.6;
      this.smoke.emit(p.x + Math.cos(a) * 0.3, p.y, p.z + Math.sin(a) * 0.3, Math.cos(a) * s, rise * (0.5 + Math.random()), Math.sin(a) * s, c.r, c.g, c.b, alpha, size * (0.7 + Math.random() * 0.6), life * (0.7 + Math.random() * 0.6), { drag: 1.2, grow: 1.6 });
    }
  }
  explode(p, hex = 0xff9f5a, scale = 1) {
    this.flashAt({ x: p.x, y: p.y + 0.4, z: p.z }, 0xfff0c0, 4 * scale, 0.12);
    this.sparks(p, hex, Math.round(22 * scale), 8 * scale, 5, 0.45);
    this.sparks(p, 0xffe0a0, Math.round(10 * scale), 4 * scale, 7, 0.3);
    this.puff(p, 0x3a332e, Math.round(8 * scale), 2.2 * scale, 1.6, 1.8, 0.6);
    this.light(p, hex, 9 * scale, 0.25);
    this.decal(p.x, p.z, 'scorch', 2.6 * scale, 0x000000, 18);
  }
  goo(p, hex, scale = 1) {
    this.sparks(p, hex, Math.round(14 * scale), 4.5, 4, 0.4);
    this.flashAt(p, hex, 2 * scale, 0.1);
    this.puff(p, hex, 3, 1.0 * scale, 0.8, 0.8, 0.25);
    this.decal(p.x, p.z, 'goo', 1.4 * scale + Math.random() * 0.6, hex, 14);
  }
  ring(p, hex, n = 28, speed = 7) {
    const c = this.color(hex);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; this.glow.emit(p.x, p.y, p.z, Math.cos(a) * speed, 0.2, Math.sin(a) * speed, c.r, c.g, c.b, 1, 0.5, 0.55, { drag: 2.5 }); }
  }
  rise(p, hex, n = 16, spread = 1.2) {
    const c = this.color(hex);
    for (let i = 0; i < n; i++) this.glow.emit(p.x + (Math.random() - 0.5) * spread, p.y + Math.random() * 0.5, p.z + (Math.random() - 0.5) * spread, 0, 2 + Math.random() * 3, 0, c.r, c.g, c.b, 1, 0.3 + Math.random() * 0.3, 0.8 + Math.random() * 0.6, { drag: 0.5 });
  }
  light(p, hex, intensity, life) {
    let l = this.lights.find((x) => x.userData.t <= 0) || this.lights.reduce((a, b) => (a.userData.t < b.userData.t ? a : b));
    l.position.set(p.x, (p.y || 0) + 1, p.z); l.color.set(hex); l.userData = { t: life, life, i: intensity }; l.intensity = intensity;
  }
  decal(x, z, kind, size, hex, life) {
    const m = this.decals[this.di = (this.di + 1) % this.decals.length];
    m.material.map = this.decalTex[kind]; m.material.color.set(kind === 'scorch' ? 0xffffff : hex); m.material.needsUpdate = true;
    m.material.opacity = 1; m.position.set(x, 0.035 + Math.random() * 0.01, z); m.scale.set(size, 1, size); m.rotation.y = Math.random() * 6.28;
    m.visible = true; m.userData = { t: life, life };
  }
  update(dt) {
    this.glow.update(dt); this.smoke.update(dt);
    for (const l of this.lights) if (l.userData.t > 0) { l.userData.t -= dt; l.intensity = Math.max(0, l.userData.i * (l.userData.t / l.userData.life)); }
    for (const m of this.decals) if (m.visible) { m.userData.t -= dt; m.material.opacity = Math.min(1, m.userData.t / 3); if (m.userData.t <= 0) m.visible = false; }
  }
  clearDecals() { this.decals.forEach((m) => { m.visible = false; }); }
}
