# Plan: Bloog Barrage

## Summary

- **Name:** Bloog Barrage (working title, builder choice).
- **One line:** Turn your real cannon, lob a shot, and knock down the other tower.
- **Players:** Two people by default; one person can choose a computer opponent.
- **Piece set:** `save-the-bloogs`, using the two Cannon pieces, glyph 2.
- **First move:** Tap Play, choose an opponent, place the Cannons on their towers, and tap Start Game.
- **Sound:** Short effects for placement, firing, impact, and victory; platform audio controls.
- **Goal:** Test whether turning a physical Cannon is a clear, satisfying way to aim a lob.
- **Starting point:** Exact board-games-ai Studio starter, TypeScript, Canvas 2D, Vite, vendored SDK beta.8.
- **Status:** Approved by the user on October 27, 2026: “Yes, build it.”

## How to play

1. Put your real Bloogs cannon on your tower.
2. Rotate to aim, then set your shot power on screen.
3. Tap Fire and watch the wind bend your shot.
4. Land three hits to bring down the other tower.

## Rules

- Two towers face each other across one colorful valley. Players alternate one shot at a time.
- Each tower starts with three health points. Hits crack the facade; its platform stays fixed until final collapse.
- A miss changes no health. Terrain blocks a shot. No timer rushes a human turn.
- Angle is between 15 and 80 degrees. The first resting cannon direction represents 45 degrees. Power is between 20 and 100 percent.
- Gravity and wind affect every shot. Wind changes between turns and is visible before firing.
- A short dotted arc shows the start of the trajectory, not the full landing location.
- All tuning values live together. Both players and AI use the same trajectory and hit rules.
- The first prototype has one valley, one shot type, tower damage, victory, and rematch.
- Terrain destruction, weapons, progression, networking, and additional piece roles are outside this first build.
- Placement binds ownership and acknowledges the cannon. Placement never fires.
- Rotation sets elevation. Moving a piece does not move its tower or dodge a shot.
- Lifting a cannon blocks that player's next shot until it returns. It does not erase health or ownership.
- Tracking gaps and pause redetection preserve ownership, aim calibration, and health. They never fire or repeat a placement effect.
- No digital cannon appears in play, including the AI side. The real piece supplies the cannon.
- Browser play shows the towers and trajectory only. Drag from a tower or use angle controls, set power, then fire.
- Real piece renders identify equipment in help only. Setup keeps the actual tower platforms visible. No cannon render follows a physical piece.
- Fire is a separate deliberate finger action. A shot already in flight completes before another begins.
- Hit feedback: a quick squash, colored burst, falling masonry, sound, and one clear health change.
- Victory: the tower falls and a short celebration leads to a shared result choice.

## Players and seating

- Two players own the left and right towers. Every screen and label faces the landscape on Board and in the browser, as requested by the user after trying the Board build.
- One shared horizontal power slider and Fire button control the active player's shot. Player names, health, wind, setup, help, and results use the same upright orientation.
- Board's selector in `src/seats.ts` supplies every player and AI. Identity follows `sessionId`.
- A Cannon placed at an unclaimed tower binds the next unbound human in the roster.
- Setup shows the chosen roster and cannon readiness separately. Choose Your Opponent opens Board's selector. While fewer than two players are seated it always adds a player, even when the first human owns the right tower. It never invents an anonymous native player.
- One registered AI type, named Pip, aims with bounded error and uses normal shot rules.
- AI uses the unclaimed seat and needs no physical cannon. Its tower stays visible; it has no cannon art.
- Players read the shared side-view valley and all controls from its landscape orientation.
- The browser host provides simulated player selection and pointer controls. Native detection never uses that fallback.
- Start Game becomes available after two distinct roster seats are bound and required human cannons are present at their matching towers. A deliberate tap starts the match; selection and placement never start it automatically.
- A human's first intentional shot starts the duel. No countdown or placement triggers a shot.
- Preserve seats and real pieces for rematches. Change setup releases bindings.

## Communication and teaching

| State | Next action | Signal | Ends when |
|---|---|---|---|
| Title | Tap Play or place a Cannon | Colorful valley, moving clouds, one landscape-facing title and Play button | Setup begins |
| Setup | Choose people, place cannons, tap Start Game | Player count/names, per-tower readiness, visible tower platforms, enabled Start Game | Start Game is tapped with both players ready |
| Aim | Turn the cannon | Active tower banner, angle numeral, short shot arc | Fire is tapped |
| Power | Set strength | Large power track and percent numeral | Shot begins |
| Flight | Watch the shot | Cannonball trail and wind arrow | Collision or miss |
| Hit | See damage | A tower section breaks and its health changes | Turn changes |
| Missing piece | Return your cannon | Empty destination on its tower | Piece returns |
| Pause/help | Resume | Platform menu freezes action; help shows real shot sequence | Resume |
| Result | Rematch or change setup | Winner and one shared pair of choices | Choice is made |

## First minute

1. Title: a vivid blue sky, soft hills, trees, and chunky stone towers establish the world.
2. Setup: choose the two players; place the real Cannons, with one short landing effect each; tap Start Game once both are ready.
3. First move: rotating adjusts elevation; a short arc explains the effect immediately.
4. First shot: choose power and tap Fire; follow a bright projectile to impact.
5. Turn change: the other tower's flag pulses, showing who acts next.
6. Interruption: lifting or pausing keeps the match and aim; return continues without another arrival effect.
7. Result: three hits topple the opposing tower. Rematch keeps the seated players.

## Result and replay

- Winner is the player whose tower remains. Result shows the winner and hit totals.
- One shared choice: Rematch or Change setup. No timer restarts play.
- Rematch resets health, wind, shots, projectile, and effects. It preserves players and resting cannon identities.
- Change setup releases seats and opens setup without changing the OS roster silently.

## Look

- Colorful Bloogs-inspired world chosen by the user. Original scenery, not Notebook Artillery's notebook artwork.
- Turquoise, warm coral, butter yellow, fresh green, and sky blue; rounded shapes with strong readable silhouettes.
- Chunky stone towers, layered rolling hills, small trees, clouds, pennants, and animated debris.
- Key art, play, help, and results use the same world. Draw scenery once into cached layers.
- Screen space around physical cannons stays clean. No drawn cannon or persistent follower.
- Canvas typography follows the starter font helpers. In-play text is at least 48 px, other text 32 px.
- Targets are at least 120 px, and critical text and controls stay 48 px from the glass edge.
- Asset plan: authored canvas valley/towers/effects; canonical piece art for identification; starter font; synthesized effects via `gameAudio()`.
- Proof: title, setup, ordinary play, hit, pause recovery, result, and rematch in a real browser. Hardware feel remains unverified until played on Board.

## Decisions

| Decision | Value | By | Source | Notes |
|---|---|---|---|---|
| Core inspiration | Notebook Artillery | person | Initial request | Angle, power, wind, opposing towers |
| Platform | Board, playable web first | person | Initial request | Use exact Studio starter |
| Players | Both; two-player default | person | Answer | AI is selected through the roster |
| Control | Physical rotation; touch power and Fire | person | Answer | Browser drag/angle fallback |
| Look | Colorful Bloogs world | person | Answer | Original world artwork |
| Cannon depiction | Physical piece only | person | Correction | No digital cannon in play, even for AI |
| Win | Three direct hits | builder | Proposed first playable | Fast enough to test complete matches |
| Seats | Left and right towers | builder | Tower duel geometry | Physical ownership remains independent of screen orientation |
| Title orientation | One landscape-facing title and Play button | person | Board screenshot correction, October 27 | Overrides the earlier repeated seat-facing title layout |
| All-screen orientation | Landscape setup, help, gameplay controls, and results | person | Follow-up correction, October 27 | Replaces all seat-facing UI and rotated touch hit tests |
| Start flow | Explicit Start Game after roster and cannon readiness | builder | User requested reliable starting | Add the second player rather than replacing a lone right-side player |
| Aim | Relative rotation from initial resting pose | builder | Avoid absolute-facing confusion | Keep zero through blinks and pause |
| Recipe | Aim Blast, adapted to deliberate turn-based fire | builder | Genre recipes | No automatic shots |
| Publishing | Local preview and packaged webapp first | builder | Requested Studio workflow | No external publish or push requested |

## Build steps

1. Copy the starter, install dependencies, add the Bloogs set, and preserve the minted app identity.
2. Build the basic shot, tower damage, turn, and win loop with a focused rule test.
3. Test and pack; inspect the core loop in a browser before adding the remaining features.
4. Add selectable AI, robust piece tracking, colorful scenery, effects, help, and rematch.
5. Test rules and lifecycle, pack, visually check, and record evidence separately for browser and Board.

## Run

- `npm ci`
- `npm run dev -- --host 0.0.0.0`
- `npm test`
- `npm run pack`
- Board installation is a later device step: `board-connect install <package>.webapp.zip --launch`.
