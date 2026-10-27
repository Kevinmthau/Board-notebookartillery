import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance, beginShot, createMatch, resolveImpact, stepBall, type Projectile } from '../src/artillery';
test('a deliberate shot changes turns once; firing again in flight is refused', () => {
  const m = createMatch(12); assert.ok(beginShot(m)); assert.equal(beginShot(m), false);
  resolveImpact(m, { x: 1000, y: 800, kind: 'ground', target: null }); advance(m, 2);
  assert.equal(m.turn, 1); assert.deepEqual(m.shots, [1, 0]); assert.equal(m.phase, 'aim');
});
test('three tower hits produce a lasting result, never an automatic restart', () => {
  const m = createMatch(4);
  for (let i = 0; i < 3; i++) { m.turn = 0; beginShot(m); resolveImpact(m, { x: 1590, y: 700, kind: 'hit', target: 1 }); advance(m, 2); }
  assert.equal(m.health[1], 0); assert.equal(m.winner, 0); assert.equal(m.phase, 'over');
  advance(m, 300); assert.equal(m.phase, 'over'); assert.equal(beginShot(m), false);
});
test('wind changes horizontal travel while gravity changes vertical travel', () => {
  const p: Projectile = { x: 0, y: 0, vx: 500, vy: -500, age: 0, trail: [] };
  stepBall(p, 30, 1); assert.equal(p.x, 515); assert.equal(p.vx, 530); assert.equal(p.y, -280);
});
test('physics can complete a shot and damage the opponent using ordinary aim values', () => {
  let hits = 0;
  for (let power = 40; power <= 100; power += 2) {
    const m = createMatch(10); m.wind = 0; beginShot(m, 45, power);
    for (let i = 0; i < 1000 && m.phase === 'flight'; i++) advance(m, 1 / 60);
    if (m.health[1] === 2) hits++;
    assert.notEqual(m.phase, 'flight');
  }
  assert.ok(hits >= 2, 'opponent must have a useful hitting window');
});
