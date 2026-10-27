import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance, baseGroundY, beginShot, birdPoses, collision, createMatch, groundY, makeProjectile, preview, resolveImpact, stepBall, TREES, TUNE, type Projectile, type Side, type Terrain } from '../src/artillery';
function trace(side: Side, wind: number, angle: number, power: number,terrain?:Terrain) {
  const ball=makeProjectile(side,angle,power);
  for(let tick=0;tick<1500;tick++) {
    stepBall(ball,wind,TUNE.step);
    const impact=collision(ball,terrain);if(impact)return impact;
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
test('physical shots and preview leave the barrel along its actual heading at every orientation', () => {
  for (const side of [0,1] as const) for (const facingDeg of [0,5,15,45,90,180,225,270,285,300,345,355,359]) {
    const m=createMatch(4), pose={x:TUNE.towerX[side],y:TUNE.cannonY-100,facingDeg};
    m.turn=side;m.angle[side]=45;m.wind=20;
    const dots=preview(m,.30,pose);
    assert.ok(beginShot(m,45,70,pose));
    const p=m.projectile!,r=facingDeg*Math.PI/180,dx=Math.cos(r),dy=Math.sin(r);
    assert.deepEqual(dots[0],{x:p.x,y:p.y});
    assert.ok(Math.abs(p.vx*dy-p.vy*dx)<1e-9,`side ${side}, heading ${facingDeg}: shot left the barrel sideways`);
    assert.ok(p.vx*dx+p.vy*dy>0,'shot must leave the front, not the rear');
    assert.ok(Math.abs(Math.hypot(p.vx,p.vy)-(250+70*6.2))<1e-9,'physical heading must not change power');
    const dt=.065;
    assert.ok(Math.abs(dots[1].x-(p.x+p.vx*dt+m.wind*dt*dt/2))<1e-9);
    assert.ok(Math.abs(dots[1].y-(p.y+p.vy*dt+TUNE.gravity*dt*dt/2))<1e-9);
    // The displayed elevation must encode the same heading, even outside the browser's 15–80° limits.
    const displayHeading=(side===0?-m.angle[side]:180+m.angle[side])*Math.PI/180;
    assert.ok(Math.abs(Math.cos(displayHeading)-dx)<1e-9);
    assert.ok(Math.abs(Math.sin(displayHeading)-dy)<1e-9);
  }
});
test('browser and AI shots retain the elevation limits without a physical barrel pose', () => {
  for(const side of [0,1] as const) for(const [input,expected] of [[0,15],[90,80]]) {
    const m=createMatch(4);m.turn=side;
    assert.ok(beginShot(m,input,70));assert.equal(m.angle[side],expected);
  }
  const m=createMatch(4);
  assert.equal(beginShot(m,45,70,{x:240,y:600,facingDeg:NaN}),false);
  assert.equal(m.phase,'aim');assert.equal(m.projectile,null);
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
  const match=createMatch(17),x=match.terrain.trees[4].x,before=groundY(x,match.terrain);
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
  const fresh=createMatch(17).terrain;
  assert.deepEqual(fresh.craters,[]);assert.deepEqual(fresh.fallenTrees,[]);assert.equal(fresh.revision,0);
  assert.deepEqual(fresh.ridges,match.terrain.ridges,'explicit seed should preserve pristine layout while resetting damage');
});
test('a tree hit opens a lasting path for the next shot through its old canopy', () => {
  const match=createMatch(2);match.wind=0;
  let angle=15,power=50;
  search:for(const a of [15,20,25,30,35,40])for(const p of [50,60,70,80,90,100])if(trace(0,0,a,p,match.terrain).kind==='tree'){angle=a;power=p;break search;}
  beginShot(match,angle,power);
  for(let frame=0;frame<800&&match.phase==='flight';frame++)advance(match,1/60);
  const first=match.impact!;
  assert.equal(first.kind,'tree');assert.ok(first.treeIndex!==undefined);
  assert.ok(match.terrain.fallenTrees.includes(first.treeIndex!));
  const oldCanopy:Projectile={x:first.x,y:first.y,vx:400,vy:0,age:1,trail:[]};
  assert.equal(collision(oldCanopy,match.terrain),null,'felled canopy should no longer block a shell');
  advance(match,2);match.turn=0;match.wind=0;beginShot(match,angle,power);
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
  assert.ok(groundY(430,match.terrain)>baseGroundY(430,match.terrain));
  assert.ok(groundY(1473,match.terrain)>baseGroundY(1473,match.terrain));
  assert.equal(match.terrain.revision,150);
});
test('layouts are seeded, persistent, and new matches differ without moving the cannon pads', () => {
  assert.deepEqual(createMatch(912),createMatch(912));
  const first=createMatch(),second=createMatch();assert.notDeepEqual(first.terrain,second.terrain,'rapid rematches must not reuse the same seed');
  const layouts=[1,2,3,4].map(seed=>createMatch(seed).terrain);
  assert.equal(new Set(layouts.map(layout=>JSON.stringify(layout))).size,4);
  for(const layout of layouts)for(const x of [80,240,395,1525,1680,1840])assert.equal(baseGroundY(x,layout),856);
  const saved=JSON.parse(JSON.stringify(first));
  assert.deepEqual(saved.terrain,first.terrain);
  assert.deepEqual(birdPoses(saved),birdPoses(first));
});
test('random hills change previously winning routes while keeping both sides reachable', () => {
  const outcomes=new Map<string,Set<string>>([['50/80',new Set()],['55/85',new Set()]]);
  for(let seed=1;seed<=12;seed++) {
    const terrain=createMatch(seed*7919).terrain;
    for(const [angle,power] of [[50,80],[55,85]])outcomes.get(`${angle}/${power}`)!.add(trace(0,0,angle,power,terrain).kind);
    for(const side of [0,1] as const)for(const wind of [-40,0,40]) {
      let reachable=false;
      for(let angle=40;angle<=65&&!reachable;angle+=5)for(let power=65;power<=100;power+=2)
        if(trace(side,wind,angle,power,terrain).target===1-side){reachable=true;break;}
      assert.ok(reachable,`layout${seed}/side${side}/wind${wind} must have a clean route`);
    }
  }
  for(const [shot,kinds] of outcomes){assert.ok(kinds.has('hit'),`${shot} should work on some layouts`);assert.ok(kinds.has('tree')||kinds.has('ground'),`${shot} should be blocked on other layouts`);}
});
test('birds cross occasionally, move continuously, stay above trees, and survive a shell interception', () => {
  const match=createMatch(44);
  assert.deepEqual(birdPoses(match),[],'the sky starts clear');
  match.elapsed=match.birds.startsAt+3;
  const birds=birdPoses(match);assert.ok(birds.length>0);
  const later=birdPoses(match,match.elapsed+.05);assert.equal(later[0].id,birds[0].id);
  assert.ok(Math.abs(later[0].x-birds[0].x)<20&&later[0].x!==birds[0].x);
  const crownTop=Math.min(...match.terrain.trees.flatMap(tree=>tree.crown.map(c=>c.y-c.ry)));
  for(let tick=0;tick<600;tick++)for(const bird of birdPoses(match,tick*.1))assert.ok(bird.y+bird.ry<crownTop,'bird must not fly through the treetops');
  beginShot(match);match.projectile={x:birds[0].x,y:birds[0].y,vx:0,vy:0,age:1,trail:[]};
  const terrain=structuredClone(match.terrain);advance(match,TUNE.step);
  assert.equal(match.impact?.kind,'bird');assert.equal(match.phase,'settle');assert.deepEqual(match.health,[3,3]);assert.deepEqual(match.terrain,terrain);
  assert.ok(birdPoses(match).some(b=>b.id===birds[0].id&&b.fleeing),'bird should fly away unharmed');
  assert.equal(collision({x:birds[0].x,y:birds[0].y,vx:0,vy:0,age:1,trail:[]},match.terrain,birdPoses(match)),null,'fleeing bird cannot block again');
  const checkpoint=JSON.parse(JSON.stringify(match));assert.deepEqual(birdPoses(checkpoint),birdPoses(match));
  match.elapsed=match.birds.startsAt+11;assert.deepEqual(birdPoses(match),[],'crossings need a clear gap');
  match.elapsed=match.birds.startsAt+match.birds.interval+3;assert.ok(birdPoses(match).some(b=>!b.fleeing),'a later flock should cross');
});
