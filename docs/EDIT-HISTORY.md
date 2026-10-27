# Edit history

## October 27, 2026 — Fire layout accepted; commit and push

User confirmed: “That works. Commit and push the change.” Recorded acceptance of the Fire-button placement and prepared the validated implementation, integration inputs, project records, and screenshots for publication to the existing repository.

## October 27, 2026 — Fire below the active Cannon

User requested: “move the fire button under the cannon that is shooting.” Fire is now centered below the active tower and switches sides when the turn changes. Angle and power controls occupy the center of the footer, keeping Fire clear on either side. Drawing and touch handling share their control bounds; targets remain at least 120 px and the footer, including button shadows, stays 48 px inside the glass. Updated existing native integration inputs for the relocated controls. No new assets.

## October 27, 2026 — Alignment accepted; commit and push

User confirmed the installed fix works: “That works now. commit and push the fix.” Recorded human acceptance of physical spout alignment and prepared the source, regression tests, project records, and Board screenshots for publication to the existing repository.

## October 27, 2026 — Straight out of the barrel

User rejected the previous origin-only change: “Not fixed. the aiming line needs to come straight out of the spout,” with `IMG_0918.HEIC` showing a steeply pointed barrel beside a 15° guide. The previous fix moved the starting point but retained relative angle calibration, so it did not satisfy the request.

Native aim now uses one physical footprint pose for both the muzzle position and initial velocity. Removed the initial 45° calibration, angular deadband, smoothing lag, and native elevation clamp. The displayed angle follows the actual barrel direction, including immediately after pause re-detection. Preview and Fire share the same launch pose; gravity and wind still bend the later path. Browser/AI keep their existing elevation controls. No new gameplay assets.

## October 27, 2026 — Cannon spout alignment

User requested that the dotted aiming line come out of the Bloogs Cannon spout. Replaced the generic radius offset along gameplay elevation with the actual footprint's front edge along the sensed physical facing. Preview and fired ball share this origin, with 10 px of clearance for the 9 px ball. The known Cannon glyph keeps this geometry available during short glyph-zero readings. Relative elevation calibration and browser/AI launch behavior stay unchanged. No new assets.

## October 27, 2026 — first playable

User asked for Notebook Artillery mechanics on Board using the exact board-games-ai Studio starter and Bloogs Cannon pieces.

Confirmed choices: two-player default plus solo against AI; rotate physical Cannon to aim; touch power and Fire; colorful Bloogs world.

User corrected the equipment representation: “make the cannons the piece. I dont want to see a digital cannon.” Gameplay contains no cannon artwork. Setup/help identify the real equipment.

User approved the concrete design: “Yes, build it.”

Built local browser and native packages. No external service publication, repository push, or Board installation was performed.

## October 27, 2026 — Board installation

Installed and launched the existing native package on KT's Board after the user approved pairing. Verified the native title screen and startup logs. No gameplay code or app identity changed.

## October 27, 2026 — landscape title

User requested one Play button oriented with the landscape after seeing the rotated native opening screen. Replaced the duplicated seat-facing title and button labels with one shared upright title, one horizontal Play button, and one horizontal How to Play button. The Board and browser now share the same opening layout. App identity and physical Cannon gameplay remain unchanged.

## October 27, 2026 — landscape throughout and reliable starting

User requested landscape setup, help, power/Fire controls, and a working start flow. All UI now faces the landscape, including results, player names, health, and wind. Touch hit tests use the same unrotated positions. Setup shows roster and cannon readiness with an explicit Start Game button.

Fixed choosing an opponent when the lone human owns the right tower: the selector now adds the second player instead of replacing the first. Canceled selection can be retried. Two human cannons or one human cannon plus Pip must be ready before Start. Saved side assignments are restored before binding physical cannons, and both title taps and cannon arrivals use the same saved-aware entry path. Expanded the native integration test through these startup paths and landscape firing, pause recovery, and rematch.

## October 27, 2026 — wider valley and obstacles

User requested removal of the in-game question mark and said opposing towers were too easy to hit: “zoom way out and put more hills and trees in the way as obstacles.” Removed the button and its hit target; help remains in the title and system menu. Reduced tower/landmark scale, widened tower spacing, and added three hills and ten solid foreground trees sharing collision geometry with the rendering. Updated real Cannon dock positions, shorter launch preview, obstacle feedback, shot tuning, and Pip's planning for the new battlefield.

User then chose “Destructible hills and trees.” Ground impacts now carve persistent craters, tree impacts knock trees down, and blasts can undermine tree roots. Rendering, collision, and AI planning use the changed terrain; rematch restores the field. Physical tower platform ground remains fixed.

## October 27, 2026 — new valleys and passing birds

User requested different hills and trees each game to make repeated shots less reliable, plus birds that sometimes get in the way. New matches generate seeded terrain geometry and tree placement/sizes; saved games retain their exact layout and destruction. Physical cannon platforms stay fixed. Occasional small groups of birds cross the battlefield, can block a shot from either player or Pip, and fly away after contact. Their timing is part of the saved match and pauses with play. Help and impact feedback explain the new obstacles.

Also fixed reopening system-menu help while already in help, which previously overwrote its return destination and could trap the user in the help screen.

## October 27, 2026 — public GitHub publication

User requested: “commit and push to a public github directory.” Prepared publication of the existing project and its complete Git history at `https://github.com/Kevinmthau/Board-notebookartillery`, with `main` as the public default branch and `codex/bloog-barrage` retained for development. Updated the README to describe randomized valleys and passing birds. The vendored SDK, lockfile, assets, and permanent app identity remain intact; no asset licences changed.
