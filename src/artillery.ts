export type Side = 0 | 1;
export type Point = { x: number; y: number };
export const TUNE = { gravity: 440, minAngle: 15, maxAngle: 80, minPower: 20, maxPower: 100,
  towerX: [240, 1680], roofY: 718, baseY: 846, towerHalf: 58, towerScale: .58, cannonY: 678,
  ballRadius: 9, blastRadius: 64, health: 3, step: 1 / 120, settle: 1.1 } as const;
export type Projectile = Point & { vx: number; vy: number; age: number; trail: Point[] };
export type Terrain = { craters: (Point & { radius: number })[]; fallenTrees: number[]; revision: number };
export type Impact = Point & { kind: 'hit' | 'ground' | 'tree' | 'miss'; target: Side | null; treeIndex?: number; serial: number };
export type Match = { phase: 'aim' | 'flight' | 'settle' | 'over'; turn: Side; health: [number, number];
  shots: [number, number]; angle: [number, number]; power: [number, number]; wind: number; seed: number;
  projectile: Projectile | null; impact: Impact | null; winner: Side | null; delay: number; serial: number; terrain: Terrain };
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const other = (side: Side): Side => side === 0 ? 1 : 0;
export function random(state: { seed: number }) { state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0; return state.seed / 4294967296; }
export function createMatch(seed = Date.now()): Match {
  const m: Match = { phase: 'aim', turn: 0, health: [3, 3], shots: [0, 0], angle: [45, 45], power: [70, 70],
    wind: 0, seed: seed >>> 0, projectile: null, impact: null, winner: null, delay: 0, serial: 0,
    terrain: { craters: [], fallenTrees: [], revision: 0 } };
  m.wind = Math.round((random(m) - .5) * 80); return m;
}
// One geometry source drives the rendered foreground and projectile collisions.
export const RIDGES = [
  { x: 650, height: 230, width: 140 },
  { x: 970, height: 330, width: 165 },
  { x: 1290, height: 250, width: 145 },
] as const;
const protectedGround = (x: number) => TUNE.towerX.some(towerX => Math.abs(x - towerX) <= 160);
export function groundY(x: number, terrain?: Terrain) {
  let y = 856 - RIDGES.reduce((height, ridge) => height + ridge.height * Math.exp(-Math.pow((x - ridge.x) / ridge.width, 2)), 0);
  // A real Cannon's platform must stay put even as the valley is excavated.
  if(!terrain || protectedGround(x))return y;
  for(const crater of terrain.craters) {
    const dx = x-crater.x;
    if(Math.abs(dx)<crater.radius)y=Math.max(y,crater.y+Math.sqrt(crater.radius*crater.radius-dx*dx));
  }
  return y;
}
export type ObstacleTree = { x: number; baseY: number; trunkWidth: number; crown: readonly { x: number; y: number; rx: number; ry: number }[] };
export const TREES: readonly ObstacleTree[] = [
  [535, 90, 32], [610, 110, 36], [705, 95, 31], [805, 82, 29], [900, 110, 36],
  [1005, 100, 34], [1100, 85, 29], [1200, 108, 35], [1305, 112, 37], [1400, 92, 31],
].map(([x, height, width]) => {
  const baseY = groundY(x);
  return { x, baseY, trunkWidth: 12, crown: [
    { x: x - width * .36, y: baseY - height * .62, rx: width * .73, ry: height * .32 },
    { x: x + width * .28, y: baseY - height * .72, rx: width * .76, ry: height * .32 },
  ] };
});
const TREE_COLLIDERS = TREES.map(tree => ({ ...tree,
  top: Math.min(...tree.crown.map(c => c.y - c.ry)),
  trunkTop: Math.min(...tree.crown.map(c => c.y)),
  left: Math.min(tree.x - tree.trunkWidth / 2, ...tree.crown.map(c => c.x - c.rx)),
  right: Math.max(tree.x + tree.trunkWidth / 2, ...tree.crown.map(c => c.x + c.rx)),
}));
export function launchPoint(side: Side, angle: number): Point {
  const a = angle * Math.PI / 180, d = side === 0 ? 1 : -1;
  return { x: TUNE.towerX[side] + Math.cos(a) * 112 * d, y: TUNE.cannonY - Math.sin(a) * 112 };
}
export function makeProjectile(side: Side, angle: number, power: number, origin?: Point): Projectile {
  const a = angle * Math.PI / 180, speed = 250 + power * 6.2;
  return { ...(origin ?? launchPoint(side, angle)), vx: Math.cos(a) * speed * (side === 0 ? 1 : -1),
    vy: -Math.sin(a) * speed, age: 0, trail: [] };
}
export function beginShot(m: Match, angle = m.angle[m.turn], power = m.power[m.turn], origin?: Point): boolean {
  if (m.phase !== 'aim' || m.winner !== null || !Number.isFinite(angle) || !Number.isFinite(power)) return false;
  m.angle[m.turn] = clamp(angle, TUNE.minAngle, TUNE.maxAngle);
  m.power[m.turn] = clamp(power, TUNE.minPower, TUNE.maxPower);
  m.projectile = makeProjectile(m.turn, m.angle[m.turn], m.power[m.turn], origin);
  m.shots[m.turn]++; m.phase = 'flight'; m.impact = null; return true;
}
export function stepBall(p: Projectile, wind: number, dt: number) {
  p.x += p.vx * dt + wind * dt * dt / 2;
  p.y += p.vy * dt + TUNE.gravity * dt * dt / 2;
  p.vx += wind * dt; p.vy += TUNE.gravity * dt; p.age += dt;
}
export function collision(p: Projectile, terrain?: Terrain): Omit<Impact, 'serial'> | null {
  for (const side of [0, 1] as const) {
    if (p.age > .13 && Math.abs(p.x - TUNE.towerX[side]) <= TUNE.towerHalf + TUNE.ballRadius && p.y >= TUNE.roofY - TUNE.ballRadius && p.y <= TUNE.baseY)
      return { x: p.x, y: p.y, kind: 'hit', target: side };
  }
  if (p.x < -100 || p.x > 2020 || p.age > 12) return { x: clamp(p.x, 0, 1920), y: clamp(p.y, 0, 1080), kind: 'miss', target: null };
  for (let treeIndex=0;treeIndex<TREE_COLLIDERS.length;treeIndex++) {
    if(terrain?.fallenTrees.includes(treeIndex))continue;
    const tree=TREE_COLLIDERS[treeIndex];
    // Broad bounds keep most flight steps away from detailed canopy checks.
    if (p.x < tree.left - TUNE.ballRadius || p.x > tree.right + TUNE.ballRadius
      || p.y < tree.top - TUNE.ballRadius || p.y > tree.baseY + TUNE.ballRadius) continue;
    const trunk = Math.abs(p.x - tree.x) <= tree.trunkWidth / 2 + TUNE.ballRadius
      && p.y >= tree.trunkTop - TUNE.ballRadius;
    const crown = tree.crown.some(c => Math.pow((p.x - c.x) / (c.rx + TUNE.ballRadius), 2)
      + Math.pow((p.y - c.y) / (c.ry + TUNE.ballRadius), 2) <= 1);
    if (trunk || crown) return { x: p.x, y: p.y, kind: 'tree', target: null, treeIndex };
  }
  const ground=groundY(p.x,terrain);
  if (p.y >= ground) return { x: p.x, y: ground, kind: 'ground', target: null };
  return null;
}
export function resolveImpact(m: Match, impact: Omit<Impact, 'serial'>) {
  if (m.phase !== 'flight') return;
  m.impact = { ...impact, serial: ++m.serial }; m.projectile = null;
  if(impact.kind==='tree' && impact.treeIndex!==undefined && TREES[impact.treeIndex]
    && !m.terrain.fallenTrees.includes(impact.treeIndex)) {
    m.terrain.fallenTrees.push(impact.treeIndex);m.terrain.revision++;
  }
  if(impact.kind==='ground' && !protectedGround(impact.x)) {
    const crater={x:impact.x,y:impact.y,radius:TUNE.blastRadius};
    // Remove only completely contained circles: this preserves the exact carved
    // surface and never heals a previous hole or stops digging after a shot cap.
    m.terrain.craters=m.terrain.craters.filter(old=>Math.hypot(old.x-crater.x,old.y-crater.y)+old.radius>crater.radius);
    m.terrain.craters.push(crater);
    TREES.forEach((tree,index)=>{
      if(!m.terrain.fallenTrees.includes(index)&&groundY(tree.x,m.terrain)>tree.baseY+8)m.terrain.fallenTrees.push(index);
    });
    m.terrain.revision++;
  }
  if (impact.target !== null) {
    m.health[impact.target] = Math.max(0, m.health[impact.target] - 1);
    if (!m.health[impact.target]) m.winner = other(impact.target);
  }
  m.phase = 'settle'; m.delay = TUNE.settle;
}
export function advance(m: Match, seconds: number) {
  if (m.phase === 'settle') {
    m.delay -= seconds;
    if (m.delay <= 0) {
      if (m.winner !== null) m.phase = 'over';
      else { m.turn = other(m.turn); m.phase = 'aim'; m.wind = Math.round((random(m) - .5) * 80); }
    }
    return;
  }
  if (m.phase !== 'flight' || !m.projectile) return;
  let remaining = Math.max(0, Math.min(seconds, .1));
  while (remaining > 0 && m.projectile) {
    const dt = Math.min(remaining, TUNE.step); stepBall(m.projectile, m.wind, dt); remaining -= dt;
    const hit = collision(m.projectile,m.terrain); if (hit) resolveImpact(m, hit);
  }
  if (m.projectile) { m.projectile.trail.push({ x: m.projectile.x, y: m.projectile.y }); if (m.projectile.trail.length > 28) m.projectile.trail.shift(); }
}
export function preview(m: Match, seconds = .30, origin?: Point): Point[] {
  const p = makeProjectile(m.turn, m.angle[m.turn], m.power[m.turn], origin), points: Point[] = [];
  for (let t = 0; t < seconds; t += .065) { points.push({ x: p.x, y: p.y }); stepBall(p, m.wind, .065); }
  return points;
}
