import { groundY, TREES, TUNE, type Match, type Side } from './artillery';

// Sky and distant scenery are baked once; the terrain layer is rebaked only after
// a blast changes it. Cannon graphics deliberately do not exist here.
type Ctx = CanvasRenderingContext2D;
type Surface = HTMLCanvasElement;
const W = 1920, H = 1080;
const C = {
  sky: '#BCEEF0', skyBottom: '#F2F9DA', ink: '#254F5B', mint: '#52BBA5', turquoise: '#158B8E',
  pale: '#FFF9DE', gold: '#F3CB67', coral: '#EB7C72', coralDark: '#BB5361',
  grass: '#8ACB75', grassLight: '#B5DB77', grassDark: '#50AA7D',
  stone: '#F0E6CB', stoneLight: '#FFF4D9', stoneShade: '#B6C7AD', stoneLine: '#9DB5A2',
};
const TAU = Math.PI * 2;
function surface(width: number, height: number, paint: (c: Ctx) => void): Surface {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const c = canvas.getContext('2d')!; paint(c); return canvas;
}
function ellipse(c: Ctx, x: number, y: number, rx: number, ry: number, fill: string, angle = 0) {
  c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, angle, 0, TAU); c.fill();
}
function circle(c: Ctx, x: number, y: number, r: number, fill: string) { ellipse(c, x, y, r, r, fill); }
function round(c: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  c.fillStyle = fill; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill();
}
function line(c: Ctx, points: number[], color: string, width: number) {
  c.beginPath(); c.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]);
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function hill(c: Ctx, points: number[], color: string) {
  c.fillStyle = color; c.beginPath(); c.moveTo(0, H);
  c.lineTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 6) c.bezierCurveTo(points[i], points[i + 1], points[i + 2], points[i + 3], points[i + 4], points[i + 5]);
  c.lineTo(W, H); c.closePath(); c.fill();
}
function littleTree(c: Ctx, x: number, y: number, scale: number, tone = 0) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  const dark = tone ? '#489C90' : '#348C79', light = tone ? '#9CCC92' : '#81C779';
  ellipse(c, 5, 4, 50, 10, '#4A9D7936');
  line(c, [0, 0, -3, -48, -22, -81], '#74865D', 12);
  line(c, [-2, -45, 27, -77], '#74865D', 8);
  ellipse(c, -24, -91, 35, 43, dark, -.25);
  ellipse(c, 17, -104, 39, 50, dark, .22);
  ellipse(c, -24, -99, 31, 37, light, -.25);
  ellipse(c, 15, -114, 35, 42, light, .2);
  ellipse(c, 0, -141, 11, 6, '#D1E8A3', -.4);
  circle(c, -38, -98, 5, '#F9E4A4'); circle(c, 21, -91, 5, '#F9E4A4');
  c.restore();
}
function bush(c: Ctx, x: number, y: number, scale = 1, light = false) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  const shade = light ? '#6BBE84' : '#379A81', top = light ? '#B4D982' : '#78C78A';
  ellipse(c, 0, 4, 60, 13, '#2A8F7445');
  ellipse(c, -35, -10, 29, 23, shade); ellipse(c, 2, -21, 41, 36, shade); ellipse(c, 36, -9, 25, 24, shade);
  ellipse(c, -34, -18, 26, 17, top); ellipse(c, 0, -34, 34, 25, top); ellipse(c, 36, -17, 22, 16, top);
  line(c, [-17, -34, -7, -39], '#C6E89F', 5); line(c, [22, -24, 28, -27], '#C6E89F', 4);
  c.restore();
}
function flower(c: Ctx, x: number, y: number, s: number, tint: string) {
  line(c, [x, y + s * 2.5, x, y], '#66A670', s * .38);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU - Math.PI / 2;
    ellipse(c, x + Math.cos(a) * s, y + Math.sin(a) * s, s * .7, s * .9, tint, a);
  }
  circle(c, x, y, s * .65, '#F7CA64');
}
function terrainPath(c: Ctx, terrain: Match['terrain'], dy = 0) {
  c.beginPath(); c.moveTo(0, H + 5);
  for (let x = 0; x <= W; x += 4) c.lineTo(x, groundY(x, terrain) + dy);
  c.lineTo(W, H + 5); c.closePath();
}
function obstacleTree(c: Ctx, tree: (typeof TREES)[number], index: number) {
  // Every visible trunk and crown uses the same geometry that stops a shot.
  const top = Math.min(...tree.crown.map(p => p.y));
  ellipse(c, tree.x + 4, tree.baseY + 3, 32, 7, '#3F86552B');
  c.fillStyle = '#7B8260';
  c.fillRect(tree.x - tree.trunkWidth / 2, top, tree.trunkWidth, tree.baseY - top);
  c.fillStyle = '#A0A174';
  c.fillRect(tree.x - tree.trunkWidth / 2 + 2, top, tree.trunkWidth * .25, tree.baseY - top);
  const shades = ['#348D72', '#278F7B', '#3B9368'];
  const lights = ['#8BC66E', '#73C58A', '#A3CE75'];
  for (const crown of tree.crown) {
    ellipse(c, crown.x, crown.y, crown.rx, crown.ry, shades[index % shades.length]);
    ellipse(c, crown.x - crown.rx * .09, crown.y - crown.ry * .16,
      crown.rx * .85, crown.ry * .78, lights[index % lights.length]);
    ellipse(c, crown.x - crown.rx * .28, crown.y - crown.ry * .55,
      crown.rx * .19, crown.ry * .09, '#D5E69A', -.3);
    circle(c, crown.x + crown.rx * .35, crown.y + crown.ry * .18, 3, '#F7DE91');
  }
}
function makeBackdrop(): Surface {
  return surface(W, H, c => {
    const sky = c.createLinearGradient(0, 0, 0, 900);
    sky.addColorStop(0, '#A6E1E8'); sky.addColorStop(.55, '#D2F0E5'); sky.addColorStop(1, '#F4F4CF');
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    // Smaller landmarks and many ridgelines give the duel a much wider scale.
    circle(c, 1610, 272, 59, '#FFF3B6'); circle(c, 1610, 272, 45, '#FFED9B');
    ellipse(c, 1599, 260, 28, 23, '#FFF3B5');
    hill(c, [0, 585, 140, 492, 210, 550, 345, 577, 490, 605, 530, 420, 685, 460,
      815, 495, 884, 395, 1035, 464, 1180, 535, 1260, 410, 1415, 473, 1550, 532, 1730, 440, 1920, 538], '#B5DCC9');
    // Distant woodland is deliberately pale and small; solid foreground trees are darker.
    for (let i = 0; i < 43; i++) {
      const x = i * 47 + 9, y = 590 + Math.sin(i * .79) * 37;
      if (TUNE.towerX.some(towerX => Math.abs(towerX - x) < 140)) continue;
      littleTree(c, x, y, .17 + (i % 4) * .035, 1);
    }
    hill(c, [0, 695, 155, 575, 270, 670, 430, 630, 565, 597, 650, 540, 790, 603,
      960, 680, 1060, 555, 1220, 628, 1430, 718, 1600, 530, 1920, 664], '#94CDB1');
    for (let i = 0; i < 25; i++) {
      const x = 35 + i * 78, y = 735 + Math.sin(i * 1.31) * 28;
      if (TUNE.towerX.some(towerX => Math.abs(towerX - x) < 140)) continue;
      littleTree(c, x, y, .24 + (i % 3) * .045, 1);
    }
    hill(c, [0, 811, 150, 723, 300, 776, 480, 735, 610, 705, 760, 689, 930, 749,
      1100, 818, 1300, 671, 1500, 756, 1650, 815, 1780, 713, 1920, 782], '#70B995');
    // One tiny ruined arch adds a distant landmark without competing with the targets.
    c.save(); c.translate(1460, 790); c.scale(.55, .55);
    c.fillStyle = '#ABD1AF'; c.beginPath(); c.moveTo(-38, 0); c.lineTo(-38, -29); c.quadraticCurveTo(0, -74, 38, -29); c.lineTo(38, 0); c.fill();
    c.fillStyle = '#70B995'; c.beginPath(); c.moveTo(-15, 0); c.lineTo(-15, -21); c.quadraticCurveTo(0, -47, 15, -21); c.lineTo(15, 0); c.fill();
    c.restore();

  });
}
function makeForeground(terrain: Match['terrain']): Surface {
  return surface(W, H, c => {
    const height = (x: number) => groundY(x, terrain);
    // This ridge edge is the collision profile, never a separate painted approximation.
    const earth = c.createLinearGradient(0, 430, 0, H);
    earth.addColorStop(0, '#B9D877'); earth.addColorStop(.55, '#9BC875'); earth.addColorStop(1, '#91BF76');
    terrainPath(c, terrain); c.fillStyle = earth; c.fill();
    terrainPath(c, terrain, 14); c.fillStyle = '#9BC776'; c.fill();
    for (const [offset, width, color] of [[5, 10, '#D0E593'], [18, 3, '#78B57A']] as const) {
      c.beginPath();
      for (let x = 0; x <= W; x += 4) { if (!x) c.moveTo(x, height(x) + offset); else c.lineTo(x, height(x) + offset); }
      c.strokeStyle = color; c.lineWidth = width; c.stroke();
    }
    // Warm exposed soil makes each persistent crater read as removed earth.
    // The open edge itself still follows the exact current collision height.
    for (const [offset, width, color] of [[10, 19, '#BCA16C'], [3, 4, '#9C875D']] as const) {
      let drawing = false;
      c.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const changed = height(x) > groundY(x) + 3;
        if (changed) {
          if (!drawing) c.moveTo(x, height(x) + offset); else c.lineTo(x, height(x) + offset);
        }
        drawing = changed;
      }
      c.strokeStyle = color; c.lineWidth = width; c.stroke();
    }
    // Shallow contours on the hills stay entirely under the colliding skyline.
    for (const [begin, finish, depth] of [[420, 810, 73], [770, 1190, 102], [1180, 1540, 70]]) {
      c.beginPath();
      for (let x = begin; x <= finish; x += 5) {
        const y = height(x) + depth + Math.sin((x - begin) / (finish - begin) * Math.PI) * 16;
        if (x === begin) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.strokeStyle = '#88BC7459'; c.lineWidth = 5; c.stroke();
    }
    // Flowers and pebbles shrink with the world; they never pretend to block a shot.
    for (let i = 0; i < 31; i++) {
      const x = 32 + i * 62, y = height(x) + 29 + (i % 4) * 14;
      if (height(x) > groundY(x) + 3) continue;
      flower(c, x, y, 2.3 + (i % 3) * .6, i % 3 ? '#FFF4CB' : '#F2AAA0');
    }
    for (let i = 0; i < 44; i++) {
      const x = (i * 173 + 83) % W, y = height(x) + 37 + (i * 19 % 118);
      ellipse(c, x, y, 3 + i % 4, 2 + i % 2, i % 2 ? '#C5DE9B' : '#83B977', -.2);
    }
    bush(c, 63, height(63) + 19, .38); bush(c, 391, height(391) + 20, .28, true);
    bush(c, 1530, height(1530) + 18, .3, true); bush(c, 1855, height(1855) + 20, .4);
    TREES.forEach((tree, index) => {
      if (!terrain.fallenTrees.includes(index)) { obstacleTree(c, tree, index); return; }
      const y = height(tree.x);
      // Low broken stumps are aftermath, no longer tall obstacles.
      round(c, tree.x - 9, y - 5, 18, 10, 2, '#8D805B');
      ellipse(c, tree.x, y - 5, 9, 3, '#D3B87B');
      line(c, [tree.x - 23, height(tree.x - 23) + 9, tree.x - 13, height(tree.x - 13) + 6], '#9B8D5F', 4);
      line(c, [tree.x + 15, height(tree.x + 15) + 7, tree.x + 25, height(tree.x + 25) + 13], '#9B8D5F', 3);
    });
  });
}
function makeCloud(): Surface {
  return surface(400, 150, c => {
    // Cloud faces are rendered once with their rounded, slightly asymmetric lobes.
    ellipse(c, 192, 121, 164, 21, '#8FCBC433');
    const puffs: [number, number, number, number][] = [[59, 96, 47, 31], [104, 68, 51, 46], [168, 57, 65, 55], [229, 82, 61, 39], [286, 97, 52, 26]];
    for (const [x, y, rx, ry] of puffs) ellipse(c, x, y + 5, rx, ry, '#DDF0E7');
    for (const [x, y, rx, ry] of puffs) ellipse(c, x, y - 5, rx, ry, '#FCFBE7');
    ellipse(c, 126, 44, 27, 13, '#FFFFF5', -.25);
  });
}
function shield(c: Ctx, x: number, y: number, color: string, light: string, side: Side) {
  c.save(); c.translate(x, y);
  c.fillStyle = '#72988A'; c.beginPath(); c.moveTo(-36, -32); c.lineTo(36, -32); c.lineTo(32, 14); c.quadraticCurveTo(23, 38, 0, 48); c.quadraticCurveTo(-23, 38, -32, 14); c.closePath(); c.fill();
  c.fillStyle = color; c.beginPath(); c.moveTo(-31, -30); c.lineTo(31, -30); c.lineTo(27, 10); c.quadraticCurveTo(19, 31, 0, 41); c.quadraticCurveTo(-19, 31, -27, 10); c.closePath(); c.fill();
  c.fillStyle = light; c.beginPath(); c.moveTo(-27, -26); c.lineTo(-5, -26); c.lineTo(-5, 33); c.quadraticCurveTo(-23, 22, -24, 6); c.closePath(); c.fill();
  if (side === 0) {
    // A leaf and a star identify the teams by shape as well as color.
    c.fillStyle = '#FFF4D3'; c.beginPath(); c.moveTo(-4, 20); c.bezierCurveTo(-28, -4, -5, -17, 16, -15); c.bezierCurveTo(16, 7, 7, 17, -4, 20); c.fill();
    line(c, [-12, 28, 6, -4], color, 3);
  } else {
    c.fillStyle = '#FFF2D0'; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 10 : 23; const x = Math.cos(a) * r, y = Math.sin(a) * r + 3; if (!i) c.moveTo(x, y); else c.lineTo(x, y); }
    c.closePath(); c.fill();
  }
  c.restore();
}
function makeTower(side: Side, health: number): Surface {
  return surface(350, 320, c => {
    const x = 175, roof = 20, bottom = 240;
    const team = side === 0 ? C.turquoise : C.coralDark;
    const light = side === 0 ? '#60C7B4' : '#F4A18A';
    ellipse(c, x + 9, bottom + 17, 124, 18, '#2D806D36');
    if (health === 0) {
      // The piece remains physical: rubble never contains a digital cannon.
      for (let i = 0; i < 10; i++) {
        c.save(); c.translate(x - 95 + (i * 31 % 190), bottom - 5 - Math.floor(i / 4) * 22); c.rotate((i % 3 - 1) * .27);
        round(c, -28, -17, 57, 30, 6, i % 2 ? C.stone : C.stoneShade);
        line(c, [-20, -13, 22, -13], C.stoneLight, 4); c.restore();
      }
      line(c, [x - 70, bottom - 18, x + 68, bottom - 45], '#7B9B85', 7);
      c.save(); c.translate(x + 16, bottom - 43); c.rotate(-.2);
      c.fillStyle = light; c.beginPath(); c.moveTo(0, 0); c.lineTo(48, 3); c.lineTo(35, 21); c.lineTo(1, 18); c.closePath(); c.fill(); c.restore();
      return;
    }
    // Rounded polygon stone wall, precisely inside its collision width.
    round(c, x - 99, roof + 12, 198, bottom - roof - 12, 13, C.stoneShade);
    round(c, x - 99, roof + 12, 172, bottom - roof - 12, 13, C.stone);
    c.fillStyle = '#E3DEC0'; c.fillRect(x - 98, roof + 57, 170, 6); c.fillRect(x - 98, roof + 119, 170, 6); c.fillRect(x - 98, roof + 181, 170, 6);
    // Masonry seams are deliberately sparse and large enough to read across the table.
    for (const [sx, sy, ey] of [[-42, 38, 76], [38, 38, 76], [-7, 84, 135], [-64, 146, 196], [39, 146, 196], [-20, 208, 233]])
      line(c, [x + sx, sy, x + sx - 2, ey], '#C5C8AD', 4);
    line(c, [x + 74, roof + 25, x + 74, bottom - 5], '#93B09C', 4);
    // Tiny inset window, not a cannon opening. Vertical slit tucked low in the facade.
    round(c, x - 71, roof + 88, 23, 44, 12, '#B4C5AC');
    round(c, x - 67, roof + 92, 15, 36, 8, '#668E81');
    // Warm overhanging stones at the base and top frame the empty physical platform.
    round(c, x - 111, bottom - 18, 221, 27, 7, '#BCC6A9');
    round(c, x - 112, bottom - 20, 199, 14, 5, '#F0E6C8');
    round(c, x - 111, roof, 222, 31, 8, '#A4BDA7');
    round(c, x - 111, roof - 5, 222, 18, 8, '#FFF3D5');
    round(c, x - 104, roof + 7, 208, 7, 3, '#D8D9B6');
    // A team ribbon hangs on the facade, well below the physical cannon footprint.
    c.fillStyle = light; c.beginPath(); c.moveTo(x - 31, roof + 38); c.lineTo(x + 37, roof + 38); c.lineTo(x + 37, roof + 161); c.lineTo(x + 4, roof + 144); c.lineTo(x - 31, roof + 162); c.closePath(); c.fill();
    c.fillStyle = team; c.fillRect(x - 31, roof + 38, 10, 112);
    shield(c, x + 3, roof + 101, team, light, side);
    circle(c, x - 23, roof + 43, 4, '#FFE8B2'); circle(c, x + 29, roof + 43, 4, '#FFE8B2');
    // Cracks add damage without lowering or displacing the platform.
    if (health <= 2) {
      line(c, [x + 91, roof + 36, x + 67, roof + 62, x + 78, roof + 83, x + 60, roof + 110], '#738E7F', 6);
      line(c, [x + 68, roof + 63, x + 47, roof + 64], '#738E7F', 4);
      ellipse(c, x + 85, bottom - 4, 18, 10, '#A6B99B', -.45);
    }
    if (health <= 1) {
      line(c, [x - 93, roof + 141, x - 69, roof + 159, x - 78, roof + 180, x - 51, roof + 209], '#738E7F', 6);
      line(c, [x - 69, roof + 159, x - 45, roof + 153], '#738E7F', 4);
      ellipse(c, x - 96, bottom + 4, 19, 12, '#B6C6AA', -.4);
      ellipse(c, x + 94, bottom + 6, 15, 10, '#E4DFC0', .3);
    }
  });
}
function flag(c: Ctx, side: Side, now: number, active: boolean) {
  c.save(); c.translate(TUNE.towerX[side], TUNE.roofY); c.scale(TUNE.towerScale, TUNE.towerScale);
  const x = side === 0 ? -132 : 132, y = 40;
  const d = side === 0 ? -1 : 1, wave = Math.sin(now / 370 + side) * 5;
  line(c, [x, y - 16, x, y + 130], '#6A9A84', 6);
  circle(c, x, y - 19, 7, '#F5D782');
  c.fillStyle = side === 0 ? '#2CA798' : '#EF897B';
  c.beginPath(); c.moveTo(x, y - 8);
  c.bezierCurveTo(x + d * 25, y - 14, x + d * 55, y + wave, x + d * 70, y - 6 + wave);
  c.lineTo(x + d * 54, y + 16 + wave); c.lineTo(x + d * 69, y + 39 + wave);
  c.bezierCurveTo(x + d * 44, y + 49 + wave, x + d * 22, y + 30, x, y + 38); c.closePath(); c.fill();
  c.strokeStyle = side === 0 ? '#188B87' : '#D6696A'; c.lineWidth = 3; c.stroke();
  if (active) {
    const a = .45 + Math.sin(now / 250) * .15;
    c.save(); c.globalAlpha = a;
    circle(c, x + d * 31, y + 14, 9, '#FFF6CB'); c.restore();
  }
  c.restore();
}

export function createWorld(): { draw(ctx: Ctx, now: number, match: Match, options?: { title?: boolean }): void } {
  const backdrop = makeBackdrop(), cloud = makeCloud();
  let foreground: Surface | undefined, cachedTerrain: Match['terrain'] | undefined, cachedRevision = -1;
  const towers = ([0, 1] as const).map(side => [0, 1, 2, 3].map(health => makeTower(side, health)));
  const cloudPositions = [
    { x: 40, y: 245, s: .35, speed: 3.5 }, { x: 385, y: 220, s: .32, speed: 2.1 },
    { x: 1090, y: 240, s: .36, speed: 2.8 }, { x: 1745, y: 326, s: .31, speed: 3.2 },
    { x: 710, y: 285, s: .25, speed: 1.8 },
  ];
  return {
    draw(ctx, now, match, options = {}) {
      ctx.drawImage(backdrop, 0, 0);
      for (const p of cloudPositions) {
        const dx = Math.sin(now / (70000 / p.speed)) * 40;
        ctx.drawImage(cloud, p.x + dx, p.y, 400 * p.s, 150 * p.s);
      }
      if (!foreground || cachedTerrain !== match.terrain || cachedRevision !== match.terrain.revision) {
        foreground = makeForeground(match.terrain);
        cachedTerrain = match.terrain; cachedRevision = match.terrain.revision;
      }
      ctx.drawImage(foreground, 0, 0);
      if (match.phase === 'settle' && match.impact?.kind === 'tree' && match.impact.treeIndex !== undefined) {
        const tree = TREES[match.impact.treeIndex];
        const progress = Math.min(1, Math.max(0, (TUNE.settle - match.delay) / .7));
        if (tree && progress < 1) {
          ctx.save(); ctx.translate(tree.x, tree.baseY);
          ctx.rotate((match.turn === 0 ? 1 : -1) * progress * progress * 1.25);
          ctx.translate(-tree.x, -tree.baseY); ctx.globalAlpha = 1 - progress;
          obstacleTree(ctx, tree, match.impact.treeIndex); ctx.restore();
        }
      }
      for (const side of [0, 1] as const) {
        const hp = Math.max(0, Math.min(3, match.health[side]));
        const hit = match.impact?.target === side && match.phase === 'settle';
        const shake = hit && hp > 0 ? Math.sin((TUNE.settle - match.delay) * 70) * Math.max(0, match.delay - .7) * 9 : 0;
        const scale = TUNE.towerScale;
        ctx.drawImage(towers[side][hp], TUNE.towerX[side] - 175 * scale + shake, TUNE.roofY - 20 * scale, 350 * scale, 320 * scale);
        if (hp === 0 && hit) {
          // The last hit earns a quick physical-feeling crumble before the result.
          // One cached damaged tower sinks and tips into its already-drawn rubble.
          const progress = Math.min(1, Math.max(0, (TUNE.settle - match.delay) / .8));
          const fall = progress * progress;
          ctx.save(); ctx.translate(TUNE.towerX[side], TUNE.baseY);
          ctx.rotate((side === 0 ? -1 : 1) * fall * .28);
          ctx.scale(scale * (1 + fall * .06), scale * (1 - fall * .85)); ctx.globalAlpha = 1 - progress;
          ctx.drawImage(towers[side][1], -175, (TUNE.roofY - TUNE.baseY) / scale - 20);
          ctx.restore();
        }
        if (hp > 0) flag(ctx, side, now, !options.title && match.turn === side && match.phase === 'aim');
      }
    },
  };
}
