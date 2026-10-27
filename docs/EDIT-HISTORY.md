# Edit history

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
