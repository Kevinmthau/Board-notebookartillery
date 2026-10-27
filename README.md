# Bloog Barrage

A first playable artillery duel for Board, built from the exact `board-games-ai` Studio starter.

Source: [Kevinmthau/Board-notebookartillery](https://github.com/Kevinmthau/Board-notebookartillery).

Use the physical Save the Bloogs Cannon pieces. There is no digital cannon during play. Turn to aim, set power, and tap Fire. Three direct hits topple the other tower. Two players share the screen, or choose Pip as a computer opponent.

The wider battlefield has smaller towers, freshly generated hills, and nine to thirteen destructible trees each match. Shots carve lasting craters and knock trees down, opening paths for later shots. Occasional passing birds can block a shot and fly away unharmed. Pale distant trees are scenery. Rematch generates a new valley; Continue preserves the saved layout and damage.

## Play in a browser

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/` (or the port Vite reports). Select **Play**, then **Choose your opponent**. Choose a friend or Pip, then tap **Start Game**.

- Drag from your tower to aim, or use the **− / +** controls.
- Drag the power track, then tap **Fire**.
- Left/right arrows adjust angle. Up/down arrows adjust power. Space fires.
- Press **P** for the simulated Board menu, which includes **How to play**.
- The browser shows only towers, shots, and scenery. No cannon proxy is drawn.

## Standalone browser build

```sh
npm run build:web
python3 -m http.server 4175 --bind 127.0.0.1 --directory web-dist
```

Open `http://127.0.0.1:4175/`. The `web-dist/` folder is a complete static web build with Studio's simulated host and player selector. Serve it over HTTP.

## Board package

```sh
npm test
npm run pack
board-connect install bloog-barrage.webapp.zip --launch
```

The native package contains the configured Board platform and Save the Bloogs model. It excludes browser simulation files.

Tap **Play**, choose your opponent using Board's player selector, and put each human player's physical Cannon on its tower platform. Setup shows player and cannon readiness; tap **Start Game** when ready. Pip needs no physical cannon. All screens face the landscape, with one shared power slider and Fire button for the active player. Keep the cannon on its platform while turning; Fire is disabled if it is missing or displaced. The initial resting facing defines 45 degrees. Turn counterclockwise on the left and clockwise on the right to raise the shot.

The smaller towers now sit farther toward the left and right edges. Move the real cannons to those new tower positions when using this build.

The app identity is committed in `board.config.json`; do not change it after installation.

## Project map

- `src/artillery.ts`: tuning values, trajectory, collision, turn, and victory rules.
- `src/cannons.ts`: physical identity, placement, rotation, and pause recovery.
- `src/opponent.ts`: bounded AI aiming with the shared physics.
- `src/world.ts`: cached landscape, towers, flags, and collapse animation.
- `src/main.ts`: game flow, controls, roster, effects, and saves.
- `docs/PLAN.md`: approved design and decisions.
- `docs/ACCEPTANCE-LEDGER.md`: verification and remaining physical checks.

The gameplay reference is [Notebook Artillery](https://gamemaker.io/en/showcase/notebook-artillery). Scenery and effects are original. Board and Bloogs equipment assets come from the supplied Studio starter.

The prototype is installed on KT's Board. See the acceptance ledger for device screenshots, automated startup and input checks, and remaining physical playtest evidence.
