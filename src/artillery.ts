export type Side = 0 | 1;
export type Point = { x: number; y: number };
export const TUNE = { gravity: 440, minAngle: 15, maxAngle: 80, minPower: 20, maxPower: 100,
  towerX: [330, 1590], roofY: 650, baseY: 870, towerHalf: 100, health: 3, step: 1 / 120, settle: 1.1 } as const;
export type Projectile = Point & { vx: number; vy: number; age: number; trail: Point[] };
export type Impact = Point & { kind: 'hit' | 'ground' | 'miss'; target: Side | null; serial: number };
export type Match = { phase: 'aim' | 'flight' | 'settle' | 'over'; turn: Side; health: [number, number];
  shots: [number, number]; angle: [number, number]; power: [number, number]; wind: number; seed: number;
  projectile: Projectile | null; impact: Impact | null; winner: Side | null; delay: number; serial: number };
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const other = (side: Side): Side => side === 0 ? 1 : 0;
export function random(state: { seed: number }) { state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0; return state.seed / 4294967296; }
export function createMatch(seed = Date.now()): Match {
  const m: Match = { phase: 'aim', turn: 0, health: [3, 3], shots: [0, 0], angle: [45, 45], power: [70, 70],
    wind: 0, seed: seed >>> 0, projectile: null, impact: null, winner: null, delay: 0, serial: 0 };
  m.wind = Math.round((random(m) - .5) * 80); return m;
}
export function groundY(x: number) { return 890 - 170 * Math.exp(-Math.pow((x - 960) / 290, 2)); }
export function launchPoint(side: Side, angle: number): Point {
  const a = angle * Math.PI / 180, d = side === 0 ? 1 : -1;
  return { x: TUNE.towerX[side] + Math.cos(a) * 112 * d, y: TUNE.roofY - 40 - Math.sin(a) * 112 };
}
export function makeProjectile(side: Side, angle: number, power: number, origin?: Point): Projectile {
  const a = angle * Math.PI / 180, speed = 340 + power * 5.6;
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
export function collision(p: Projectile): Omit<Impact, 'serial'> | null {
  for (const side of [0, 1] as const) {
    if (p.age > .13 && Math.abs(p.x - TUNE.towerX[side]) <= TUNE.towerHalf + 9 && p.y >= TUNE.roofY - 8 && p.y <= TUNE.baseY)
      return { x: p.x, y: p.y, kind: 'hit', target: side };
  }
  if (p.x < -100 || p.x > 2020 || p.age > 12) return { x: clamp(p.x, 0, 1920), y: clamp(p.y, 0, 1080), kind: 'miss', target: null };
  if (p.y >= groundY(p.x)) return { x: p.x, y: groundY(p.x), kind: 'ground', target: null };
  return null;
}
export function resolveImpact(m: Match, impact: Omit<Impact, 'serial'>) {
  if (m.phase !== 'flight') return;
  m.impact = { ...impact, serial: ++m.serial }; m.projectile = null;
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
    const hit = collision(m.projectile); if (hit) resolveImpact(m, hit);
  }
  if (m.projectile) { m.projectile.trail.push({ x: m.projectile.x, y: m.projectile.y }); if (m.projectile.trail.length > 28) m.projectile.trail.shift(); }
}
export function preview(m: Match, seconds = .43, origin?: Point): Point[] {
  const p = makeProjectile(m.turn, m.angle[m.turn], m.power[m.turn], origin), points: Point[] = [];
  for (let t = 0; t < seconds; t += .065) { points.push({ x: p.x, y: p.y }); stepBall(p, m.wind, .065); }
  return points;
}
