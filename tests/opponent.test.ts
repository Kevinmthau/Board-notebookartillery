import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance, beginShot, createMatch, groundY, resolveImpact, TREES, TUNE, type Match, type Side } from '../src/artillery';
import { chooseShot } from '../src/opponent';

function playShot(match: Match) {
  const shot = chooseShot(match);
  assert.ok(beginShot(match, shot.angle, shot.power));
  for (let frame = 0; frame < 800 && match.phase === 'flight'; frame++) advance(match, 1 / 60);
  assert.notEqual(match.phase, 'flight', 'a chosen shot must resolve');
  advance(match, 2);
}

test('planning is repeatable, legal, and leaves the match and wind sequence untouched', () => {
  for (const turn of [0, 1] as const) {
    const match = createMatch(146);
    match.turn = turn; match.wind = turn ? 40 : -40; match.shots = [5, 7];
    const before = structuredClone(match);
    const shot = chooseShot(match);
    assert.deepEqual(chooseShot(match), shot);
    assert.deepEqual(match, before);
    assert.ok(Number.isFinite(shot.angle) && Number.isFinite(shot.power));
    assert.ok(shot.angle >= TUNE.minAngle && shot.angle <= TUNE.maxAngle);
    assert.ok(shot.power >= TUNE.minPower && shot.power <= TUNE.maxPower);
  }
});

test('both sides land ordinary shots in headwinds and tailwinds while leaving real openings', () => {
  for (const turn of [0, 1] as const) {
    for (const wind of [-40, -20, 0, 20, 40]) {
      let hits = 0;
      for (let seed = 1; seed <= 160; seed++) {
        const match = createMatch(seed * 7919);
        match.turn = turn; match.wind = wind; match.shots = [seed % 7, seed % 5];
        playShot(match);
        if (match.health[(1 - turn) as Side] < TUNE.health) hits++;
        assert.equal(match.health[turn], TUNE.health, 'AI must not shoot its own tower');
      }
      assert.ok(hits >= 80 && hits <= 120, `side ${turn}, wind ${wind}: ${hits}/160 hits should be capable but fallible`);
    }
  }
});

test('complete matches progress through obstacles, real flight, and victory within 40 shots', () => {
  for (let seed = 1; seed <= 16; seed++) {
    const match = createMatch(seed * 1337);
    let shots = 0;
    while (match.phase !== 'over' && shots < 40) { playShot(match); shots++; }
    assert.equal(match.phase, 'over', `seed ${seed} stalled after ${shots} shots`);
    assert.ok(match.winner === 0 || match.winner === 1);
    assert.equal(match.health[(1 - match.winner!) as Side], 0);
    assert.ok(shots >= 5, 'victory still requires three alternating direct hits');
  }
});
test('Pip plans against damaged terrain without modifying the match or reusing another shape', () => {
  let hits=0;
  for(let seed=1;seed<=40;seed++) {
    const match=createMatch(seed*7919);match.wind=0;
    // The same revision can represent different holes in different matches.
    const tree=TREES[seed%TREES.length];
    beginShot(match);resolveImpact(match,{x:tree.x,y:groundY(tree.x),kind:'ground',target:null});advance(match,2);
    match.wind=0;match.turn=(seed%2) as Side;
    const before=structuredClone(match),shot=chooseShot(match);
    assert.deepEqual(match,before,'planning cannot reshape the terrain');
    assert.deepEqual(chooseShot(match),shot,'same damage and wind should plan consistently');
    const side=match.turn;
    beginShot(match,shot.angle,shot.power);
    for(let frame=0;frame<800&&match.phase==='flight';frame++)advance(match,1/60);
    if(match.health[(1-side) as Side]<TUNE.health)hits++;
  }
  assert.ok(hits>=16&&hits<=34,`${hits}/40 changed-terrain hits must remain capable and fallible`);
});
