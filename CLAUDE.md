# TOPPLE: project memory

The owner is **bori147** on GitHub. **Talk to them in Spanish.** Code, comments and in-game text stay in English (global web audience; highest ad value in English-speaking markets).

Born in a claude.ai conversation that analysed the global games market. TOPPLE was chosen because it combines the patterns that most often make simple games spread: Wordle's daily scarcity and shareable result, Suika/PEAK-style physics chaos that makes clips by itself, Block Blast's one-verb simplicity, and a social layer (same blocks for everyone).

## The game

Every day, everyone gets the same 20 blocks in the same order (seeded by the day). Drag to aim, release to drop, rotate in 45° steps. When the last block lands, the tower must stand 3 s (plus up to 5 s more until nothing moves); its highest point is the score. Blocks that fall below the platform are lost. One official daily attempt (stored in localStorage); unlimited practice with random blocks.

## Commands

```
npm install && npm run build && npm test
npm run balance   # slow: bot heights over 60 days, determinism, fairness of daily sets
```
Edit `engine.js` or `src/index.template.html`, never `index.html` directly. `npm test` fails if the build is stale.

## Invariants: do not break

1. **Fixed physics step** `DT = 1/120`, 20 velocity / 10 position iterations. Results must never depend on frame rate.
2. **Same seed, same blocks, everywhere.** `blockSet(daySeed(day))`. Rules: first block is a stable one; at most one ball, never in the first six; never three of a kind in a row.
3. **One daily attempt.** Never sell or reward a second daily attempt. No ads in the daily tower; ads only in practice.
4. **planck pinned to exactly 1.4.2.** A different engine version can change how towers behave.
5. Determinism is exact on the same device (verified: same inputs, identical tower). Across browsers, `Math.sin/cos` can differ in the last bits, so replays or anti-cheat across devices would need deterministic trig. Not needed for the current design.

## Balance (measured with bots, not guessed)

| Bot | Median height | Top 10 % |
|---|---|---|
| Careful (widest base, centred) | 6.4 m | 11.5 m |
| Normal (some aiming error) | 4.0 m | 5.8 m |
| Random | 3.5 m | 4.4 m |

Skill roughly doubles the result. Even the careful bot loses about 8 blocks, because it puts everything dead centre; humans aim better. Real playtests decide the final tuning: platform width (`PLAT_W`), hover gap (`GAP`), friction, block weights.

## Lessons from building it

- A perfectly centred column of 17 cubes collapsed by itself: Box2D accumulates small errors in tall thin stacks. Fixed with 2 sub-steps per frame, more solver iterations, friction 0.9, some damping, and a shorter drop (`GAP = 0.35`). After that, 20 cubes stand still at 16.3 m.
- The first triangle was isosceles: always pointy on top, so nothing could rest on it. Replaced with a right triangle (two flat sides; two of them make a rectangle).
- The first "careful" bot rotated blocks only to minimise height, which stood T-shapes on their narrow stem. Bot artefacts can look like game problems; check the bot before changing the game.

## Current state

- Private playtest link (claude.ai artifact, only the owner can open it): https://claude.ai/artifact/4Mb7JgoHWjj21CQy5Qne8B
- `EPOCH` in `engine.js` is 3 Oct 2026 (tower #1 = launch day). Do not change it after launch: it would renumber every tower.

## Estado / contexto

- Live since launch day (3 Oct 2026) at https://bori147.github.io/topple/ (GitHub Pages from `main`, repo root). This repo is **public**, and every push to `main` publishes, so run `npm run build && npm test` before pushing. Never put secrets or personal data here.
- The market report `docs/research-mercado.md` stays local on purpose (it is in `.gitignore`): never `git add -f` it.
- Next step is real-player playtesting (targets below), and only with the owner's go-ahead.
- The owner is not a developer: explain things in plain Spanish and don't ask them to type terminal commands.
- The live URL has an external uptime monitor run by the owner; if the URL ever changes, tell them so it can be updated.

## Next steps, in order

1. Playtest with real people. Targets before investing more: next-day return (D1) above 30 %, and at least 5 % of daily players sharing their result.
2. One-tap clip export: last seconds in slow motion, 9:16, tower number burned in (canvas `captureStream()` + `MediaRecorder`).
3. Online layer: world percentile on the result screen and friend challenges. The owner's First Million project has a reusable zero-dependency Node + SQLite backend with live rule tuning and a dashboard.
4. Distribution: Poki / CrazyGames SDKs, a Discord Activity (everyone in a call builds the same tower at once), YouTube Playables.
5. Monetization in practice mode only: rewarded "undo last block", interstitials between practice towers.
