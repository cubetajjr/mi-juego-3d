// The story of the Esperanza: intro cinematic, ARIA's radio messages, repair milestones
// and the launch at the end of chapter one.
import * as THREE from '../vendor/three/three.module.min.js';

const $ = (s) => document.querySelector(s);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = (t) => t * t * (3 - 2 * t);

const LINES = {
  begin: 'Comandante, el reactor de la Esperanza aguanta. Es lo único que nos mantiene con vida aquí abajo.',
  scrapHint: 'Hay chatarra de la nave por toda la zona. Recógela: la necesitamos para construir.',
  scrapDone: 'Bien. Con chatarra podemos levantar defensas. Pulsa «Construir» y coloca otra torreta.',
  builtTurret: 'Torreta en línea. Los colonos dicen que de noche algo se mueve bajo la arena…',
  rifts: 'Detecto grietas de energía en el perímetro: los portales morados. Por ahí saldrán cuando caiga la noche.',
  night1: '¡Ya vienen! Los atrae el calor del reactor. Si cae el núcleo, caemos todos.',
  dawn1: 'Lo hemos conseguido. Mientras resistamos, los colonos podrán reparar la Esperanza. Con diez noches, quizá vuelva a volar.',
  shipSeen: 'Ahí está la Esperanza. Cuarenta años de viaje… para acabar aquí. Cada amanecer la reparamos un poco más.',
  veloz: 'Una variante muy rápida. Va directa a las minas y a los hábitats.',
  escupidor: 'Ese escupe ácido desde lejos. No dejes que se acerque al reactor.',
  volador: '¡Voladores! Pasan por encima de los muros. Las torres láser sí pueden alcanzarlos.',
  acorazado: 'Ese tiene un caparazón muy duro. Concentra el fuego o usa morteros.',
  nestSeen: 'Un nido. De ahí salen. Si lo destruyes, esta noche vendrán menos.',
  nestDown: 'Nido destruido. Buen trabajo, comandante.',
  meteors: '¡Lluvia de meteoritos! La misma tormenta que nos derribó. Al menos traen cristales.',
  crystal: 'Cristales de energía. Con ellos puedo potenciar el reactor y mejorar los edificios.',
  wreck: 'Una cápsula de escape de la Esperanza. Sus ocupantes no llegaron tan lejos… pero dejaron suministros.',
  cmdDown: '¡Comandante! Sus constantes son estables. El traje le llevará de vuelta al núcleo.',
  core2: 'Reactor al nivel 2. Ya puedo dar energía a un cuartel, hábitats y torres láser.',
  boss: 'Una señal enorme bajo la arena… Es su reina. Viene a por el reactor.',
  bossDown: 'La reina ha caído. Nos hemos ganado un respiro.',
  lost: 'El reactor se ha apagado… pero sigue latiendo. Al amanecer lo reconstruimos.',
  ready: 'Motores al cien por cien. La Esperanza está lista. Aguanta esta última noche y despegará al amanecer.',
};
const SYSTEMS = { 2: 'soporte vital', 4: 'navegación', 6: 'escudo térmico', 8: 'motores' };

export function createStory(ctx) {
  const { G, scene, camera, fx, AU, W, spawn, persist, banner, refreshShip, look, setColonyVisible } = ctx;
  const flags = (G.story.flags ||= {});
  const queue = [];
  let ariaT = 0, typing = null, typeI = 0, typeT = 0;

  // ---------------------------------------------------------------- ARIA radio
  function say(key, text, force) {
    if (!force && flags[key]) return;
    flags[key] = 1; persist();
    queue.push(text || LINES[key]);
  }
  function showNext() {
    const text = queue.shift();
    $('#aria').hidden = false;
    typing = text; typeI = 0; typeT = 0; $('#ariaText').textContent = '';
    ariaT = 3.2 + text.length * 0.045;
    AU.sfx('aria');
  }
  function updateAria(dt) {
    if (cine) return;
    if (typing) {
      typeT += dt; const n = Math.min(typing.length, Math.floor(typeT * 55));
      if (n !== typeI) { typeI = n; $('#ariaText').textContent = typing.slice(0, n); }
      ariaT -= dt;
      if (ariaT <= 0) { typing = null; $('#aria').hidden = true; ariaT = -0.6; }
      return;
    }
    if (ariaT < 0) { ariaT += dt; return; }
    if (queue.length && !$('#hud').hidden) showNext();
  }

  // ---------------------------------------------------------------- game events
  function event(name, a, b) {
    switch (name) {
      case 'scrap': if (G.tut.scrap >= 3) say('scrapDone'); break;
      case 'built': if (a === 'torreta') say('builtTurret'); break;
      case 'rifts': say('rifts'); break;
      case 'night': if (b) say('boss' + a, LINES.boss, false); else if (a === 1) say('night1'); break;
      case 'alien': if (LINES[a]) say(a); break;
      case 'nestSeen': say('nestSeen'); break;
      case 'nestDown': say('nestDown'); break;
      case 'meteors': say('meteors'); break;
      case 'crystal': say('crystal'); break;
      case 'wreck': say('wreck'); break;
      case 'cmdDown': say('cmdDown'); break;
      case 'coreUp': if (a === 2) say('core2'); break;
      case 'bossDown': say('bossDown' + G.nights, LINES.bossDown); break;
      case 'shipSeen': say('shipSeen'); break;
      case 'lost': say('lost' + G.nights, LINES.lost); break;
      case 'dawn': {
        const n = a;
        if (n === 1) say('dawn1');
        if (SYSTEMS[n] && !G.shipGone) say('sys' + n, `Reparación de la Esperanza al ${n * 10} %: ${SYSTEMS[n]} restaurado.`);
        if (n === ctx.SHIP_GOAL - 1 && !G.shipGone) say('ready');
        if (n >= ctx.SHIP_GOAL && !G.shipGone && !flags.launched) { flags.launched = 1; persist(); setTimeout(() => playLaunch(), 2600); }
        break;
      }
    }
  }
  function begin() {
    say('begin');
    if (G.tut.scrap < 3) say('scrapHint');
  }

  // ---------------------------------------------------------------- cinematics
  let cine = null;
  const cineEl = $('#cine'), txt = $('#cineText'), flash = $('#cineFlash');
  function caption(text, black) {
    txt.classList.remove('show');
    setTimeout(() => { txt.innerHTML = text; txt.classList.toggle('black', !!black); if (text) txt.classList.add('show'); }, text ? 250 : 0);
  }
  function startCine(steps, camKeys, duskFn, done) {
    ctx.setCinematic(true);
    cineEl.hidden = false; $('#aria').hidden = true;
    cine = { t: 0, steps: steps.slice().sort((x, y) => x.at - y.at), camKeys, duskFn, done, fired: 0 };
  }
  function endCine() {
    if (!cine) return;
    const c = cine; cine = null;
    c.steps.slice(c.fired).forEach((s) => s.skip && s.skip());
    cineEl.hidden = true; cineEl.classList.remove('blackout'); caption('');
    ctx.setCinematic(false);
    c.done && c.done();
  }
  $('#skipBtn').addEventListener('click', endCine);
  const camPos = V(0, 0, 0), camTgt = V(0, 0, 0);
  function sampleCam(keys, t) {
    let i = 0; while (i < keys.length - 2 && t > keys[i + 1].t) i++;
    const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
    const k = b.t > a.t ? ease(Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)))) : 1;
    camPos.copy(a.p).lerp(b.p, k); camTgt.copy(a.l).lerp(b.l, k);
  }

  // intro: the Esperanza falls out of the sky and crashes next to the future colony
  let flyer = null, flyT = -1;
  const crash = V(W.shipSpot.x, 0, W.shipSpot.z);
  const flyFrom = V(-170, 85, -150), flyCtrl = V(-70, 55, -60);
  function playIntro(done) {
    if (!flyer) { flyer = spawn('esperanza'); flyer.scale.setScalar(1.6); scene.add(flyer); }
    flyer.visible = false; flyT = -1;
    W.ship.visible = false;
    setColonyVisible(false);
    cineEl.classList.add('blackout');
    const steps = [
      { at: 0.4, run: () => caption('Año 2187.', true) },
      { at: 3.2, run: () => caption('La nave colonia <em>ESPERANZA</em> lleva cuarenta años viajando con trescientos colonos dormidos.', true) },
      { at: 7.6, run: () => caption('A tres años luz de su destino, atraviesa una tormenta de meteoritos.', true) },
      { at: 11.2, run: () => { cineEl.classList.remove('blackout'); caption('Los motores fallan. Rumbo de colisión con un planeta sin nombre.'); flyer.visible = true; flyT = 0; AU.sfx('meteor'); } },
      { at: 14.6, run: () => AU.sfx('meteor') },
      { at: 17.0, run: impact, skip: () => { W.ship.visible = !G.shipGone; } },
      { at: 19.6, run: () => { cineEl.classList.add('blackout'); caption('Semanas después.', true); } },
      { at: 22.0, run: () => { setColonyVisible(true); cineEl.classList.remove('blackout'); caption('Los supervivientes levantan una colonia alrededor del reactor de la nave, que todavía late.'); }, skip: () => setColonyVisible(true) },
      { at: 26.4, run: () => caption('<em>ARIA:</em> Comandante, detecto formas de vida bajo la arena. Y se mueven hacia el calor del reactor.') },
      { at: 31.4, run: () => caption('') },
      { at: 32.0, run: endCine },
    ];
    function impact() {
      flyer.visible = false; flyT = -1; W.ship.visible = !G.shipGone; refreshShip();
      flash.style.opacity = '1'; setTimeout(() => { flash.style.transition = 'opacity 1.6s'; flash.style.opacity = '0'; setTimeout(() => { flash.style.transition = ''; }, 1700); }, 90);
      AU.sfx('bigboom'); AU.sfx('boom');
      for (let i = 0; i < 4; i++) setTimeout(() => fx.explode(V(crash.x + (Math.random() - 0.5) * 10, 1, crash.z + (Math.random() - 0.5) * 8), 0xff9f5a, 2.2), i * 160);
      for (let i = 0; i < 12; i++) fx.puff(V(crash.x + (Math.random() - 0.5) * 16, 0.5, crash.z + (Math.random() - 0.5) * 12), 0x9a7a5a, 4, 4, 2, 5, 0.6);
      shake = 1.2;
    }
    const cam = [
      { t: 11, p: V(34, 7, 44), l: V(-60, 40, -60) },
      { t: 15.5, p: V(28, 8, 34), l: V(-30, 14, -24) },
      { t: 17.2, p: V(22, 7, 28), l: V(crash.x, 2, crash.z) },
      { t: 19.6, p: V(12, 6, 14), l: V(crash.x, 2, crash.z) },
      { t: 22, p: V(-6, 6, 22), l: V(-2, 3, 0) },
      { t: 28, p: V(8, 13, 22), l: V(0, 2, 0) },
      { t: 32, p: V(0, 20.5, 15.5), l: V(0, 0, 0) },
    ];
    startCine(steps, cam, (t) => (t < 19.6 ? 1 : t < 22 ? 0.6 : Math.max(0, 0.6 - (t - 22) / 8)), () => { flyer.visible = false; flyT = -1; done && done(); });
  }

  // end of chapter one: the repaired Esperanza lifts off
  function playLaunch() {
    const ship = W.ship, start = ship.position.clone(), startRot = ship.rotation.clone();
    let lift = -1;
    const steps = [
      { at: 0.3, run: () => { caption('<em>ARIA:</em> Motores al cien por cien. Comandante… la Esperanza vuelve a volar.'); AU.sfx('portal'); } },
      { at: 4.2, run: () => { lift = 0; AU.sfx('bigboom'); shake = 0.8; } },
      { at: 6.0, run: () => caption('La nave despega rumbo al Planeta Rojo con los colonos heridos y los niños.') },
      { at: 10.5, run: () => caption('Tú te quedas con la colonia. Cuando vuelva, traerá refuerzos.') },
      { at: 15.0, run: () => caption('FIN DEL PRIMER CAPÍTULO', true) },
      { at: 18.0, run: endCine },
    ];
    const done = () => { G.shipGone = true; ship.visible = false; ship.position.copy(start); ship.rotation.copy(startRot); persist(); banner('CAPÍTULO 2', 'Resiste hasta que vuelva la Esperanza', 'day'); };
    steps.push({ at: 99, skip: () => {} });
    const p = start;
    const cam = [
      { t: 0, p: V(p.x + 22, 8, p.z + 24), l: V(p.x, 3, p.z) },
      { t: 4, p: V(p.x + 18, 6, p.z + 20), l: V(p.x, 4, p.z) },
      { t: 9, p: V(p.x + 26, 10, p.z + 28), l: V(p.x - 10, 22, p.z - 10) },
      { t: 15, p: V(p.x + 30, 14, p.z + 30), l: V(p.x - 60, 70, p.z - 80) },
    ];
    launchUpdate = (dt) => {
      if (lift < 0) { if (Math.random() < 0.6) fx.puff(V(p.x + (Math.random() - 0.5) * 8, 0.4, p.z + (Math.random() - 0.5) * 8), 0x9a7a5a, 1, 2.5, 1, 2, 0.4); return; }
      lift += dt;
      const up = Math.min(1, lift / 3);
      ship.rotation.x = startRot.x * (1 - up); ship.rotation.z = startRot.z * (1 - up);
      ship.position.y = start.y + ease(Math.min(1, lift / 4)) * 14 + Math.max(0, lift - 4) * Math.max(0, lift - 4) * 3;
      ship.position.x = start.x - Math.max(0, lift - 4) * Math.max(0, lift - 4) * 2.4;
      ship.position.z = start.z - Math.max(0, lift - 4) * Math.max(0, lift - 4) * 3;
      W.shipEngines.forEach((e) => { const w = e.getWorldPosition(V(0, 0, 0)); fx.trail(w, 0xffa040, 2.6, 0.35); if (Math.random() < 0.7) fx.puff(w, 0x6a5a4a, 1, 2.6, -1, 2, 0.5); });
    };
    startCine(steps, cam, () => 0.25, () => { launchUpdate = null; done(); });
  }
  let launchUpdate = null, shake = 0;

  function updateCine(dt, time) {
    if (!cine) return;
    cine.t += dt;
    while (cine.fired < cine.steps.length && cine.steps[cine.fired].at <= cine.t) { const s = cine.steps[cine.fired++]; s.run && s.run(); if (!cine) return; }
    if (flyer && flyT >= 0) {
      flyT = Math.max(0, (cine.t - 11.2) / 5.8);
      const k = Math.min(1, flyT), a = flyFrom.clone().lerp(flyCtrl, k), b = flyCtrl.clone().lerp(crash.clone().setY(1), k), pos = a.lerp(b, k);
      const ahead = flyFrom.clone().lerp(flyCtrl, Math.min(1, k + 0.02)).lerp(flyCtrl.clone().lerp(crash.clone().setY(1), Math.min(1, k + 0.02)), Math.min(1, k + 0.02));
      flyer.position.copy(pos); flyer.lookAt(ahead); flyer.rotateZ(Math.sin(time * 3) * 0.15 + k * 0.4);
      for (let i = 0; i < 4; i++) fx.trail(pos.clone().add(V((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3)), Math.random() < 0.5 ? 0xff7a2a : 0xffd080, 3.5, 0.5);
      fx.puff(pos, 0x2a2626, 2, 4, 0.5, 4, 0.55);
    }
    if (launchUpdate) launchUpdate(dt);
  }
  function cameraUpdate(dt, time) {
    if (!cine) return;
    sampleCam(cine.camKeys, cine.t);
    camera.position.copy(camPos);
    if (shake > 0) { shake -= dt; camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; }
    camera.lookAt(camTgt);
    look.set(camTgt.x, 0, camTgt.z);
  }

  return {
    event, begin, playIntro, playLaunch,
    update(dt, time) { updateAria(dt); updateCine(dt, time); },
    camera: cameraUpdate,
    dusk: () => (cine && cine.duskFn ? cine.duskFn(cine.t) : 0),
    get active() { return !!cine; },
    seek(t) { if (cine) cine.t = t; },
  };
}
