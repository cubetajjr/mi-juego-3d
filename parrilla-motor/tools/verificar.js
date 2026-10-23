// Opens every section of the site in a headless browser and fails on any JavaScript error.
// Usage: node parrilla-motor/tools/verificar.js
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const API_HOSTS = /api\.(openf1\.org|jolpi\.ca)/;
const page = 'file://' + path.resolve(__dirname, '..', 'index.html');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    const ctx = await b.newContext({ viewport: vp, timezoneId: 'Europe/Madrid' });
    // Sin red hacia las APIs de F1: la web tiene que funcionar igual con su instantánea (los datos en vivo se prueban en probar-directo.js)
    await ctx.route(API_HOSTS, r => r.abort());
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errs.push(e.message));
    pg.on('console', m => { if (m.type() === 'error' && !API_HOSTS.test(m.location().url || '')) errs.push(m.text()); });
    await pg.goto(page); await pg.waitForTimeout(300);
    for (const k of await pg.$$eval('.tab', t => t.map(x => x.dataset.k))) { await pg.click(`.tab[data-k="${k}"]`); await pg.waitForTimeout(80); }
    await pg.click('#legal-link');
    await pg.click('.tab[data-k="circuitos"]');
    for (const id of await pg.$$eval('.ccard', c => c.map(x => x.dataset.circ))) { await pg.goto(page + '#circuitos/' + id); await pg.reload(); await pg.waitForTimeout(60); }
    const q = await pg.evaluate(() => { const p = allQuiz(); return { n: p.length, bad: p.filter(x => new Set(x.opts).size !== x.opts.length).map(x => x.q) }; });
    if (q.bad.length) errs.push('Preguntas con opciones repetidas: ' + q.bad.join(' | '));
    if (vp.width === 390) console.log(`Preguntas del quiz: ${q.n}`);
  }
  await b.close();
  if (errs.length) { console.error('ERRORES:\n' + [...new Set(errs)].join('\n')); process.exit(1); }
  console.log('OK: todas las secciones cargan sin errores');
})();
