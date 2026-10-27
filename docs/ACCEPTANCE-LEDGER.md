# Acceptance ledger: Bloog Barrage

## October 27, 2026 — Code review fixes

- **Request:** Review the game, fix findings until clear, then commit and push.
- **Source evidence:** Reviewed gameplay/AI and shared obstacle geometry, native tracking and physical barrel input, main roster/save/pause/result lifecycle, UI floors, browser adapter, and package scripts. Fixed the issues recorded in `docs/EDIT-HISTORY.md`; independent review found no remaining actionable issues in those scopes. This is a review result, not a claim that all possible bugs are eliminated.
- **Automated evidence:** `npm test`: 117 passed, 0 failed, 3 inherited catalog skips. New coverage includes early downward tower hits, invalid glyph-zero poses, delayed/repeated pause recovery, queued RAF cancellation, same-batch lift/move/wrong-piece Fire rejection, roster replacement/removal, and late Continue restoration from title help. Existing AI, terrain, save, physical spout, and gameplay checks pass. `npm run build:web` passes TypeScript, Vite, native packing, and standalone browser packaging. Native platform build: `c607118b44364d1f`; appId and packageId preserved.
- **Browser evidence:** Actual pointer clicks verified Friend selection, Cancel, replacing with Pip, and starting solo play. A separate two-human match verified enlarged HUD labels and aim hint, Fire on both sides, and pausing/resuming an in-flight shot before the next turn. Screenshots: `docs/screenshots/review-selector-pip-browser.png` and `docs/screenshots/review-hud-browser.png`.
- **Board and human evidence:** No new device installation or physical playtest in this review. Existing hardware reach, pause-alignment, and full-match checks remain open.
- **Handover:** Commit and push the reviewed source, regressions, and evidence to the existing `codex/bloog-barrage` branch.

## October 27, 2026 — Fire layout accepted; commit and push

- **Human evidence:** The user confirmed “That works” and requested committing and pushing the change. The Fire-button placement is accepted; this does not establish a complete hardware match or a separate reach assessment.
- **Handover:** Publish the active-side Fire layout, updated integration inputs, project records, and screenshots to the existing repository. The validated implementation has 112 passing tests and 3 inherited catalog skips, successful native/browser builds, browser firing checks on both sides, and a successful Board installation. Only acceptance records changed after validation.

## October 27, 2026 — Fire below the active Cannon

- **Request/change:** Move Fire beneath the shooting Cannon. Its center now aligns with the active tower at x240 or x1680, switching with the turn. Angle and power stay in the middle. Drawn controls and touch targets share bounds, remain at least 120 px, and keep the footer and shadows 48 px inside the glass. The button does not follow piece movement.
- **Automated evidence:** `npm test`: 112 passed, 0 failed, 3 inherited catalog skips. Updated the existing native integration's touch positions; both sides, power drag, missing Cannon, solo play, and held-finger pause recovery pass. `npm run build:web` passes TypeScript, Vite, native packaging, and browser packaging. ZIP integrity and diff whitespace checks pass.
- **Browser evidence:** Started a two-player match; checked Fire below the left tower, adjusted angle with both buttons, dragged power from 70% to 80%, and fired. Fire moved beneath the right tower at the next turn; tapping the vacated left position did nothing, while tapping right Fire launched the shot. Screenshots: `docs/screenshots/fire-left-browser.png` and `docs/screenshots/fire-right-browser.png`.
- **Board evidence:** Build `dcb9639549a2c5cd` installed and launched on the paired Board, preserving appId/packageId. `docs/screenshots/board-fire-layout.png` shows the title loaded. Startup logs show platform state ready and only the existing optional font-metadata/favicon warnings, with no new application exception.
- **Human evidence:** The relocated control's reach with real Cannons has not yet been checked on hardware.

## October 27, 2026 — Barrel alignment accepted and committed

- **Human evidence:** After trying build `ddb169a45a95c862` on Board, the user confirmed: “That works now,” and requested committing and pushing the fix. Real-piece spout/guide alignment is accepted. This does not establish a separate pause-recovery playtest or a complete hardware match.
- **Handover:** Commit the shared physical muzzle/direction implementation, regression tests, plan, asset record, edit history, and Board screenshots. The final implementation has 112 passing tests and 3 inherited catalog skips, with native/browser builds passing; no gameplay code changed after that validation.

## October 27, 2026 — Straight barrel direction correction

- **Request/evidence:** User reported the preceding origin-only fix was insufficient and supplied `IMG_0918.HEIC`. The photo shows a steep barrel while the displayed angle and dotted guide are shallow (15°). This is direct human evidence that the earlier change did not satisfy the direction requirement.
- **Change:** One native launch pose now supplies both the measured muzzle position and actual footprint facing to preview and Fire. Initial velocity points along the physical barrel. Removed native relative calibration, deadband, smoothing, and elevation clamping; the angle readout reports actual signed elevation. Re-detection immediately follows a changed physical pose. Browser and AI preserve their existing limits. Gravity and wind bend the later flight normally.
- **Automated evidence:** `npm test`: 112 passed, 0 failed, 3 inherited catalog skips (115 total). Physics tests cover 13 headings on each side, including shallow, vertical, backward, and downward directions, matching preview/launch motion and power. Native integration inspects all five rendered guide dots and exact age-zero projectile velocity, with a displaced 5° left shot, 30° right shot, and changed 85° pose after pause and a glyph-zero reading. Tracking tests verify immediate direction updates and stable ownership. TypeScript, Vite, native/browser packaging, ZIP integrity, and diff whitespace checks pass.
- **Board evidence:** Build `ddb169a45a95c862` installed and launched on the paired Board, retaining appId/packageId. `docs/screenshots/board-barrel-direction.png` shows native setup recognizing the right Cannon. New-bundle logs show state ready and audio running, with only the existing optional font-metadata/favicon warnings and no application exception.
- **Human evidence:** Subsequently confirmed by the user in the acceptance entry above. No new browser interaction check was performed for this correction; the automated browser boot and unchanged browser/AI physics pass.

## October 27, 2026 — Cannon spout alignment

- **Request:** Make the dotted aiming line come out of the Bloogs Cannon spout.
- **Source evidence:** Native preview and Fire share `shotOrigin()`, now calculated by `frontPoint(pieceFootprint(...), TUNE.ballRadius + 1)`. It uses the real forward outline edge and sensed facing instead of an approximate circle along the calibrated elevation. The 9 px ball has 1 px of edge clearance. Short glyph-zero readings retain the tracker's known Cannon shape. No assets or app identity changed.
- **Automated evidence:** `npm test`: 110 passed, 0 failed, 3 inherited catalog skips. Extended the existing native integration scenario to inspect actual canvas aim dots and age-zero projectile positions against independently measured catalog mouth geometry. Covers rotated/displaced cannons on both sides, pause contact-ID replacement, and a live glyph-zero reading. `npm run build:web`, ZIP integrity, and diff whitespace checks passed.
- **Browser evidence:** Opened the packaged browser build, chose two players, started a match, visually checked the dotted guide, and fired. Browser fallback remains operational; it does not verify the physical spout.
- **Board evidence:** Build `7bf63276d923fc6a` installed and launched on the paired Board. `docs/screenshots/board-spout-alignment.png` confirms the title screen loaded. Logs show platform state ready, no application exception, and the existing optional font-metadata/favicon warnings.
- **Human evidence:** Real-piece alignment during rotation has not yet been visually confirmed on hardware. That check remains open in the checklist.

## October 27, 2026 — first playable

- **Asked for:** Notebook Artillery for Board using board-games-ai and its exact Studio starter, with physical Bloogs Cannon pieces.
- **Approved:** Two-player default plus AI, rotate to aim, touch power and Fire, colorful Bloogs world, no digital cannon in play.
- **appId:** `44a14729-e058-41c3-9812-588229c563e6`
- **packageId:** `fun.board.dev.bloogbarrage.g44a14729`
- **Platform build:** `7160b06a6595b6f7`
- **Piece set:** `save-the-bloogs`; two Cannon pieces share glyph 2 and keep independent identities.
- **Model:** `save-the-bloogs_v1.3.4.dla`; copied SHA256 matches `407af89d2a7c41ba6bdcef3d15134dcb7d04f81d93e63dcafe143b4aac9c63dd`.

### Source evidence

Exact Studio template retained: SDK beta.8 tarball, lockfile, platform layer, footprints, selector, packaging, and original tests.

Rules cover angle, power, wind, terrain collision, tower health, alternating turns, and three-hit victory. Both control paths use the same physics. The short trajectory preview uses the actual native launch origin.

No gameplay cannon sprite exists, including the AI side and missing-piece recovery. Canonical product art appears in setup/help only. The real piece occupies a fixed tower platform; damage keeps that platform stationary until the final collapse.

Native title, setup, help, controls, and result labels face both left and right seats. One shared result decision waits for input. Changing setup waits for a deliberate player choice.

### Automated evidence

`npm test`: 100 passed, 0 failed, 3 skipped. The inherited skips require complete catalogs for other piece sets, including Sports; they are not game-rule skips.

The suite covers trajectory, wind, collision, turns, victory, AI, stationary contacts, duplicate glyphs, move/rotate/lift, tracking gaps, and three pause cycles.

The native integration test drives actual `main.ts`: two roster profiles, two real glyph-2 contacts, rotation, power, Fire, delayed replacement, paused held-finger suppression, fresh input, rematch, and setup remaining open with pieces left down.

AI tests simulate 1,600 shots on both sides across five wind values. Hit rates are about 71–80%. Sixteen AI matches complete within 24 shots. This establishes bounded behavior, not human-perceived fairness.

`npm run build:web`: TypeScript, Vite, native packaging, and static browser packaging pass. The native zip excludes simulator scripts. Both browser adapters leave an existing native bridge untouched.

### Browser evidence

Checked the packaged build at `http://127.0.0.1:4175/`, using Codex's browser UI.

- Title, opponent selection, canonical equipment guidance, and all three help pages render legibly.
- Two-player match: adjusted power, fired, watched damage and alternating turns, reached Player 1 victory, and rematched to three hearts each.
- Solo: selected Pip, dragged to change angle, adjusted power, fired, and observed Pip fire back. Both towers lost health.
- Paused during flight through the simulated system menu and resumed the same shot.
- Changed setup from the menu, canceled the selector, reopened it, and changed from AI to a friend.
- Verified no cannon artwork in play. Tower cracks and final rubble remain visible.
- Preview keeps its 16:9 proportions in a narrow pane. Physical Board uses the full 1920×1080 surface.
- Saved `docs/screenshots/playable.png` and left a fresh two-player match open.

This browser evidence uses simulated input. It does not establish physical sensing, reach, or device frame rate.

### Board and human evidence

- **Board hardware:** NOT TESTED. Package built; no device installation performed.
- **Human playtest:** NOT TESTED. The user chose the design, but has not yet reported gameplay feedback.
- **Audio:** Synthesized effects route through the platform bus. The browser AudioContext runs; subjective mix and real-speaker sound remain unreviewed.

### Self-review

Source and browser gates pass for the core loop, identity, readable browser text, input recovery, and cannon rendering. Native geometry has source and simulated-input evidence only.

The world is consistent from title to play and result. Colliders match terrain and tower facades. UI stays clear of physical cannon footprints at the intended docks.

Remaining questions for a Board playtest:

1. Does turning the cannon relative to its first resting direction feel natural as shot elevation?
2. Can both players reach power and Fire without covering the cannon or flight path?
3. Are the 110-pixel placement tolerance and rotation smoothing comfortable on glass?
4. Is the shared side-view valley readable from the left and right seats?
5. Are the three-hit matches and Pip's misses a good pace for people?

The first playable does not include destructible ground, weapons, online multiplayer, or progression.

## October 27, 2026 — installed on KT's Board

- **Request:** Install the game so the user can try the real Bloogs Cannons.
- **Device:** KT's Board, Board OS 3.0.13. Board Connect reports ready and web-app install/launch support.
- **Authorization:** User requested installation and approved one-time pairing on the device.
- **Installed appId:** `44a14729-e058-41c3-9812-588229c563e6`, preserving the existing identity.
- **Package:** Verified ZIP integrity, matching current dist files, exactly one correct Bloogs model, and no browser simulator scripts.
- **Board evidence:** Board Connect confirmed installation and launch. Hardware screenshot shows the game title and native two-seat layout.
- **Startup logs:** Platform state became ready. Only missing favicon and optional game-font.json warnings appeared; no application exception was reported.
- **Screenshot:** `docs/screenshots/board-installed.png`.
- **Still unverified:** Real Cannon recognition, aiming feel, full hardware match, and human feedback. These await the user's playtest.

## October 27, 2026 — landscape opening screen

- **Request:** Make the opening screen face the landscape, with one Play button instead of duplicated rotated labels.
- **Change:** Board and browser share one upright title, one horizontal Play button, and one horizontal How to Play button. The previous native title layout is superseded by this user decision.
- **Automated evidence:** `npm test`: 100 passed, 0 failed, 3 inherited skips. `npm run build:web` passed TypeScript, Vite, native packaging, and browser packaging.
- **Platform build:** `d19865fdcbeeac66`; appId and packageId preserved.
- **Board evidence:** Reinstalled and launched on KT's Board. Inspected `docs/screenshots/board-title-landscape.png`: one upright title and one horizontal Play button align with the landscape. Startup logs show state ready and no application exception; the existing optional font metadata and favicon warnings remain.
- **Scope:** Opening layout only; physical Cannon controls and match rules are unchanged.

## October 27, 2026 — landscape throughout and start flow

- **Request:** Orient the rest of the game with the landscape, including setup, help, power, and Fire, and ensure the game starts.
- **Change:** One upright layout across every state, with a shared power slider and Fire button. Native hit tests use the same unrotated coordinates. Setup shows chosen player names/count, per-tower cannon readiness, and an explicit Start Game button.
- **Startup fix:** A lone player at the right tower now gets Add Player when choosing an opponent, instead of Replace Player. Start requires two distinct sides and every human's legal cannon; selection and placement alone never start a match. Saved side assignments are restored before cannon binding, and cannon arrival at the title follows the same Continue path as tapping the button.
- **Automated evidence:** `npm test`: 100 passed, 0 failed, 3 inherited skips. Expanded native integration starts with one profile, taps Play, places the first cannon on the right, cancels/retries selection, adds a second player, rejects incomplete Start attempts, then starts and fires from both sides. It also verifies solo startup with the human on the right, Pip firing without a cannon, pause recovery, replacement cannons, rematch, Change setup waiting for input, and a saved in-flight shot resuming via cannon arrival at the title with health, shot counts, and sides preserved.
- **Browser evidence:** Visually checked setup readiness, player selection, explicit Start, horizontal controls, and all three help pages. Dragged power from 70% to 80%, fired, and observed the turn move to Player 2. Saved `docs/screenshots/landscape-controls-browser.png`.
- **Build and deployment:** TypeScript, Vite, native package, and standalone browser build passed. Final platform build `9fc25977bc748079`, same appId/packageId. Installed and launched on KT's Board.
- **Board evidence:** User answered “Yes, the game starts” to the real-cannon startup check. Hardware screenshot `docs/screenshots/board-landscape-play.png` shows the active two-player match, changed aim, tower damage, and horizontal power/Fire controls. After the final save-path update, `docs/screenshots/board-landscape-current.png` verifies upright setup, recognized cannon readiness, and the prompt to choose a second player. Logs show platform state ready, with only the existing optional font metadata/favicon warnings and no application exception.
- **Physical limit:** Startup with real pieces is confirmed. Full-match completion and subjective aiming/reach/pacing feedback remain unverified. The platform scopes run saves to each build, so installing a changed build begins fresh setup.

## October 27, 2026 — wider destructible battlefield

- **Request:** Remove the in-game question mark, zoom out, and add hills and trees because opposing towers were too easy to hit. User chose destructible hills and trees.
- **Changes:** Towers/flags use 58% of their previous scale with centers at x240/x1680. Cannon docks move with them to y678 while retaining real-piece clearance. Three ridges and ten foreground trees stop shots. Pale distant forests establish the wider scale. Help remains in the title and platform menu.
- **Destruction:** Ground hits dig lasting 64px-radius craters. Direct tree hits fell the tree; root excavation can also fell it. Shared ground/tree state drives collision, rendering, and Pip's planning. Terrain persists through turns, pause, and same-build Continue; rematch restores the field. Ground around physical tower platforms remains fixed.
- **Rendering:** Distant scenery is cached once. Terrain/tree foreground is rebuilt only when its identity or revision changes. Craters expose brown soil and remove flowers; felled trees leave stumps, with a short tipping animation for direct hits.
- **Automated evidence:** `npm test`: 107 passed, 0 failed, 3 inherited skips. Coverage includes narrow tower hitboxes, terrain/tree interception, reachable arcs from both sides, persistent craters, shots through felled canopies, 150 craters without healing, changed-terrain AI, native startup and firing at new docks, and terrain retained through pause/Continue and reset by rematch.
- **Difficulty evidence:** On a fixed angle/power grid over both sides and winds -40/0/40, pristine-field hit rates fell from 24–31% to 3.8–6.6%. This is a simulation measure, not a human playtest. Default 45°/70% strikes trees in still air. Pip hit about 59–62% in 1,600 sampled shots; 16 AI matches completed in 5–11 shots.
- **Browser evidence:** Started a two-player match, confirmed no question-mark button, and fired with the wider map. At left-side 60°/20% with wind -20, a shot carved the near hillside and removed an undermined tree; the crater remained after the turn changed. A right-side 20°/70% shot with wind +25 then removed a tree on the opposite ridge. Both changes are visible in `docs/screenshots/destructible-valley-browser.png`.
- **Build/deployment:** TypeScript, Vite, native zip, and browser packaging passed. Final platform build `1794b395662e2608` keeps the existing appId/packageId and was installed/launched on KT's Board.
- **Board evidence:** `docs/screenshots/board-destructible-valley.png` shows the new landscape and native setup recognizing the left Cannon. Platform state became ready; logs contain only the existing optional font metadata/favicon warnings, with no application exception.
- **Remaining physical check:** The user must move Cannons onto the new smaller tower positions. Difficulty and destruction feel on the real Board still need user feedback.

## October 27, 2026 — randomized valleys and passing birds

- **Request:** Different hills and trees each game, plus birds that sometimes get in the way.
- **Terrain:** Seeded per-match hills vary in position, height, width, and optional steep outer shoulders. Nine to thirteen trees vary in placement and size, with taller edge groves on some maps. Fixed physical cannon platforms remain at the same positions. Fresh rematches use new layouts even when requested rapidly; Continue restores exact layout and damage.
- **Birds:** One or two birds begin crossing after 6–11 seconds, with new crossings every 19–24 seconds and clear gaps between them. Flight is above the tree canopy and shares positions/hitboxes with collision. An interception ends the shot, gives chirp/particle feedback, and sends the bird flying upward unharmed. Pip can also be blocked. The saved gameplay clock controls birds and freezes during pause/help.
- **Variation evidence:** Across 30 still-air layouts from the left tower, the former 50°/80% shot hit on 7 and hit trees on 23; 55°/85% hit on 15 and hit trees on 15. Reachable clean arcs were found in all 72 sampled layout/side/wind cases. These are simulation measurements, not a human difficulty assessment.
- **Automated evidence:** `npm test`: 110 passed, 0 failed, 3 inherited skips (113 total). New coverage checks seeded/reproducible geometry, distinct rapid rematches, exact protected platforms, collision-changing layouts, bird motion/crossing gaps/interception/fleeing, JSON persistence, native pause/help clock freezing, native rematch variation, and same-build Continue preserving birds/layout. Pip tests cover 240 shots across varied layouts/winds, 8 complete AI matches, and 16 damaged-layout plans.
- **Natural flight check:** With seed 7919 and ordinary ballistic launches, a left-side 50°/80% shot fired at match time 9.3s hit a passing bird at about (1157,280); a right-side 60°/90% shot fired at 9.7s did so near (1406,270). These diagnostic simulations use normal projectile motion, not a projectile placed directly on a bird.
- **Related fix:** Reopening help from the system menu while already in help now retains the return path to play. The native integration test exercises this path.
- **Browser evidence:** Started two-player play on the final build, inspected upright help, fired a default shot that carved the right shoulder and felled a tree, then rematched into a visibly different valley. Screenshots: `random-valley-first-browser.png`, `random-valley-crater-browser.png`, `random-valley-rematch-browser.png`, and `random-valley-second-rematch-browser.png` in `docs/screenshots/`. Bird flight was inspected visually; interception is verified in automated physics tests.
- **Build/deployment:** TypeScript, Vite, native packaging, browser packaging, ZIP integrity, and diff whitespace checks passed. Platform build `964d37376e7ca8bf`, with permanent appId/packageId preserved, installed and launched on KT’s Board.
- **Hardware evidence:** `docs/screenshots/board-random-valley.png` shows native landscape setup over a randomized battlefield. Logs show platform state ready and the new bundle running. One `onPauseResult` TypeError occurred during replacement of the old running build, before the new bundle started; no new-bundle application exception appeared afterward. Existing optional font metadata/favicon warnings remain.
- **Remaining human check:** Full hardware match, perceived bird frequency, and aiming difficulty on the new randomized terrain still need play feedback.

## October 27, 2026 — public GitHub publication

- **Request:** Commit and push the project to a public GitHub repository.
- **Repository:** `https://github.com/Kevinmthau/Board-notebookartillery`; publication targets `main` and the existing `codex/bloog-barrage` development branch.
- **Source evidence:** Reviewed all 132 reachable Git blobs across the seven existing commits and the vendored SDK archive for common credential/private-key patterns and unintended private data. No such findings; largest tracked file is about 391 KB. This is a targeted review, not a guarantee that every possible secret format is detected.
- **Automated evidence:** `npm test`: 110 passed, 0 failed, 3 inherited catalog skips (113 total). `npm run build:web` passed TypeScript, Vite, native packaging, and standalone browser packaging. Platform build remains `964d37376e7ca8bf`.
- **Publication contents:** Source, project records/screenshots, required SDK tarball, lockfile, and assets. Existing ignore rules exclude installed dependencies, generated build directories, and `.webapp.zip` packages. No asset licences changed.
- **Browser, Board, and human evidence:** No new interactive or hardware playtest was performed for this publication. The earlier gameplay evidence and remaining full-match playtest item still apply.
