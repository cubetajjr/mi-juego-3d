// Procedural audio: every sound effect and the music are synthesised with Web Audio,
// so the game ships without audio files. The context unlocks on the first user gesture.

let ctx = null, master = null, sfxBus = null, musicBus = null, comp = null, noiseBuf = null;
let muted = false;
const last = {};

try { muted = localStorage.getItem('colonia-nova-mute') === '1'; } catch (e) {}

export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9;
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.75;
  musicBus = ctx.createGain(); musicBus.gain.value = 0.32;
  sfxBus.connect(comp); musicBus.connect(comp); comp.connect(master); master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  startMusic();
}

export function isMuted() { return muted; }
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('colonia-nova-mute', m ? '1' : '0'); } catch (e) {}
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05);
}

// ---------------------------------------------------------------- building blocks
function env(g, t, a, peak, dec, sus = 0) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + a + dec);
}
function osc(type, f, t, dur, peak, { to = null, a = 0.004, bus = sfxBus, detune = 0 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  env(g, t, a, peak, dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + a + 0.05);
  return o;
}
function noise(t, dur, peak, { type = 'bandpass', f = 1200, q = 0.8, to = null, a = 0.002, bus = sfxBus } = {}) {
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
  fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur);
  env(g, t, a, peak, dur);
  s.connect(fl); fl.connect(g); g.connect(bus);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + a + 0.05);
}
function pan(x) {
  // x in -1..1 → a panner node feeding the sfx bus
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (!p) return sfxBus;
  p.pan.value = Math.max(-1, Math.min(1, x)); p.connect(sfxBus);
  return p;
}

// ---------------------------------------------------------------- sound effects
const SFX = {
  shot(t, b) { noise(t, 0.07, 0.35, { f: 2600, q: 0.7, bus: b }); osc('square', 880, t, 0.06, 0.08, { to: 300, bus: b }); },
  turret(t, b) { noise(t, 0.09, 0.4, { f: 1500, q: 0.6, bus: b }); osc('triangle', 220, t, 0.1, 0.2, { to: 90, bus: b }); },
  troop(t, b) { noise(t, 0.06, 0.22, { f: 3200, q: 0.8, bus: b }); osc('square', 1200, t, 0.04, 0.05, { to: 500, bus: b }); },
  laser(t, b) { osc('sawtooth', 1800, t, 0.09, 0.07, { to: 500, bus: b }); osc('sine', 2400, t, 0.08, 0.06, { to: 900, bus: b }); },
  mortar(t, b) { osc('sine', 120, t, 0.35, 0.6, { to: 40, bus: b }); noise(t, 0.25, 0.4, { type: 'lowpass', f: 900, to: 120, bus: b }); },
  whistle(t, b) { osc('sine', 1800, t, 0.8, 0.05, { to: 500, a: 0.1, bus: b }); },
  boom(t, b) { osc('sine', 90, t, 0.6, 0.8, { to: 30, bus: b }); noise(t, 0.7, 0.7, { type: 'lowpass', f: 1400, to: 90, q: 0.5, bus: b }); },
  bigboom(t, b) { osc('sine', 70, t, 1.4, 1, { to: 22, bus: b }); noise(t, 1.6, 0.9, { type: 'lowpass', f: 1800, to: 60, q: 0.4, bus: b }); noise(t + 0.05, 0.4, 0.4, { f: 400, bus: b }); },
  hit(t, b) { noise(t, 0.08, 0.25, { f: 700, q: 3, to: 300, bus: b }); },
  squish(t, b) { noise(t, 0.18, 0.35, { f: 900, q: 4, to: 180, bus: b }); osc('sine', 300, t, 0.2, 0.15, { to: 60, bus: b }); },
  screech(t, b) { osc('sawtooth', 600 + Math.random() * 300, t, 0.22, 0.06, { to: 1400, a: 0.02, bus: b, detune: 30 }); noise(t, 0.2, 0.08, { f: 2500, q: 6, bus: b }); },
  bite(t, b) { noise(t, 0.06, 0.3, { f: 1800, q: 2, bus: b }); osc('square', 160, t, 0.07, 0.08, { to: 80, bus: b }); },
  spit(t, b) { noise(t, 0.2, 0.25, { f: 600, q: 5, to: 1800, bus: b }); },
  acid(t, b) { noise(t, 0.25, 0.3, { type: 'highpass', f: 2000, q: 0.5, to: 5000, bus: b }); },
  buzz(t, b) { osc('sawtooth', 140, t, 0.3, 0.05, { a: 0.05, bus: b }); },
  crash(t, b) { noise(t, 0.4, 0.5, { f: 600, q: 0.6, to: 150, bus: b }); osc('square', 80, t, 0.3, 0.15, { to: 40, bus: b }); },
  pickup(t, b) { [0, 0.05, 0.1].forEach((d, i) => osc('triangle', [880, 1175, 1568][i], t + d, 0.12, 0.13, { bus: b })); },
  crystal(t, b) { [0, 0.06, 0.12, 0.18].forEach((d, i) => osc('sine', [1319, 1568, 1976, 2637][i], t + d, 0.35, 0.12, { bus: b })); },
  place(t, b) { osc('square', 180, t, 0.12, 0.15, { to: 90, bus: b }); noise(t, 0.12, 0.25, { f: 500, bus: b }); osc('triangle', 660, t + 0.08, 0.15, 0.08, { bus: b }); },
  upgrade(t, b) { [0, 0.08, 0.16, 0.24].forEach((d, i) => osc('triangle', [523, 659, 784, 1047][i], t + d, 0.4, 0.13, { bus: b })); },
  click(t, b) { osc('square', 1400, t, 0.03, 0.05, { to: 900, bus: b }); },
  deny(t, b) { osc('square', 220, t, 0.12, 0.08, { bus: b }); osc('square', 165, t + 0.1, 0.16, 0.08, { bus: b }); },
  hurt(t, b) { osc('sawtooth', 220, t, 0.25, 0.15, { to: 90, bus: b }); noise(t, 0.15, 0.2, { type: 'lowpass', f: 800, bus: b }); },
  down(t, b) { osc('sawtooth', 330, t, 0.9, 0.2, { to: 60, bus: b }); },
  aria(t, b) { osc('sine', 1046, t, 0.09, 0.08, { bus: b }); osc('sine', 1568, t + 0.09, 0.14, 0.07, { bus: b }); },
  night(t, b) { osc('sawtooth', 110, t, 2.2, 0.12, { a: 0.4, bus: b }); osc('sawtooth', 116, t, 2.2, 0.1, { a: 0.4, bus: b }); osc('sine', 55, t, 2.4, 0.3, { a: 0.3, bus: b }); },
  dawn(t, b) { [0, 0.15, 0.3, 0.45].forEach((d, i) => osc('triangle', [392, 494, 587, 784][i], t + d, 1.4, 0.1, { a: 0.03, bus: b })); },
  meteor(t, b) { noise(t, 1.4, 0.25, { f: 300, q: 0.7, to: 2400, a: 0.6, bus: b }); },
  portal(t, b) { osc('sine', 80, t, 1.5, 0.15, { to: 160, a: 0.4, bus: b }); osc('sine', 83, t, 1.5, 0.12, { to: 170, a: 0.4, bus: b }); },
  repair(t, b) { noise(t, 0.05, 0.12, { f: 3500, q: 4, bus: b }); },
};
const GAP = { shot: 0.07, turret: 0.08, troop: 0.06, laser: 0.05, hit: 0.04, squish: 0.05, screech: 0.25, bite: 0.08, buzz: 0.4, repair: 0.12, pickup: 0.05, acid: 0.06, spit: 0.1, mortar: 0.1, boom: 0.06 };

/** Play a named effect. `x` is the screen-space pan (-1..1); `vol` scales distance attenuation. */
export function sfx(name, x = 0, vol = 1) {
  if (!ctx || muted || vol <= 0.02) return;
  const now = ctx.currentTime;
  if (GAP[name] && last[name] && now - last[name] < GAP[name]) return;
  last[name] = now;
  const g = ctx.createGain(); g.gain.value = Math.min(1, vol);
  g.connect(pan(x));
  SFX[name] && SFX[name](now + 0.005, g);
}

// ---------------------------------------------------------------- music
// Two generative layers that crossfade with the day/night mix: a calm modal pad by day and
// a pulsing low drone with a heartbeat kick at night.
let dayG = null, nightG = null, musicT = 0, step = 0, nightMix = 0;
const DAY_CHORDS = [[220, 261.6, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6], [196, 246.9, 329.6]];
const ARP = [659.3, 587.3, 523.3, 440, 523.3, 587.3, 784, 659.3];
function startMusic() {
  dayG = ctx.createGain(); dayG.gain.value = 1; dayG.connect(musicBus);
  nightG = ctx.createGain(); nightG.gain.value = 0; nightG.connect(musicBus);
  const drone = ctx.createOscillator(), dl = ctx.createBiquadFilter(), dg = ctx.createGain();
  drone.type = 'sawtooth'; drone.frequency.value = 55; dl.type = 'lowpass'; dl.frequency.value = 220; dg.gain.value = 0.18;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 120;
  lfo.connect(lg); lg.connect(dl.frequency);
  drone.connect(dl); dl.connect(dg); dg.connect(nightG); drone.start(); lfo.start();
  musicT = ctx.currentTime + 0.2;
}
export function setNightMix(m) { nightMix = m; }

/** Schedule music a little ahead of time; call every frame. */
export function tickMusic() {
  if (!ctx || !dayG) return;
  const now = ctx.currentTime;
  dayG.gain.setTargetAtTime(1 - nightMix, now, 0.5);
  nightG.gain.setTargetAtTime(nightMix, now, 0.5);
  while (musicT < now + 0.4) {
    const t = musicT, beat = 0.5;
    if (step % 8 === 0) {
      const ch = DAY_CHORDS[(step / 8) % DAY_CHORDS.length];
      ch.forEach((f) => { osc('triangle', f, t, 3.6, 0.05, { a: 0.8, bus: dayG }); osc('sine', f / 2, t, 3.8, 0.04, { a: 1, bus: dayG }); });
    }
    if (step % 2 === 0 && Math.random() < 0.7) osc('sine', ARP[(step / 2) % ARP.length], t, 0.6, 0.025, { a: 0.01, bus: dayG });
    if (step % 2 === 0) {
      const k = ctx.createOscillator(), kg = ctx.createGain();
      k.frequency.setValueAtTime(110, t); k.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      env(kg, t, 0.003, 0.5, 0.2); k.connect(kg); kg.connect(nightG); k.start(t); k.stop(t + 0.3);
    }
    if (step % 4 === 1) noise(t, 0.05, 0.05, { type: 'highpass', f: 6000, bus: nightG });
    if (step % 16 === 6) osc('sawtooth', 220, t, 1.2, 0.03, { to: 207, a: 0.2, bus: nightG });
    musicT += beat;
    step++;
  }
}
