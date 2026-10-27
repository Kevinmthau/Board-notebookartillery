import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance, beginShot, collision, createMatch, groundY, makeProjectile, resolveImpact, stepBall, TREES, TUNE, type Projectile, type Side } from '../src/artillery';
function trace(side: Side, wind: number, angle: number, power: number) {
  const ball=makeProjectile(side,angle,power);
  for(let tick=0;tick<1500;tick++) {
    stepBall(ball,wind,TUNE.step);
    const impact=collision(ball);if(impact)return impact;
  }
  assert.fail('shot did not resolve');
}
test('a deliberate shot changes turns once; firing again in flight is refused', () => {
  const m = createMatch(12); assert.ok(beginShot(m)); assert.equal(beginShot(m), false);
  resolveImpact(m, { x: 1000, y: 800, kind: 'ground', target: null }); advance(m, 2);
  assert.equal(m.turn, 1); assert.deepEqual(m.shots, [1, 0]); assert.equal(m.phase, 'aim');
});
test('three tower hits produce a lasting result, never an automatic restart', () => {
  const m = createMatch(4);
  for (let i = 0; i < 3; i++) { m.turn = 0; beginShot(m); resolveImpact(m, { x: TUNE.towerX[1], y: TUNE.roofY, kind: 'hit', target: 1 }); advance(m, 2); }
  assert.equal(m.health[1], 0); assert.equal(m.winner, 0); assert.equal(m.phase, 'over');
  advance(m, 300); assert.equal(m.phase, 'over'); assert.equal(beginShot(m), false);
});
test('wind changes horizontal travel while gravity changes vertical travel', () => {
  const p: Projectile = { x: 0, y: 0, vx: 500, vy: -500, age: 0, trail: [] };
  stepBall(p, 30, 1); assert.equal(p.x, 515); assert.equal(p.vx, 530); assert.equal(p.y, -280);
});
test('the default shot is blocked and flat shots cannot shortcut the battlefield', () => {
  for(const side of [0,1] as const) {
    assert.equal(trace(side,0,45,70).kind,'tree','default aim should require adjustment');
    for(const angle of [15,20,25,30])for(const power of [70,85,100]) {
      const impact=trace(side,0,angle,power);
      assert.ok(impact.kind==='tree'||impact.kind==='ground'||impact.kind==='miss','a flat shot must not hit the other tower');
      assert.equal(impact.target,null);
    }
  }
});
test('visible canopy and trunk geometry stops a shot without damaging either tower', () => {
  const tree=TREES[0],crown=tree.crown[0];
  for(const point of [{x:crown.x,y:crown.y},{x:tree.x,y:tree.baseY-4}]) {
    const ball:Projectile={...point,vx:400,vy:0,age:1,trail:[]};
    const impact=collision(ball);assert.equal(impact?.kind,'tree');assert.equal(impact?.target,null);
    const match=createMatch(4);beginShot(match);resolveImpact(match,impact!);
    assert.deepEqual(match.health,[3,3]);assert.equal(match.phase,'settle');
  }
});
test('both towers remain reachable but the broad angle-power grid mostly misses', () => {
  for(const side of [0,1] as const)for(const wind of [-40,0,40]) {
    let hits=0,attempts=0;
    for(let angle=15;angle<=80;angle+=5)for(let power=20;power<=100;power+=2) {
      attempts++;
      const impact=trace(side,wind,angle,power);
      if(impact.target===(1-side))hits++;
    }
    // Previously 24–31% of this same grid hit the large unobstructed towers.
    // Keep several usable arcs while preventing a return to that broad sweet spot.
    assert.ok(hits>=15,`side${side}/wind${wind}: reachable with several aim choices`);
    assert.ok(hits/attempts<.09,`side${side}/wind${wind}: ${hits}/${attempts} is too forgiving`);
  }
});
test('the smaller tower target does not keep the old invisible wide hit box', () => {
  for(const side of [0,1] as const) {
    const ball:Projectile={x:TUNE.towerX[side]+95,y:780,vx:0,vy:10,age:2,trail:[]};
    assert.equal(collision(ball),null,'shot beside the scaled tower must pass without a hit');
  }
});
test('ground impacts carve lasting craters, undermine trees, and keep physical platforms intact', () => {
  const match=createMatch(17),x=TREES[4].x,before=groundY(x);
  beginShot(match);resolveImpact(match,{x,y:before,kind:'ground',target:null});
  assert.equal(match.terrain.revision,1);
  assert.equal(groundY(x,match.terrain),before+TUNE.blastRadius);
  assert.ok(match.terrain.fallenTrees.includes(4),'a tree whose roots are excavated must fall');
  assert.deepEqual(match.health,[3,3]);
  const restored=JSON.parse(JSON.stringify(match));
  assert.equal(groundY(x,restored.terrain),before+TUNE.blastRadius,'saved terrain must retain its hole');
  advance(match,2);beginShot(match);
  resolveImpact(match,{x:415,y:groundY(415,match.terrain),kind:'ground',target:null});
  assert.equal(groundY(395,match.terrain),groundY(395),'nearby blasts must not move the physical cannon platform');
  assert.equal(groundY(TUNE.towerX[0],match.terrain),groundY(TUNE.towerX[0]));
  assert.deepEqual(createMatch(17).terrain,{craters:[],fallenTrees:[],revision:0},'a rematch starts with fresh scenery');
});
test('a tree hit opens a lasting path for the next shot through its old canopy', () => {
  const match=createMatch(2);match.wind=0;beginShot(match,20,70);
  for(let frame=0;frame<800&&match.phase==='flight';frame++)advance(match,1/60);
  const first=match.impact!;
  assert.equal(first.kind,'tree');assert.ok(first.treeIndex!==undefined);
  assert.ok(match.terrain.fallenTrees.includes(first.treeIndex!));
  const oldCanopy:Projectile={x:first.x,y:first.y,vx:400,vy:0,age:1,trail:[]};
  assert.equal(collision(oldCanopy,match.terrain),null,'felled canopy should no longer block a shell');
  advance(match,2);match.turn=0;match.wind=0;beginShot(match,20,70);
  for(let frame=0;frame<800&&match.phase==='flight';frame++)advance(match,1/60);
  assert.ok(match.impact!.x>first.x+10,'the next identical shot should reach farther');
  assert.notEqual(match.impact!.treeIndex,first.treeIndex);
});
test('long matches do not heal old craters or silently stop making new ones', () => {
  const match=createMatch(8);
  for(let i=0;i<150;i++) {
    const x=430+i*7;
    beginShot(match);resolveImpact(match,{x,y:groundY(x,match.terrain),kind:'ground',target:null});advance(match,2);
  }
  assert.ok(groundY(430,match.terrain)>groundY(430));
  assert.ok(groundY(1473,match.terrain)>groundY(1473));
  assert.equal(match.terrain.revision,150);
});
