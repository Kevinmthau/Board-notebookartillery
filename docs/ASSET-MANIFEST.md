# Asset manifest: Bloog Barrage

| File or source | Role | Origin | Rights / usage |
|---|---|---|---|
| `src/world.ts` | Cached wide landscape, smaller stone towers/flags, distant forests, solid obstacle trees, animated birds, craters, damage and collapse | Original Canvas artwork authored for this project; solid shapes share `src/artillery.ts` geometry | Project source |
| `src/main.ts` | Hearts, centered angle/power controls, Fire below the active tower, projectile, trail, teaching UI, synthesized sound effects | Original project code; sounds use platform-managed Web Audio effects bus | Project source |
| `src/fx.ts` | Finite placement splashes and impact particles | Supplied Board Studio starter | Board starter asset |
| `public/piece-art/2.png` | Canonical Cannon identification in help only | board-games-ai `save-the-bloogs` catalog | Board-supplied product art; internal prototype use |
| `public/piece-art/1.png` | Ring reference, unused by gameplay | Same catalog | Board-supplied product art |
| `public/piece-art/3.png` | Stairs reference, unused by gameplay | Same catalog | Board-supplied product art |
| `public/piece-art/4.png` | Block reference, unused by gameplay | Same catalog | Board-supplied product art |
| `public/fonts/itc-kabel-ultra.otf` | All game text via starter font helpers | Exact Studio starter | Board's bundled font |
| `public/piece-footprints.json` | Real outlines, facing correction, cannon clearance, and shared spout position/barrel direction for native aim and launch | Save the Bloogs catalog | Board-supplied data |
| `public/model.dla` | Save the Bloogs recognition model 1.3.4 | Save the Bloogs catalog | Board-supplied device model |

No Notebook Artillery artwork or audio is copied. No generated cannon or cannon gameplay sprite is included.

The native package omits the browser simulator. The standalone web build adds the supplied Studio simulator and this project's player-selector adapter.
