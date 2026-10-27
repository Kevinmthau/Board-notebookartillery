export type Side = 0 | 1;
export type Point = { x: number; y: number };
/** A physical cannon supplies its actual heading as well as its muzzle position. */
export type LaunchPose = Point & { facingDeg?: number };
export const TUNE = { gravity: 440, minAngle: 15, maxAngle: 80, minPower: 20, maxPower: 100,
  towerX: [240, 1680], roofY: 718, baseY: 846, towerHalf: 58, towerScale: .58, cannonY: 678,
  ballRadius: 9, blastRadius: 64, health: 3, step: 1 / 120, settle: 1.1 } as const;
export type Projectile = Point & { vx: number; vy: number; age: number; trail: Point[] };
export type Ridge = { x: number; height: number; width: number };
export type Terrain = { ridges: Ridge[]; trees: ObstacleTree[]; craters: (Point & { radius: number })[]; fallenTrees: number[]; revision: number };
export type BirdEscape = Point & { id: number; at: number; direction: 1 | -1 };
export type BirdState = { startsAt: number; interval: number; speed: number; height: number; direction: 1 | -1; count: 1 | 2; gap: number; escapes: BirdEscape[] };
export type BirdPose = Point & { id: number; rx: number; ry: number; direction: 1 | -1; wingPhase: number; fleeing: boolean };
export type Impact = Point & { kind: 'hit' | 'ground' | 'tree' | 'bird' | 'miss'; target: Side | null; treeIndex?: number; birdId?: number; serial: number };
export type Match = { phase: 'aim' | 'flight' | 'settle' | 'over'; turn: Side; health: [number, number];
  shots: [number, number]; angle: [number, number]; power: [number, number]; wind: number; seed: number;
  projectile: Projectile | null; impact: Impact | null; winner: Side | null; delay: number; serial: number; terrain: Terrain; elapsed: number; birds: BirdState };
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const other = (side: Side): Side => side === 0 ? 1 : 0;
export function random(state: { seed: number }) { state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0; return state.seed / 4294967296; }
let freshMatchSerial = 0;
export function createMatch(seed?: number): Match {
  const initialSeed = seed === undefined ? (Date.now()+Math.imul(++freshMatchSerial,0x9e3779b1))>>>0 : seed>>>0;
  const terrain=createTerrain(initialSeed),birdRng={seed:initialSeed^0x79b14145};
  const obstacleTop=Math.min(...terrain.trees.flatMap(tree=>tree.crown.map(c=>c.y-c.ry)));
  const m: Match = { phase: 'aim', turn: 0, health: [3, 3], shots: [0, 0], angle: [45, 45], power: [70, 70],
    wind: 0, seed: initialSeed, projectile: null, impact: null, winner: null, delay: 0, serial: 0, terrain,elapsed:0,
    birds:{startsAt:6+random(birdRng)*5,interval:19+random(birdRng)*5,speed:270+random(birdRng)*50,
      height:Math.min(330,obstacleTop-82),direction:random(birdRng)<.5?1:-1,
      count:random(birdRng)<.5?1:2,gap:.7+random(birdRng)*.5,escapes:[]} };
  m.wind = Math.round((random(m) - .5) * 80); return m;
}
// One geometry source drives the rendered foreground and projectile collisions.
export const RIDGES = [
  { x: 650, height: 230, width: 140 },
  { x: 970, height: 330, width: 165 },
  { x: 1290, height: 250, width: 145 },
] as const;
const protectedGround = (x: number) => TUNE.towerX.some(towerX => Math.abs(x - towerX) <= 160);
export function baseGroundY(x:number,terrain?:Terrain) {
  const smooth=(n:number)=>{const t=clamp(n,0,1);return t*t*(3-2*t);};
  const edge=smooth((x-400)/140)*smooth((1520-x)/140);
  return 856-edge*(terrain?.ridges??RIDGES).reduce((height,ridge)=>height+ridge.height*Math.exp(-Math.pow((x-ridge.x)/ridge.width,2)),0);
}
export function groundY(x: number, terrain?: Terrain) {
  let y = baseGroundY(x,terrain);
  // A real Cannon's platform must stay put even as the valley is excavated.
  if(!terrain || protectedGround(x))return y;
  for(const crater of terrain.craters) {
    const dx = x-crater.x;
    if(Math.abs(dx)<crater.radius)y=Math.max(y,crater.y+Math.sqrt(crater.radius*crater.radius-dx*dx));
  }
  return y;
}
export type ObstacleTree = { x: number; baseY: number; trunkWidth: number; crown: readonly { x: number; y: number; rx: number; ry: number }[] };
function makeTree(x:number,baseY:number,height:number,width:number):ObstacleTree {
  return { x, baseY, trunkWidth: 12, crown: [
    { x: x - width * .36, y: baseY - height * .62, rx: width * .73, ry: height * .32 },
    { x: x + width * .28, y: baseY - height * .72, rx: width * .76, ry: height * .32 },
  ] };
}
export function createTerrain(seed:number):Terrain {
  const rng={seed:(seed^0x6d2b79f5)>>>0},count=random(rng)<.45?4:3;
  const terrain:Terrain={ridges:[],trees:[],craters:[],fallenTrees:[],revision:0};
  for(let i=0;i<count;i++) {
    const center=610+i*700/(count-1)+(random(rng)-.5)*110;
    const central=count===3&&i===1;
    terrain.ridges.push({x:center,height:(central?270:175)+random(rng)*(central?110:115),width:(count===3?110:95)+random(rng)*55});
  }
  // Some valleys have steep wooded shoulders near one or both ends. These
  // change descending approaches as well as low routes over the central hills.
  const shoulders=[random(rng)<.5,random(rng)<.5];
  shoulders.forEach((present,side)=>{
    if(present)terrain.ridges.push({x:(side===0?515:1405)+(random(rng)-.5)*30,height:240+random(rng)*100,width:80+random(rng)*30});
  });
  const peak=Math.min(...Array.from({length:121},(_,i)=>baseGroundY(i*16,terrain)));
  if(peak<470)terrain.ridges.forEach(ridge=>{ridge.height*=(856-470)/(856-peak);});
  const treeCount=9+Math.floor(random(rng)*5);
  for(let i=0;i<treeCount;i++) {
    const x=510+i*900/(treeCount-1)+(random(rng)-.5)*35;
    const edgeGrove=(i===0&&shoulders[0])||(i===treeCount-1&&shoulders[1]);
    const base=baseGroundY(x,terrain),height=(edgeGrove?130:75)+random(rng)*(edgeGrove?45:55);
    terrain.trees.push(makeTree(x,base,Math.min(height,(base-300)/1.04),26+random(rng)*(edgeGrove?19:13)));
  }
  return terrain;
}
export const TREES: readonly ObstacleTree[] = [
  [535, 90, 32], [610, 110, 36], [705, 95, 31], [805, 82, 29], [900, 110, 36],
  [1005, 100, 34], [1100, 85, 29], [1200, 108, 35], [1305, 112, 37], [1400, 92, 31],
].map(([x, height, width]) => {
  const baseY = groundY(x);
  return makeTree(x,baseY,height,width);
});
const makeTreeColliders = (trees:readonly ObstacleTree[])=>trees.map(tree => ({ ...tree,
  top: Math.min(...tree.crown.map(c => c.y - c.ry)),
  trunkTop: Math.min(...tree.crown.map(c => c.y)),
  left: Math.min(tree.x - tree.trunkWidth / 2, ...tree.crown.map(c => c.x - c.rx)),
  right: Math.max(tree.x + tree.trunkWidth / 2, ...tree.crown.map(c => c.x + c.rx)),
}));
const TREE_COLLIDERS=makeTreeColliders(TREES);
const treeColliderCache=new WeakMap<readonly ObstacleTree[],ReturnType<typeof makeTreeColliders>>();
function treeColliders(terrain?:Terrain) {
  if(!terrain)return TREE_COLLIDERS;
  let cached=treeColliderCache.get(terrain.trees);
  if(!cached){cached=makeTreeColliders(terrain.trees);treeColliderCache.set(terrain.trees,cached);}
  return cached;
}
export function birdPoses(match:Match,at=match.elapsed):BirdPose[] {
  const birds:BirdPose[]=[],flock=match.birds;
  for(let i=0;i<flock.count;i++) {
    const passed=at-flock.startsAt-i*flock.gap;if(passed<0)continue;
    const cycle=Math.floor(passed/flock.interval),age=passed-cycle*flock.interval;
    const id=cycle*2+i,direction=(cycle%2?-flock.direction:flock.direction) as 1|-1;
    const escape=flock.escapes.find(e=>e.id===id);
    if(escape) {
      const fled=at-escape.at;if(fled<0||fled>2.2)continue;
      birds.push({id,x:escape.x+escape.direction*460*fled,y:escape.y-160*fled-30*fled*fled,
        rx:30,ry:18,direction:escape.direction,wingPhase:at*16,fleeing:true});continue;
    }
    const x=direction===1?-70+age*flock.speed:1990-age*flock.speed;
    if(x< -65||x>1985)continue;
    birds.push({id,x,y:flock.height+i*32+Math.sin(age*2.1+i)*12+Math.sin(cycle*1.7)*16,
      rx:30,ry:18,direction,wingPhase:at*10+i,fleeing:false});
  }
  return birds;
}
export function launchPoint(side: Side, angle: number): Point {
  const a = angle * Math.PI / 180, d = side === 0 ? 1 : -1;
  return { x: TUNE.towerX[side] + Math.cos(a) * 112 * d, y: TUNE.cannonY - Math.sin(a) * 112 };
}
/** Signed elevation toward the opponent, without altering the physical barrel direction. */
export function elevationFromFacing(side: Side, facingDeg: number): number {
  const angle = side === 0 ? -facingDeg : facingDeg - 180;
  return ((angle % 360) + 540) % 360 - 180;
}
export function makeProjectile(side: Side, angle: number, power: number, origin?: LaunchPose): Projectile {
  const a = angle * Math.PI / 180, speed = 250 + power * 6.2;
  const start = origin ?? launchPoint(side, angle);
  const p: Projectile = { x: start.x, y: start.y, vx: Math.cos(a) * speed * (side === 0 ? 1 : -1),
    vy: -Math.sin(a) * speed, age: 0, trail: [] };
  if (origin?.facingDeg !== undefined) {
    const heading = origin.facingDeg * Math.PI / 180;
    p.vx = Math.cos(heading) * speed;
    p.vy = Math.sin(heading) * speed;
  }
  return p;
}
export function beginShot(m: Match, angle = m.angle[m.turn], power = m.power[m.turn], origin?: LaunchPose): boolean {
  if (m.phase !== 'aim' || m.winner !== null || !Number.isFinite(angle) || !Number.isFinite(power)) return false;
  if (origin?.facingDeg !== undefined && !Number.isFinite(origin.facingDeg)) return false;
  m.angle[m.turn] = origin?.facingDeg === undefined ? clamp(angle, TUNE.minAngle, TUNE.maxAngle)
    : elevationFromFacing(m.turn, origin.facingDeg);
  m.power[m.turn] = clamp(power, TUNE.minPower, TUNE.maxPower);
  m.projectile = makeProjectile(m.turn, m.angle[m.turn], m.power[m.turn], origin);
  m.shots[m.turn]++; m.phase = 'flight'; m.impact = null; return true;
}
export function stepBall(p: Projectile, wind: number, dt: number) {
  p.x += p.vx * dt + wind * dt * dt / 2;
  p.y += p.vy * dt + TUNE.gravity * dt * dt / 2;
  p.vx += wind * dt; p.vy += TUNE.gravity * dt; p.age += dt;
}
export function collision(p: Projectile, terrain?: Terrain,birds:readonly BirdPose[]=[]): Omit<Impact, 'serial'> | null {
  for (const side of [0, 1] as const) {
    // Native barrels may point down into their own tower. Launching outside the
    // physical piece is enough clearance; a time-based immunity would let those
    // shells pass through visible masonry before tower collisions become active.
    if (Math.abs(p.x - TUNE.towerX[side]) <= TUNE.towerHalf + TUNE.ballRadius && p.y >= TUNE.roofY - TUNE.ballRadius && p.y <= TUNE.baseY)
      return { x: p.x, y: p.y, kind: 'hit', target: side };
  }
  if (p.x < -100 || p.x > 2020 || p.age > 12) return { x: clamp(p.x, 0, 1920), y: clamp(p.y, 0, 1080), kind: 'miss', target: null };
  for(const bird of birds)if(!bird.fleeing && Math.pow((p.x-bird.x)/(bird.rx+TUNE.ballRadius),2)
    +Math.pow((p.y-bird.y)/(bird.ry+TUNE.ballRadius),2)<=1)
    return {x:p.x,y:p.y,kind:'bird',target:null,birdId:bird.id};
  const colliders=treeColliders(terrain);
  for (let treeIndex=0;treeIndex<colliders.length;treeIndex++) {
    if(terrain?.fallenTrees.includes(treeIndex))continue;
    const tree=colliders[treeIndex];
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
  if(impact.kind==='bird' && impact.birdId!==undefined) {
    const bird=birdPoses(m).find(b=>b.id===impact.birdId);
    if(bird&&!bird.fleeing)m.birds.escapes.push({id:bird.id,at:m.elapsed,x:bird.x,y:bird.y,direction:bird.direction});
  }
  if(impact.kind==='tree' && impact.treeIndex!==undefined && m.terrain.trees[impact.treeIndex]
    && !m.terrain.fallenTrees.includes(impact.treeIndex)) {
    m.terrain.fallenTrees.push(impact.treeIndex);m.terrain.revision++;
  }
  if(impact.kind==='ground' && !protectedGround(impact.x)) {
    const crater={x:impact.x,y:impact.y,radius:TUNE.blastRadius};
    // Remove only completely contained circles: this preserves the exact carved
    // surface and never heals a previous hole or stops digging after a shot cap.
    m.terrain.craters=m.terrain.craters.filter(old=>Math.hypot(old.x-crater.x,old.y-crater.y)+old.radius>crater.radius);
    m.terrain.craters.push(crater);
    m.terrain.trees.forEach((tree,index)=>{
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
  if(m.phase==='over')return;
  const elapsed=Math.max(0,Math.min(seconds,.1));
  m.birds.escapes=m.birds.escapes.filter(escape=>m.elapsed-escape.at<m.birds.interval+12);
  if (m.phase === 'settle') {
    m.elapsed+=Math.max(0,seconds);
    m.delay -= seconds;
    if (m.delay <= 0) {
      if (m.winner !== null) m.phase = 'over';
      else { m.turn = other(m.turn); m.phase = 'aim'; m.wind = Math.round((random(m) - .5) * 80); }
    }
    return;
  }
  if (m.phase !== 'flight' || !m.projectile) {m.elapsed+=elapsed;return;}
  let remaining = elapsed;
  while (remaining > 0 && m.projectile) {
    const dt = Math.min(remaining, TUNE.step); stepBall(m.projectile, m.wind, dt); remaining -= dt;m.elapsed+=dt;
    const hit = collision(m.projectile,m.terrain,birdPoses(m)); if (hit) resolveImpact(m, hit);
  }
  m.elapsed+=remaining;
  if (m.projectile) { m.projectile.trail.push({ x: m.projectile.x, y: m.projectile.y }); if (m.projectile.trail.length > 28) m.projectile.trail.shift(); }
}
export function preview(m: Match, seconds = .30, origin?: LaunchPose): Point[] {
  const p = makeProjectile(m.turn, m.angle[m.turn], m.power[m.turn], origin), points: Point[] = [];
  for (let t = 0; t < seconds; t += .065) { points.push({ x: p.x, y: p.y }); stepBall(p, m.wind, .065); }
  return points;
}
