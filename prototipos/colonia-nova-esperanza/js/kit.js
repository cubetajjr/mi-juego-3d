// Loads the Blender-built model kit (assets/kit.glb), hands out clones and drives their clips.
import * as THREE from '../vendor/three/three.module.min.js';
import { GLTFLoader } from '../vendor/three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from '../vendor/three/addons/utils/BufferGeometryUtils.js';

export const KIT = { roots: {}, clips: {} };

// kitGlow takes its emissive colour from the vertex colours written by the Blender build.
export function patchGlow(m) {
  if (m.name !== 'kitGlow') return m;
  m.emissiveIntensity = m.userData.glowBase ?? 1.6; m.userData.glowBase = m.emissiveIntensity;
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n totalEmissiveRadiance *= vColor.rgb;\n#endif'); };
  m.customProgramCacheKey = () => 'kitGlow';
  return m;
}

export async function loadKit(url, onProgress, { charShadows = true } = {}) {
  const gltf = await new GLTFLoader().loadAsync(url, (e) => { if (onProgress && e.total) onProgress(e.loaded / e.total); });
  // On animated characters only the main masses cast shadows: limbs and props are invisible
  // in the shadow from the top-down camera and would double their draw calls.
  const CHAR = new Set(['astro', 'bicho', 'veloz', 'escupidor', 'volador', 'acorazado', 'jefe']);
  const SHADOW_PARTS = new Set(['astrotorso', 'astrolegL', 'astrolegR', 'bichobody', 'velozbody', 'escupidorbody', 'voladorbody', 'acorazadobody', 'jefebody']);
  for (const c of gltf.scene.children.slice()) {
    c.position.set(0, 0, 0);
    const isChar = CHAR.has(c.name);
    c.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = !isChar || (charShadows && (SHADOW_PARTS.has(o.name) || SHADOW_PARTS.has(o.parent && o.parent.name))); o.receiveShadow = true;
      const m = patchGlow(o.material);
      if (m.transparent) { m.depthWrite = false; o.castShadow = false; }
      if (m.name === 'kitGlow') o.castShadow = false;
    });
    KIT.roots[c.name] = c;
  }
  for (const a of gltf.animations) {
    const [asset, name] = a.name.split('|');
    (KIT.clips[asset] ||= {})[name] = a;
  }
}

/** Clone an asset root. Node names keep the asset prefix ("astro.torso" → "astrotorso"). */
export function spawn(name) {
  const src = KIT.roots[name];
  if (!src) throw new Error('missing asset ' + name);
  return src.clone(true);
}
export const part = (o, name) => o.getObjectByName(name.replace('.', ''));

/** Give a clone private copies of its materials (for hit flashes or recolouring). */
export function ownMaterials(o) {
  const list = [];
  o.traverse((m) => {
    if (!m.isMesh) return;
    m.material = patchGlow(m.material.clone());
    list.push({ m: m.material, e: m.material.emissive.clone(), ei: m.material.emissiveIntensity });
  });
  return list;
}

const tintCache = {};
/** Swap the shared "accent" material on a clone for a cached recoloured copy. */
export function tint(o, matName, hex) {
  const key = matName + hex;
  o.traverse((m) => {
    if (!m.isMesh || m.material.name !== matName) return;
    if (!tintCache[key]) { tintCache[key] = m.material.clone(); tintCache[key].color.setHex(hex); }
    m.material = tintCache[key];
  });
}

/** Merge every mesh under `group` into one mesh per material, in world space. */
export function bake(group, scene, { shadows = true } = {}) {
  group.updateMatrixWorld(true);
  const byMat = new Map();
  group.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    const g = o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
    g.applyMatrix4(o.matrixWorld);
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(g.index ? g : g);
  });
  const out = new THREE.Group();
  for (const [m, geos] of byMat) {
    const idx = geos.every((g) => g.index), list = idx ? geos : geos.map((g) => (g.index ? g.toNonIndexed() : g));
    const merged = mergeGeometries(list, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, m);
    mesh.castShadow = shadows && !m.transparent; mesh.receiveShadow = true;
    out.add(mesh);
  }
  scene.add(out);
  return out;
}

/** Plays named clips on one clone with short crossfades. */
export class Animator {
  constructor(root, asset) {
    this.mixer = new THREE.AnimationMixer(root);
    this.actions = {};
    for (const [n, clip] of Object.entries(KIT.clips[asset] || {})) this.actions[n] = this.mixer.clipAction(clip);
    this.cur = null;
  }
  play(name, fade = 0.2, speed = 1) {
    const a = this.actions[name];
    if (!a) return;
    a.timeScale = speed;
    if (this.cur === a) return;
    a.reset().setEffectiveWeight(1).setLoop(THREE.LoopRepeat, Infinity).play();
    if (this.cur && this.cur.isRunning()) this.cur.crossFadeTo(a, fade, false);
    this.cur = a;
  }
  /** One-shot clip that returns to `back` when it finishes. */
  once(name, back, speed = 1) {
    const a = this.actions[name];
    if (!a) return;
    a.reset().setEffectiveWeight(1); a.timeScale = speed; a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false; a.play();
    if (this.cur && this.cur !== a && this.cur.isRunning()) this.cur.crossFadeTo(a, 0.08, false);
    this.cur = a; this.back = back;
  }
  update(dt) {
    this.mixer.update(dt);
    if (this.back && this.cur && !this.cur.isRunning()) { const b = this.back; this.back = null; this.cur = null; this.play(b, 0.12); }
  }
}
