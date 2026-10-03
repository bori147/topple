#!/usr/bin/env node
'use strict';
/* Builds index.html: src/index.template.html + planck (physics) + engine.js, all inlined,
   so the game is one self-contained file that works anywhere (GitHub Pages, a portal, offline).
     node scripts/build.js          write index.html
     node scripts/build.js --check  fail if index.html is out of date */
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const planck = fs.readFileSync(require.resolve('planck/dist/planck.min.js'), 'utf8').replace('//# sourceMappingURL=planck.min.js.map', '');
const tpl = read('src/index.template.html');
if (tpl.split('/*__PLANCK__*/').length !== 2 || tpl.split('/*__ENGINE__*/').length !== 2) { console.error('Template markers missing.'); process.exit(1); }
const out = tpl.replace('/*__PLANCK__*/', () => planck).replace('/*__ENGINE__*/', () => read('engine.js'));
const target = path.join(root, 'index.html');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== out) { console.error('index.html is out of date. Run: npm run build'); process.exit(1); }
  console.log('index.html is up to date.'); process.exit(0);
}
fs.writeFileSync(target, out);
console.log(`Built index.html (${Math.round(out.length / 1024)} KB).`);
