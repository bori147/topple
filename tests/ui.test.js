/* Plays a full daily game and a practice game through simulated taps, using the real game script in index.html. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const GAME = (() => { const h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); const all = [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)]; return all[all.length - 1][1]; })();
function browser(storage) {
  const els = {}, handlers = {}, winL = {}, q = []; let T = 1000;
  const ctx = new Proxy({ canvas: { width: 128, height: 104 } }, { get: (t, k) => k in t ? t[k] : () => {}, set: (t, k, v) => (t[k] = v, true) });
  const mk = id => { const kids = [{ textContent: '' }, { textContent: '' }];
    return { id, style: {}, dataset: {}, hidden: false, textContent: '', innerHTML: '', width: 0, height: 0, children: [], firstChild: kids[0], lastChild: kids[1],
      classList: { s: new Set(), add(c) { this.s.add(c); }, remove(c) { this.s.delete(c); }, contains(c) { return this.s.has(c); }, toggle(c, on) { (on ?? !this.s.has(c)) ? this.s.add(c) : this.s.delete(c); } },
      addEventListener(e, f) { (handlers[id + ':' + e] = handlers[id + ':' + e] || []).push(f); }, setAttribute() {}, setPointerCapture() {}, appendChild(c) { this.children.push(c); },
      getContext: () => ctx }; };
  const el = id => els[id] || (els[id] = mk(id));
  el('menu').classList.add('on');
  const clip = [];
  const G = { innerWidth: 390, innerHeight: 844, devicePixelRatio: 2, location: { href: 'https://example.com/topple/#x' },
    document: { getElementById: el, documentElement: {}, createElement: () => ({ style: {} }) },
    getComputedStyle: () => ({ getPropertyValue: n => ({ '--sky': '#D6E6F0', '--ink': '#1E2A36' }[n] || '#888') }),
    matchMedia: () => ({ matches: false, addEventListener() {} }), localStorage: { getItem: k => storage.has(k) ? storage.get(k) : null, setItem: (k, v) => storage.set(k, String(v)) },
    navigator: { clipboard: { writeText: async t => clip.push(t) } }, requestAnimationFrame: f => q.push(f), setInterval: () => 0, setTimeout: (f) => 0, clearTimeout() {},
    addEventListener: (e, f) => (winL[e] = winL[e] || []).push(f), Math, Date, JSON, String, Number, Array, Object, Promise, console };
  G.window = G; G.planck = require('planck');
  const run = src => new Function('G', 'with (G) {\n' + src + '\n}')(G);
  run(fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8')); run(GAME);
  const fire = (id, ev, e) => (handlers[id + ':' + ev] || []).forEach(f => f(e || { preventDefault() {}, stopPropagation() {}, clientX: 195, pointerId: 1 }));
  const frames = n => { for (let i = 0; i < n; i++) { T += 16.67; q.splice(0).forEach(f => f(T)); } };
  return { els, fire, frames, clip, G };
}
(async () => {
  let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : (fail++, console.log('  FAIL:', m)); };
  const S = new Map(), b = browser(S);
  b.frames(2);
  ok(b.els.menu.classList.contains('on'), 'menu shown at start');
  b.fire('playDaily', 'click'); b.frames(2);
  ok(!b.els.menu.classList.contains('on'), 'menu closes on play');
  console.log('daily started:', b.els.tag.firstChild.textContent, '|', b.els.left.firstChild.textContent, b.els.left.lastChild.textContent);
  let drops = 0, rot = 0;
  for (let i = 0; i < 20; i++) {
    b.frames(40);                                         // ~0.67 s: the next block is ready
    if (i % 3 === 1) { b.fire('rot', 'pointerdown'); rot++; }
    const x = 195 + Math.round(Math.sin(i * 1.7) * 30);
    b.fire('cv', 'pointerdown', { clientX: x, pointerId: 1 }); b.fire('cv', 'pointermove', { clientX: x + 4 }); b.fire('cv', 'pointerup', {});
    drops++;
  }
  console.log(`dropped ${drops} blocks with ${rot} rotations | HUD: ${b.els.left.firstChild.textContent} left, "${b.els.left.lastChild.textContent}" | live height ${b.els.hNow.firstChild.textContent} m`);
  ok(b.els.left.firstChild.textContent === '0', 'all 20 blocks used');
  let f = 0; while (!b.els.end.classList.contains('on') && f < 1200) { b.frames(10); f += 10; }
  ok(b.els.end.classList.contains('on'), 'result sheet appears after the hold');
  const r = JSON.parse(S.get('topple.d.' + require(path.join(ROOT, 'engine.js')).dayIndex()) || 'null');
  console.log(`result after ${(f / 60).toFixed(1)} s of hold: ${b.els.endH.firstChild.textContent} m | "${b.els.endSub.textContent}" | saved ${r ? r.h + ' m, grid ' + r.grid.length + 'x' + r.grid[0].length : 'NOTHING'}`);
  ok(r && r.h > 0 && r.grid.length >= 1, 'daily result saved');
  b.fire('share', 'click'); await new Promise(res => setTimeout(res, 10));
  console.log('--- share text ---\n' + (b.clip[0] || 'NONE') + '\n------------------');
  ok(b.clip[0] && b.clip[0].startsWith('TOPPLE #') && !b.clip[0].includes('#x'), 'share text copied without the hash');
  b.fire('toMenu', 'click');
  console.log('menu after daily:', b.els.playDaily.textContent, '|', b.els.streak.textContent, '| done panel hidden:', b.els.menuDone.hidden);
  ok(/See today/.test(b.els.playDaily.textContent) && b.els.streak.textContent === '1-day streak', 'one attempt per day, streak 1');
  b.fire('playDaily', 'click');
  ok(b.els.end.classList.contains('on') && !b.els.share.hidden, 'second tap shows the result instead of a new attempt');
  b.fire('again', 'click'); b.frames(2);
  console.log('practice:', b.els.tag.firstChild.textContent, b.els.tagSub.textContent);
  for (let i = 0; i < 20; i++) { b.frames(40); b.fire('cv', 'pointerdown', { clientX: 195 }); b.fire('cv', 'pointerup', {}); }
  f = 0; while (!b.els.end.classList.contains('on') && f < 1200) { b.frames(10); f += 10; }
  console.log('practice result:', b.els.endH.firstChild.textContent, 'm |', b.els.endSub.textContent, '| best saved', S.get('topple.best'), '| share hidden', b.els.share.hidden);
  ok(+S.get('topple.best') > 0 && b.els.share.hidden, 'practice best saved, no daily share');
  const b2 = browser(S); b2.frames(1);
  ok(/See today/.test(b2.els.playDaily.textContent), 'reload keeps the daily lock');
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
