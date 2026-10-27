# Acceptance ledger: Bloog Barrage

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
