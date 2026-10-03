# TOPPLE

Everyone gets the same 20 blocks today. Build the tallest tower before it falls.

A daily physics game for the web. One official attempt per day, the same blocks for every player in the world, and a shareable result that shows the shape of your tower without giving anything away. A practice mode with random blocks is always open.

## Play

Open `index.html` in any modern browser. It is a single self-contained file (about 320 KB, physics engine included), so it also works on GitHub Pages, a web game portal, or offline.

Drag to aim, release to drop, and use the round button (or R / arrow up) to rotate 45°. On a keyboard: arrows to move, space to drop. When the last block lands, the tower has to stand for three seconds; its highest point is your score.

## Develop

```
npm install
npm run build      # rebuilds index.html from src/ and engine.js
npm test           # checks the build is current and plays full games in a simulated browser
npm run balance    # bots over 60 daily towers: heights, lost blocks, determinism (about a minute)
```

| Path | What it is |
|---|---|
| `engine.js` | Everything that decides a game: daily block sets, physics world, drops, height. No DOM. |
| `src/index.template.html` | The page: rendering, controls, sounds, daily flow, sharing. |
| `scripts/build.js` | Inlines the physics engine and `engine.js` into `index.html`. |
| `index.html` | The built game. Do not edit by hand; run `npm run build`. |
| `tests/` | UI test (full games through simulated taps) and the balance simulation. |

Physics: [planck.js](https://github.com/piqnt/planck.js) 1.4.2, a JavaScript port of Box2D, pinned to an exact version on purpose.
