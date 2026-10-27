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

- Two smaller towers face each other across a wide colorful valley with freshly generated hills and solid foreground trees each match. Players alternate one shot at a time.
- Each tower starts with three health points. Hits crack the facade; its platform stays fixed until final collapse.
- A miss changes no tower health. Hills, tree trunks, and tree crowns block shots; distant pale trees are scenery. A terrain hit carves a lasting crater. A tree hit knocks it down; digging away its roots also brings it down. Later shots and Pip use the changed terrain. No timer rushes a human turn.
- On Board, shot direction follows the physical Cannon barrel immediately, with no initial-pose calibration or angle clamp. The angle readout reports its actual elevation toward the other tower. Browser controls and AI keep their 15–80 degree elevation range. Power is between 20 and 100 percent.
- Gravity and wind affect every shot. Wind changes between turns and is visible before firing.
- A short 0.30-second dotted arc shows the launch direction, not the landing location. The smaller target and taller obstacles require a more precise lob.
- On Board, the arc and cannonball start just beyond the real Cannon spout and launch straight along the barrel, using the same measured footprint and sensed facing for both position and direction. Gravity and wind then bend the trajectory. Shallow, vertical, backward, or downward physical orientations are not remapped to a different direction.
- All tuning values live together. Both players and AI use the same trajectory and hit rules.
- Every new game and rematch generates a new valley: hill position, height, and width, plus tree positions and sizes vary. The same saved match retains its exact layout and damage.
- Small groups of birds occasionally cross the valley. A bird can block either player’s shot, chirps, and flies away; the turn ends without tower damage. Watch for a gap before firing. Birds use the match clock and freeze during pause/help.
- The prototype has one shot type, tower damage, victory, and rematch.
- Weapons, progression, networking, and additional piece roles are outside this build.
- Placement binds ownership and acknowledges the cannon. Placement never fires.
- Rotation sets elevation. Moving a piece does not move its tower or dodge a shot.
- Lifting a cannon blocks that player's next shot until it returns. It does not erase health or ownership.
- Tracking gaps and pause redetection preserve ownership and health. Re-detection immediately uses the current physical barrel direction, including turns made while paused. They never fire or repeat a placement effect.
- Both human cannons track rotation independently while resting on their towers. At each turn handoff, the new active cannon supplies the angle and guide; only Fire beneath that tower accepts a shot.
- A resting piece remains eligible for pause recovery through delayed detection and repeated menu openings; a genuine observed lift still uses the normal short tracking-gap window. Pause cancels the pending display callback so resume maintains one render loop.
- No digital cannon appears in play, including the AI side. The real piece supplies the cannon.
- Browser play shows the towers and trajectory only. Drag from a tower or use angle controls, set power, then fire.
- Real piece renders identify equipment in help only. Setup keeps the actual tower platforms visible. No cannon render follows a physical piece.
- Fire is a separate deliberate finger action. A shot already in flight completes before another begins.
- Fire checks the current contact batch before acting: a lift, invalid pose, wrong glyph, or move away from the tower immediately blocks the shot, even before the next display frame.
- Tower collisions apply from launch, including a downward physical shot into the shooting player's own tower.
- Hit feedback: a quick squash, colored burst, falling masonry, sound, and one clear health change. Miss feedback identifies whether the shot struck a hillside or treetop.
- Terrain damage persists through turns, pause, and same-build saves. Rematch creates a different layout of fresh hills and trees. Physical tower platforms stay fixed and their immediate ground is protected so real cannons do not need repositioning after a blast.
- Victory: the tower falls and a short celebration leads to a shared result choice.

## Players and seating

- Two players own the left and right towers. Every screen and label faces the landscape on Board and in the browser, as requested by the user after trying the Board build.
- One shared horizontal power slider and Fire button control the active player's shot. Fire sits below the active Cannon's tower and switches sides with the turn; angle and power stay centered between the towers. The button stays fixed to the tower rather than following small physical-piece movements. Player names, health, wind, setup, help, and results use the same upright orientation.
- The in-game question-mark button is removed. How to Play remains on the title screen and in the platform menu.
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
- A roster change that leaves either tower unassigned returns play, results, or their help screen to setup for explicit confirmation. Rematch requires two assigned roster players.

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
- A saved match arriving while title-screen help is open remains available through Continue when help closes.
- Rematch resets health, wind, shots, projectile, bird crossings, and effects, and generates new hills and trees. It preserves players and resting cannon identities.
- Change setup releases seats and opens setup without changing the OS roster silently.

## Look

- Colorful Bloogs-inspired world chosen by the user. Original scenery, not Notebook Artillery's notebook artwork.
- Turquoise, warm coral, butter yellow, fresh green, and sky blue; rounded shapes with strong readable silhouettes.
- Towers, flags, and stone details use 58% of their earlier scale. Towers sit farther apart at x=240 and x=1680; the real Cannon centers sit at y=678, with their original physical footprint clearance preserved.
- Varied ridges, solid foreground trees, pale distant forests, smaller clouds and sun create the wider battlefield. Small colorful birds flap across the sky using the same positions as their collision shapes. Ground and solid tree geometry are shared with physics so visible obstacles stop shots at their outlines.
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
| Battlefield difficulty | Zoomed-out view, smaller targets, more hills and trees | person | Browser feedback, October 27 | Targets were too easy to hit; obstacles affect collisions |
| In-play help button | Removed | person | Browser annotation, October 27 | Help stays in title and system menu |
| Fire button position | Below the shooting Cannon's tower | person | Requested move, October 27 | Switches with the active turn; centered angle/power controls keep both sides clear |
| Obstacle durability | Destructible hills and trees | person | Preference answer, October 27 | Persistent craters, felled trees, and AI reacting to changed terrain |
| Replay variation | Different hills and trees every game | person | Follow-up request, October 27 | Seeded per-match geometry; fixed physical cannon platforms |
| Moving obstacles | Occasional passing birds | person | Follow-up request, October 27 | Both players and Pip can be blocked; bird flies away |
| Aim | Absolute physical barrel direction | person | Photo and “straight out of the spout” correction, October 27 | Supersedes builder's relative 45° calibration; no smoothing lag, deadband, or native 15–80° clamp |
| Aim guide origin | Actual physical Cannon spout | person | Spout-alignment correction, October 27 | Use the footprint's forward edge plus ball clearance and its actual facing for both preview and shot |
| Recipe | Aim Blast, adapted to deliberate turn-based fire | builder | Genre recipes | No automatic shots |
| Publishing | Public GitHub repository at `Kevinmthau/Board-notebookartillery` | person | Commit and push request, October 27 | Preserve existing history, vendored SDK, lockfile, and app identity; `main` is the public default branch |
| In-play label floor | Wind, turn, angle, power, and browser aim hint use at least 48 px | builder | Code review, October 27 | Corrects the previous 32 px helper calls, which conflicted with the Board floor; the offscreen-shot arrow also stays inside the 48 px safe inset |

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
- When installing, target this project's permanent appId `44a14729-e058-41c3-9812-588229c563e6`. The October 27 player-2 investigation found a second installed app also named Bloog Barrage (`83c56145-abcc-5db7-8fb5-63e71b5c52c9`); its contents and which copy was used for the reported failure are unverified. Launch the project's app explicitly for hardware validation.
