// Prueba la capa de datos en vivo sin depender de la red.
// Las respuestas son DATOS DE PRUEBA inventados, con la misma forma que documentan Jolpica
// (docs/endpoints/*.md del repo jolpica/jolpica-f1) y OpenF1 (colecciones de br-g/openf1).
// No describen resultados reales: solo sirven para comprobar que la web los entiende.
// Uso: node parrilla-motor/tools/probar-directo.js
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const page = 'file://' + path.resolve(__dirname, '..', 'index.html');

const PILOTOS = [ // [nombre, apellido, número, equipo en Jolpica, equipo en OpenF1, color, siglas, puntos, victorias]
  ['Andrea Kimi', 'Antonelli', 12, 'Mercedes', 'Mercedes', '27F4D2', 'ANT', 375, 9],
  ['George', 'Russell', 63, 'Mercedes', 'Mercedes', '27F4D2', 'RUS', 238, 3],
  ['Lewis', 'Hamilton', 44, 'Ferrari', 'Ferrari', 'E8002D', 'HAM', 247, 1],
  ['Max', 'Verstappen', 1, 'Red Bull', 'Red Bull Racing', '3671C6', 'VER', 236, 2],
  ['Charles', 'Leclerc', 16, 'Ferrari', 'Ferrari', 'E8002D', 'LEC', 225, 1],
];
const MR = o => ({ MRData: { xmlns: '', series: 'f1', limit: '50', offset: '0', ...o } });
const drv = p => ({ driverId: p[1].toLowerCase(), givenName: p[0], familyName: p[1], permanentNumber: String(p[2]) });
const race = extra => ({ season: '2026', round: '18', raceName: 'United States Grand Prix', date: '2026-10-25', time: '20:00:00Z', Circuit: { circuitId: 'americas', circuitName: 'Circuit of the Americas', Location: { locality: 'Austin', country: 'USA' } }, ...extra });
const llegada = [0, 2, 3, 4, 1];
const jolpica = {
  driverstandings: () => MR({ StandingsTable: { season: '2026', round: '18', StandingsLists: [{ season: '2026', round: '18', DriverStandings: [...PILOTOS].sort((a, b) => b[7] - a[7]).map((p, i) => ({ position: String(i + 1), positionText: String(i + 1), points: String(p[7]), wins: String(p[8]), Driver: drv(p), Constructors: [{ constructorId: p[3].toLowerCase(), name: p[3] }] })) }] } }),
  constructorstandings: () => MR({ StandingsTable: { season: '2026', round: '18', StandingsLists: [{ season: '2026', round: '18', ConstructorStandings: [['Mercedes', 603], ['Ferrari', 472], ['Red Bull', 330]].map(([n, pts], i) => ({ position: String(i + 1), positionText: String(i + 1), points: String(pts), wins: '0', Constructor: { constructorId: n.toLowerCase(), name: n } })) }] } }),
  results: () => MR({ RaceTable: { season: '2026', round: '18', Races: [race({ Results: llegada.map((k, i) => ({ number: String(PILOTOS[k][2]), position: String(i + 1), positionText: String(i + 1), points: String([25, 18, 15, 12, 10][i]), Driver: drv(PILOTOS[k]), Constructor: { name: PILOTOS[k][3] }, grid: String(i + 1), laps: '56', status: 'Finished' })) })] } }),
  qualifying: () => MR({ RaceTable: { season: '2026', round: '18', Races: [race({ QualifyingResults: PILOTOS.map((p, i) => ({ number: String(p[2]), position: String(i + 1), Driver: drv(p), Constructor: { name: p[3] }, Q1: '1:33.000', Q2: '1:32.500', Q3: '1:32.100' })) })] } }),
  sprint: () => MR({ RaceTable: { season: '2026', round: '18', Races: [] } }),
};
const T = (d, h) => new Date(Date.parse(d) + h * 36e5).toISOString().replace('.000Z', '+00:00');
const SES = [[9901, 'Practice 1', 'Practice', '2026-10-23T17:30:00Z', 1], [9902, 'Practice 2', 'Practice', '2026-10-23T21:00:00Z', 1], [9903, 'Practice 3', 'Practice', '2026-10-24T17:30:00Z', 1], [9904, 'Qualifying', 'Qualifying', '2026-10-24T21:00:00Z', 1], [9905, 'Race', 'Race', '2026-10-25T20:00:00Z', 2]];
// vueltas de prueba: ritmo fijo por piloto; Hamilton adelanta a Verstappen tras las paradas y Russell acaba doblado
const RITMO = { 9905: [[95.0, 95.0], [97.5, 97.5], [95.1, 95.15], [95.05, 95.4], [95.3, 95.3]] }; // en el orden de PILOTOS
const SALIDA = { 9905: '2026-10-25T20:03:00Z', 9904: '2026-10-24T21:00:00Z', 9901: '2026-10-23T17:30:00Z' };
let HASTA = Infinity; // en el escenario «directo» solo existen las vueltas ya terminadas
function vueltas(k) {
  if (!SALIDA[k]) return [];
  const out = [], t0 = Date.parse(SALIDA[k]);
  PILOTOS.forEach((p, i) => {
    let t = t0 + (k === 9905 ? 0 : i * 6e4);
    const n = k === 9905 ? (i === 1 ? 55 : 56) : 12;
    for (let l = 1; l <= n; l++) {
      const d = k === 9905 ? RITMO[k][i][l <= 20 ? 0 : 1] + (l === 20 ? 20 : 0) : 92 + i * 0.15 + (l % 3) * 0.4 + (l === 6 ? 60 : 0);
      if (t + d * 1e3 <= HASTA) out.push({ meeting_key: 1300, session_key: k, driver_number: p[2], lap_number: l, date_start: l === 1 && i === 0 ? null : new Date(t).toISOString(), lap_duration: l === 1 && k === 9905 ? null : +d.toFixed(3), is_pit_out_lap: l === 21, duration_sector_1: null, duration_sector_2: null, duration_sector_3: null, i1_speed: null, i2_speed: null, st_speed: null, segments_sector_1: [], segments_sector_2: [], segments_sector_3: [] });
      t += d * 1e3;
    }
  });
  return out;
}
const enVuelta = l => new Date(Date.parse(SALIDA[9905]) + l * 95e3).toISOString();
const openf1 = {
  laps: vueltas,
  sessions: () => SES.map(s => ({ session_key: s[0], session_name: s[1], session_type: s[2], date_start: T(s[3], 0), date_end: T(s[3], s[4]), meeting_key: 1300, circuit_key: 9, circuit_short_name: 'Austin', country_name: 'United States', location: 'Austin', gmt_offset: '-05:00:00', year: 2026, is_cancelled: false })),
  drivers: k => PILOTOS.map(p => ({ meeting_key: 1300, session_key: k, driver_number: p[2], broadcast_name: p[1].toUpperCase(), full_name: `${p[0]} ${p[1].toUpperCase()}`, name_acronym: p[6], team_name: p[4], team_colour: p[5], first_name: p[0], last_name: p[1], country_code: null })),
  session_result: k => k === 9905
    ? llegada.map((d, i) => ({ session_key: k, meeting_key: 1300, position: i + 1, driver_number: PILOTOS[d][2], number_of_laps: i === 4 ? 55 : 56, points: [25, 18, 15, 12, 10][i], dnf: false, dns: false, dsq: false, duration: i === 0 ? 5643.21 : null, gap_to_leader: i === 0 ? 0 : i === 4 ? '+1 LAP' : i * 3.5 }))
    : k === 9904
      ? PILOTOS.map((p, i) => ({ session_key: k, position: i + 1, driver_number: p[2], number_of_laps: 18, dnf: false, dns: false, dsq: false, duration: [93.0, 92.5, i < 4 ? 92.1 + i * 0.1 : null], gap_to_leader: [0, 0, i < 4 ? i * 0.1 : null] }))
      : PILOTOS.map((p, i) => ({ session_key: k, position: i + 1, driver_number: PILOTOS[(i + (k - 9900)) % 5][2], number_of_laps: 25, dnf: false, dns: false, dsq: false, duration: 95 + i * 0.2, gap_to_leader: i ? i * 0.2 : 0 })),
  stints: k => k !== 9905 ? [] : PILOTOS.flatMap(p => [{ session_key: k, stint_number: 1, driver_number: p[2], lap_start: 1, lap_end: 20, compound: 'MEDIUM', tyre_age_at_start: 0 }, { session_key: k, stint_number: 2, driver_number: p[2], lap_start: 21, lap_end: 56, compound: 'HARD', tyre_age_at_start: 0 }]),
  pit: k => k !== 9905 ? [] : PILOTOS.map((p, i) => ({ session_key: k, driver_number: p[2], lap_number: 20, date: enVuelta(20.5), pit_duration: 21 + i, lane_duration: 21 + i, stop_duration: 2.3 + i / 10 })),
  race_control: k => [{ session_key: k, date: enVuelta(11.5), driver_number: null, lap_number: 12, category: 'SafetyCar', flag: null, scope: 'Track', sector: null, message: 'SAFETY CAR DEPLOYED' }, { session_key: k, date: enVuelta(14.5), lap_number: 15, category: 'SafetyCar', flag: null, scope: 'Track', message: 'SAFETY CAR IN THIS LAP' }, { session_key: k, date: enVuelta(30), lap_number: 30, category: 'Flag', flag: 'YELLOW', scope: 'Sector', message: 'YELLOW IN TRACK SECTOR 4' }, { session_key: k, date: enVuelta(56), lap_number: 56, category: 'Flag', flag: 'CHEQUERED', scope: 'Track', message: 'CHEQUERED FLAG' }],
  weather: k => [{ session_key: k, date: null, air_temperature: 26.4, track_temperature: 38.9, humidity: 41, pressure: 1010, rainfall: 0, wind_direction: 180, wind_speed: 2.5 }],
};
const CORS = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
async function servir(ctx, modo) {
  HASTA = modo === 'pago' ? Date.parse('2026-10-24T21:30:00Z') : Infinity;
  await ctx.route(/api\.(openf1\.org|jolpi\.ca)/, r => {
    if (modo === 'sin-red') return r.abort();
    const u = new URL(r.request().url());
    if (u.host === 'api.jolpi.ca') {
      const m = u.pathname.match(/\/ergast\/f1\/2026\/(?:(\d+)\/)?([a-z]+)\/?$/);
      const f = m && jolpica[m[2]];
      // antes de la carrera, Jolpica aún no tiene la ronda 18
      if (modo === 'antes' || modo === 'pago' || !f || (m[1] && m[1] !== '18')) return r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(MR({ RaceTable: { Races: [] } })) });
      return r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(f()) });
    }
    const ep = u.pathname.replace('/v1/', ''), k = +u.searchParams.get('session_key');
    const f = openf1[ep];
    if (modo === 'antes' && ep === 'laps' && k === 9904) return r.fulfill({ status: 200, headers: CORS, body: '[]' }); // gratis: nada durante la sesión
    return r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(f ? f(k) : []) });
  });
}

const fallos = [];
const comprobar = (cond, txt) => { if (!cond) fallos.push(txt); console.log((cond ? '  ✓ ' : '  ✗ ') + txt); };
async function escenario(b, nombre, hora, modo, pruebas) {
  console.log(nombre);
  for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    const ctx = await b.newContext({ viewport: vp, timezoneId: 'Europe/Madrid' });
    await servir(ctx, modo);
    const pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', e => errs.push(e.message));
    pg.on('console', m => { if (m.type() === 'error' && !/api\.(openf1\.org|jolpi\.ca)/.test(m.location().url || '')) errs.push(m.text()); });
    await pg.clock.install({ time: new Date(hora) });
    await pg.goto(page);
    await pg.waitForTimeout(1200);
    if (vp.width === 1280) await pruebas(pg); else await pg.screenshot({ path: path.join(process.env.SHOTS || '/tmp', `directo-${nombre.split(' ')[0]}-movil.png`), fullPage: true });
    comprobar(!errs.length, `sin errores de JavaScript (${vp.width}px)${errs.length ? ': ' + errs.join(' | ') : ''}`);
    await ctx.close();
  }
}
const texto = (pg, sel) => pg.$eval(sel, e => e.innerText).catch(() => '');

(async () => {
  const b = await chromium.launch();
  await escenario(b, 'Después-de-la-carrera (25 oct, 23:30 UTC)', '2026-10-25T23:30:00Z', 'ok', async pg => {
    const home = await texto(pg, '#main');
    comprobar(/Kimi Antonelli, campeón del mundo/.test(home), 'detecta al campeón con el Mundial recibido');
    comprobar(/Fin de semana de F1 · Ronda 18/i.test(home) && /GP de Estados Unidos/.test(home), 'muestra el panel del fin de semana en Inicio');
    comprobar(/Clasificación · Carrera/.test(home) && /1:34:03\.210/.test(home) && /\+1 vuelta/.test(home), 'tabla de la carrera con tiempo y vueltas perdidas');
    comprobar((await pg.$$('.ty')).length === 5, 'gráfico de neumáticos con 5 pilotos');
    comprobar(/Coche de seguridad en pista/.test(home) && !/YELLOW/.test(home), 'dirección de carrera traducida y filtrada');
    comprobar(/Parada más rápida|La más rápida: Kimi Antonelli, 2,3 s/.test(home), 'parada más rápida');
    comprobar(/26,4 °C/.test(home) && /9 km\/h/.test(home), 'tiempo meteorológico');
    comprobar(/Kimi Antonelli gana el GP de Estados Unidos/.test(home), 'noticia automática del ganador');
    comprobar(/Carrera · P1 Antonelli/.test(await texto(pg, '.grid2')), 'P1 de la carrera en la agenda');
    comprobar(/GP de la Ciudad de México/i.test(await texto(pg, '.feature')), 'la cabecera pasa al siguiente GP');
    comprobar(/F1 en vivo/.test(await texto(pg, '#stamp')), 'indicador «F1 en vivo» en la cabecera');
    await pg.click('[data-hv="tw"]'); await pg.waitForTimeout(500);
    comprobar((await pg.$$('#tw-rows tr[data-n]')).length === 5, 'torre: 5 pilotos en la repetición');
    comprobar(/Vuelta 2 de 56/i.test(await texto(pg, '#tw-st')), 'torre: empieza al final de la primera vuelta');
    const orden = () => pg.$$eval('#tw-rows tr[data-n] td.drv', t => t.map(x => x.innerText.slice(0, 3)));
    await pg.evaluate(() => { RP.T = RP.B.t0 + 11 * 95e3; towerSync(); });
    const o10 = await orden();
    comprobar(o10[1] === 'VER' && o10[2] === 'HAM', 'torre: Verstappen va 2.º antes de las paradas');
    comprobar(/Coche de seguridad/i.test(await texto(pg, '#tw-st')), 'torre: coche de seguridad en la vuelta 12');
    await pg.evaluate(() => { RP.T = RP.B.t1; towerSync(); });
    const fin = await orden(), filas = await texto(pg, '#tw-rows');
    comprobar(fin.join(',') === 'ANT,HAM,VER,LEC,RUS', 'torre: orden final igual que la clasificación');
    comprobar(/\+1 V/.test(filas), 'torre: Russell aparece doblado');
    comprobar(/Final · 56 vueltas/i.test(await texto(pg, '#tw-st')), 'torre: marca el final');
    await pg.evaluate(() => { RP.T = RP.B.t0; towerSync(); });
    await pg.click('[data-tw="play"]'); await pg.waitForTimeout(700);
    comprobar(await pg.evaluate(() => RP.play && RP.T > RP.B.t0), 'torre: el botón de reproducir avanza la sesión');
    await pg.click('[data-tw="play"]');
    await pg.screenshot({ path: path.join(process.env.SHOTS || '/tmp', 'torre-escritorio.png'), fullPage: false, clip: { x: 0, y: 820, width: 1280, height: 900 } }).catch(() => {});
    await pg.click('[data-hv="res"]'); await pg.waitForTimeout(150);
    await pg.click('[data-sess="9904"]'); await pg.waitForTimeout(400);
    const q = await texto(pg, '#hub-slot');
    comprobar(/Clasificación · Clasificación/.test(q) && /Q3/.test(q) && /1:32\.100/.test(q), 'cambiar a la clasificación muestra Q1/Q2/Q3');
    await pg.click('.tab[data-k="f1"]'); await pg.waitForTimeout(200);
    const f1 = await texto(pg, '#main');
    comprobar(/Tras el GP de Estados Unidos · Ronda 18 de 23/i.test(f1), 'estado del campeonato actualizado');
    comprobar(/Hamilton[\s\S]*247/.test(f1) && f1.indexOf('Lewis Hamilton') < f1.indexOf('George Russell'), 'clasificación de pilotos reordenada con los puntos nuevos');
    await pg.click('.subtab[data-sub="res"]'); await pg.waitForTimeout(150);
    comprobar(/Estados Unidos[\s\S]*Austin[\s\S]*Podio: Antonelli, Hamilton, Verstappen/.test(await texto(pg, '#main')), 'nueva fila en Resultados');
    const porra = await pg.evaluate(() => PORRA.result);
    comprobar(porra && porra.p1 === 'Kimi Antonelli' && porra.podium.length === 3, 'la porra recibe el resultado');
    await pg.click('.tab[data-k="circuitos"]'); await pg.waitForTimeout(150);
    comprobar(/Ganador 2026: Kimi Antonelli/.test(await texto(pg, '.ccard[data-circ="us-2012"]')), 'el circuito de Austin pasa a «disputado»');
    await pg.screenshot({ path: path.join(process.env.SHOTS || '/tmp', 'directo-despues-escritorio.png'), fullPage: false });
  });
  await escenario(b, 'Durante-la-clasificación (24 oct, 21:30 UTC)', '2026-10-24T21:30:00Z', 'antes', async pg => {
    const home = await texto(pg, '#main');
    comprobar(/En directo · Clasificación/i.test(home) && /La sesión está en marcha/.test(home), 'la sesión en curso aparece en directo');
    comprobar(/P1 /.test(await texto(pg, '.grid2')), 'la agenda muestra el P1 de los libres ya disputados');
    comprobar(!/Kimi Antonelli, campeón del mundo/i.test(home), 'sin Mundial nuevo no se declara campeón');
  });
  await escenario(b, 'Directo-con-datos (24 oct, 21:30 UTC)', '2026-10-24T21:30:00Z', 'pago', async pg => {
    await pg.evaluate(() => liveTick()); await pg.waitForTimeout(800);
    const hub = await texto(pg, '#hub-slot');
    comprobar(/Se actualiza cada 10 segundos/.test(hub) && (await pg.$$('#tw-rows tr[data-n]')).length === 5, 'si llegan vueltas durante la sesión, la torre sale en directo');
    comprobar(/Minuto 2\d|Minuto 30/i.test(await texto(pg, '#tw-st')), 'torre en directo: muestra el minuto de la sesión');
  });
  await escenario(b, 'Sin-conexión (25 oct, 23:30 UTC)', '2026-10-25T23:30:00Z', 'sin-red', async pg => {
    const home = await texto(pg, '#main');
    comprobar(/GP de Estados Unidos/.test(home) && !/Fin de semana de F1 ·/i.test(home), 'Inicio funciona con la instantánea y sin panel en vivo');
    comprobar(/Actualizado: /.test(await texto(pg, '#stamp')), 'la cabecera muestra la fecha de la instantánea');
    await pg.click('.tab[data-k="f1"]'); await pg.click('.subtab[data-sub="wk"]'); await pg.waitForTimeout(150);
    comprobar(/No se ha podido conectar/.test(await texto(pg, '#main')), 'la pestaña Fin de semana explica que no hay conexión');
  });
  await b.close();
  if (fallos.length) { console.error(`\n${fallos.length} comprobaciones fallidas`); process.exit(1); }
  console.log('\nOK: la capa en vivo funciona con datos y sin conexión');
})();
