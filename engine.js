/* TOPPLE engine: everything that decides the outcome of a game. No DOM.
   Runs in the browser (inlined into index.html) and in Node (tests).
   Same seed + same inputs -> same tower on the same device. */
(function (root) {
  'use strict';
  const pl = root.planck;
  const V = (x, y) => new pl.Vec2(x, y);

  const DT = 1 / 120;           // fixed physics step (two per frame): results never depend on frame rate
  const PLAT_W = 5;             // platform width in metres
  const BLOCKS = 20;            // blocks per tower
  const HOLD = 3;               // seconds the finished tower must stand
  const FALLEN_Y = -1.2;        // below the platform top: the block is lost
  const GAP = 0.35;             // a block hovers this far above the tower before it drops
  const EPOCH = new Date(2026, 9, 3);   // tower #1: launch day, 3 Oct 2026.

  /* Tiny seeded PRNG (mulberry32): same seed, same sequence, every device. */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dayIndex(now) {
    const d = now || new Date();
    const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((local - EPOCH) / 864e5) + 1;
  }
  const daySeed = day => (day * 2654435761) >>> 0;

  /* Block catalogue. Parts are convex pieces in local coordinates (metres).
     color: 0 cobalt, 1 sun, 2 mint, 3 violet. */
  const box = (w, h, cx = 0, cy = 0) => ({ poly: [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]] });
  const TYPES = {
    cube:   { w: 14, color: 0, parts: s => [box(0.8 * s, 0.8 * s)] },
    brick:  { w: 16, color: 1, parts: s => [box(1.6 * s, 0.55 * s)] },
    plank:  { w: 10, color: 2, parts: s => [box(2.6 * s, 0.32 * s)] },
    pillar: { w: 10, color: 3, parts: s => [box(0.5 * s, 1.6 * s)] },
    tri:    { w: 7,  color: 1, parts: s => [{ poly: [[-0.6 * s, -0.45 * s], [0.6 * s, -0.45 * s], [-0.6 * s, 0.75 * s]] }] },
    wedge:  { w: 10, color: 0, parts: s => [{ poly: [[-0.8 * s, -0.3 * s], [0.8 * s, -0.3 * s], [0.4 * s, 0.3 * s], [-0.4 * s, 0.3 * s]] }] },
    ell:    { w: 9,  color: 2, parts: s => [box(1.4 * s, 0.42 * s, 0, -0.21 * s), box(0.42 * s, 0.6 * s, -0.49 * s, 0.3 * s)] },
    tee:    { w: 9,  color: 3, parts: s => [box(1.6 * s, 0.4 * s, 0, 0.3 * s), box(0.42 * s, 0.6 * s, 0, -0.2 * s)] },
    ball:   { w: 4,  color: 2, parts: s => [{ circle: 0.42 * s }] }
  };
  const SCALES = [0.85, 1, 1, 1.15];

  /* The day's blocks. Rules keep every set fair: a stable first block,
     at most one ball (never early), never three of a kind in a row. */
  function blockSet(seed) {
    const r = rng(seed), out = [];
    const names = Object.keys(TYPES), total = names.reduce((s, n) => s + TYPES[n].w, 0);
    const pick = () => { let x = r() * total; for (const n of names) { x -= TYPES[n].w; if (x < 0) return n; } return names[0]; };
    let balls = 0;
    for (let i = 0; i < BLOCKS; i++) {
      let t;
      if (i === 0) t = ['brick', 'cube', 'wedge'][Math.floor(r() * 3)];
      else for (let k = 0; k < 20; k++) {
        t = pick();
        if (t === 'ball' && (balls >= 1 || i < 6)) continue;
        if (i >= 2 && out[i - 1].type === t && out[i - 2].type === t) continue;
        break;
      }
      if (t === 'ball') balls++;
      out.push({ type: t, scale: i === 0 ? 1 : SCALES[Math.floor(r() * SCALES.length)] });
    }
    return out;
  }
  const partsOf = b => TYPES[b.type].parts(b.scale);
  const colorOf = b => TYPES[b.type].color;

  /* Rotated local extents of a block: used to hover it above the tower. */
  function extents(b, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    for (const p of partsOf(b)) {
      const pts = p.circle ? [[p.circle, 0], [-p.circle, 0], [0, p.circle], [0, -p.circle]] : p.poly;
      for (const [x, y] of pts) {
        const rx = x * c - y * s, ry = x * s + y * c;
        minX = Math.min(minX, rx); maxX = Math.max(maxX, rx); minY = Math.min(minY, ry); maxY = Math.max(maxY, ry);
      }
    }
    return { minX, maxX, minY, maxY };
  }

  function createGame(seed) {
    const world = new pl.World({ gravity: V(0, -10) });
    const ground = world.createBody();
    ground.createFixture(new pl.Box(PLAT_W / 2, 0.25, V(0, -0.25), 0), { friction: 0.9 });
    return { world, seed, set: blockSet(seed), next: 0, bodies: [], frame: 0, lost: 0, inputs: [] };
  }

  /* Drop block number g.next at (x, y) with angle. Returns the body. */
  function drop(g, x, y, angle) {
    const b = g.set[g.next];
    const body = g.world.createBody({ type: 'dynamic', position: V(x, y), angle, linearDamping: 0.1, angularDamping: 0.4 });
    for (const p of partsOf(b)) {
      const shape = p.circle ? new pl.Circle(p.circle) : new pl.Polygon(p.poly.map(([px, py]) => V(px, py)));
      body.createFixture(shape, { density: 1, friction: 0.9, restitution: 0 });
    }
    body.setUserData({ i: g.next, block: b, fallen: false });
    g.bodies.push(body);
    g.inputs.push([g.frame, +x.toFixed(4), +angle.toFixed(4)]);
    g.next++;
    return body;
  }

  /* One fixed step. Returns the blocks lost this step. */
  function step(g) {
    g.world.step(DT, 20, 10);
    g.frame++;
    const lostNow = [];
    for (const body of g.bodies) {
      const d = body.getUserData();
      if (!d.fallen && body.getPosition().y < FALLEN_Y) { d.fallen = true; g.lost++; lostNow.push(body); }
    }
    for (let i = g.bodies.length - 1; i >= 0; i--) {          // far below: remove for good
      const b = g.bodies[i];
      if (b.getUserData().fallen && b.getPosition().y < -30) { g.world.destroyBody(b); g.bodies.splice(i, 1); }
    }
    return lostNow;
  }

  /* Highest point of a body in world space. */
  function topOf(body) {
    let top = -Infinity;
    for (let f = body.getFixtureList(); f; f = f.getNext()) {
      const s = f.getShape();
      if (s.getType() === 'circle') top = Math.max(top, body.getWorldPoint(s.getCenter()).y + s.getRadius());
      else for (const v of s.m_vertices) top = Math.max(top, body.getWorldPoint(v).y);
    }
    return top;
  }
  /* Tower height: the highest point of any block still on the tower. */
  function height(g) {
    let h = 0;
    for (const b of g.bodies) if (!b.getUserData().fallen) h = Math.max(h, topOf(b));
    return Math.max(0, h);
  }
  const moving = g => g.bodies.some(b => !b.getUserData().fallen && b.isAwake() && b.getLinearVelocity().length() > 0.05);

  /* Share grid: which cells of the tower are filled, and with what colour. */
  function grid(g, cols = 7) {
    const h = height(g), rows = Math.max(1, Math.min(9, Math.ceil(h / 0.7)));
    const rowH = Math.max(h / rows, 0.01), x0 = -PLAT_W / 2 - 0.6, colW = (PLAT_W + 1.2) / cols, out = [];
    for (let r = rows - 1; r >= 0; r--) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        const pt = V(x0 + (c + 0.5) * colW, (r + 0.5) * rowH);
        let hit = -1;
        for (const b of g.bodies) {
          if (b.getUserData().fallen) continue;
          for (let f = b.getFixtureList(); f; f = f.getNext()) if (f.testPoint(pt)) hit = colorOf(b.getUserData().block);
        }
        row.push(hit);
      }
      out.push(row);
    }
    return out;
  }

  const api = { DT, GAP, PLAT_W, BLOCKS, HOLD, EPOCH, rng, dayIndex, daySeed, TYPES, blockSet, partsOf, colorOf, extents,
                createGame, drop, step, topOf, height, moving, grid };
  root.ToppleEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
