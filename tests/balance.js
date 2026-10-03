/* Balance check: careful, normal and random bots over 60 daily towers, determinism, and fairness of the daily sets.
   Slow (about a minute). Run after changing physics or blocks: npm run balance */
globalThis.planck = require('planck');
const E = require('../engine.js');
const bottomWidth = (b, a) => { const c = Math.cos(a), s = Math.sin(a); const pts = [];
  for (const p of E.partsOf(b)) { if (p.circle) return 0; for (const [x, y] of p.poly) pts.push([x * c - y * s, x * s + y * c]); }
  const minY = Math.min(...pts.map(q => q[1])); const xs = pts.filter(q => q[1] < minY + 0.03).map(q => q[0]); return Math.max(...xs) - Math.min(...xs); };
const stableAngle = b => { let best = 0, bs = -1e9; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, e = E.extents(b, a); const sc = bottomWidth(b, a) * 2 - (e.maxY - e.minY); if (sc > bs + 1e-6) { bs = sc; best = a; } } return best; };
const flatAngle = b => { let best = 0, bh = 1e9; for (const a of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) { const e = E.extents(b, a); const h = e.maxY - e.minY; if (h < bh - 1e-6) { bh = h; best = a; } } return best; };
function play(seed, style, r) {
  const g = E.createGame(seed);
  for (let i = 0; i < E.BLOCKS; i++) {
    const b = g.set[g.next];
    let a, x;
    if (style === 'careful') { a = stableAngle(b); x = 0; }
    else if (style === 'normal') { a = stableAngle(b); x = (r() - 0.5) * 1.6; if (r() < 0.25) a += Math.PI / 4 * (r() < .5 ? 1 : -1); }
    else { a = Math.floor(r() * 8) * Math.PI / 4; x = (r() - 0.5) * 5; }
    const e = E.extents(b, a);
    E.drop(g, x, E.height(g) - e.minY + E.GAP, a);
    let f = 0;
    if (style === 'careful') { while (f < 480 && (f < 60 || E.moving(g))) { E.step(g); f++; } }
    else while (f < 84) { E.step(g); f++; }          // a real player waits ~0.7 s between drops
  }
  for (let f = 0; f < E.HOLD / E.DT || (E.moving(g) && f < (E.HOLD + 5) / E.DT); f++) E.step(g);
  const h = E.height(g), still = !E.moving(g);
  for (let f = 0; f < 1200; f++) E.step(g);                       // 10 more seconds: does anything drift?
  return { h, lost: g.lost, still, drift: Math.abs(E.height(g) - h), inputs: g.inputs };
}
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const t0 = Date.now();
for (const style of ['careful', 'normal', 'random']) {
  const R = []; const r = E.rng(7);
  for (let d = 1; d <= 60; d++) R.push(play(E.daySeed(d), style, r));
  const H = R.map(x => x.h), L = R.map(x => x.lost);
  console.log(`${style.padEnd(8)} height m: p10 ${pct(H,.1).toFixed(2)} | median ${pct(H,.5).toFixed(2)} | p90 ${pct(H,.9).toFixed(2)} | blocks lost median ${pct(L,.5)} | settled at end ${R.filter(x=>x.still).length}/60 | max drift after 10 s ${Math.max(...R.map(x=>x.drift)).toFixed(3)} m`);
}
// determinism: replay the same inputs twice
function replay(seed, inputs) { const g = E.createGame(seed); let k = 0;
  for (let f = 0; k < inputs.length || f < inputs[inputs.length-1][0] + 600; f++) {
    while (k < inputs.length && inputs[k][0] === g.frame) { const [ , x, a] = inputs[k]; const e = E.extents(g.set[g.next], a); E.drop(g, x, E.height(g) - e.minY + E.GAP, a); k++; }
    E.step(g); }
  return g.bodies.map(b => b.getPosition().x.toFixed(9) + ',' + b.getPosition().y.toFixed(9)).join('|') + ' h=' + E.height(g).toFixed(9); }
const run = play(E.daySeed(5), 'normal', E.rng(99));
const a = replay(E.daySeed(5), run.inputs), b = replay(E.daySeed(5), run.inputs);
console.log('determinism: same inputs twice ->', a === b ? 'IDENTICAL' : 'DIFFERENT');
const s1 = E.blockSet(E.daySeed(3)).map(b => b.type), s2 = E.blockSet(E.daySeed(3)).map(b => b.type);
console.log('today #' + E.dayIndex(new Date(2026, 9, 3)) + ' blocks:', s1.join(' '), '| same for everyone:', s1.join() === s2.join());
let balls = 0, early = 0, triples = 0;
for (let d = 1; d <= 200; d++) { const s = E.blockSet(E.daySeed(d)); const nb = s.filter(x => x.type === 'ball').length; balls = Math.max(balls, nb); if (s.slice(0, 6).some(x => x.type === 'ball')) early++; for (let i = 2; i < s.length; i++) if (s[i].type === s[i-1].type && s[i].type === s[i-2].type) triples++; }
console.log(`200 days: max balls per day ${balls}, balls in first 6 blocks ${early}, three-in-a-row ${triples} | ${((Date.now()-t0)/1000).toFixed(1)} s`);
