import './style.css';
import { Board, BoardContactPhase, BoardContactType, BoardPlayerType, type BoardContact, type BoardPlayer } from '@board.fun/web-sdk';
import { clientToWorld, createSurface, gameAudio, gameFont, loadTitleFont, startInput } from './runtime';
import { drawTitle } from './title';
import { Splashes, Particles } from './fx';
import { frontPoint, loadPieceFootprints, pieceFootprint, type PieceFootprints } from './piece-footprints';
import { noteContacts, pickPlayer, registerAiTypes, seated, selectorOpen } from './seats';
import { advance, beginShot, clamp, createMatch, preview, TUNE, type Match, type Side } from './artillery';
import { CannonTracker } from './cannons';
import { chooseShot } from './opponent';
import { createWorld } from './world';

type Mode = 'title' | 'setup' | 'play' | 'help' | 'over';
type Seat = { player: BoardPlayer; side: Side | null; cannon: number | null };
type Box = { x: number; y: number; w: number; h: number };
const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ctx = createSurface(canvas);
const host = (window as unknown as { BoardSDK?: { __simulated?: boolean } }).BoardSDK;
const browser = host?.__simulated === true || !Board.isOnDevice;
const ink = '#153e50', cream = '#fffbea', teal = '#167f87', coral = '#cb5e53';
const colors = [teal, coral];
const tracker = new CannonTracker(), splashes = new Splashes(), particles = new Particles(180);
let footprints: PieceFootprints | null = null;
let world: ReturnType<typeof createWorld>;
let match = createMatch(), mode: Mode = 'title', previous: Mode = 'title';
let seats: Seat[] = [], ready = false, running = true, last = 0, rosterTime = -1000, simulationTime = 0;
let aiPlan: { angle: number; power: number } | null = null, aiDelay = 0, lastTurn = -1;
let impactSerial = 0, banner = '', bannerTime = 0, helpPage = 0, saveAt = 0;
let continuing = false, resumeAt = -Infinity;
let pausedFingers: {x:number;y:number}[] = [];
const ignoredFingers = new Set<number>();
let saved: { version: number; match: Match; sides: {sessionId:number;side:Side}[] } | undefined;
function loadSavedMatch() {
  const run=BoardPlatform.state.load<typeof saved>();
  return run?.version===2 && run.match?.terrain?.ridges && run.match.terrain.trees
    && run.match.birds && Number.isFinite(run.match.elapsed) && run.match.phase!=='over' ? run : undefined;
}
const active = new Map<number, BoardContact>();
const unsupported = new Set<number>();
const gestures = new Map<number, { kind: 'angle' | 'power'; side: Side }>();
const PLAY: Box = {x:665,y:660,w:590,h:142};
const LEARN: Box = {x:740,y:830,w:440,h:120};
const PICK: Box = {x:600,y:720,w:720,h:140};
const START: Box = {x:665,y:886,w:590,h:140};
const BACK: Box = { x: 64, y: 48, w: 200, h: 120 };
const AGAIN: Box = {x:530,y:680,w:420,h:140};
const SETUP: Box = {x:980,y:680,w:420,h:140};
const inside = (p: { x: number; y: number }, b: Box) => p.x >= b.x && p.x <= b.x+b.w && p.y >= b.y && p.y <= b.y+b.h;
const seatFor = (side: Side) => seats.find(s => s.side === side);
const isAI = (side: Side) => seatFor(side)?.player.type === BoardPlayerType.AI;
const cannonFor = (side: Side) => tracker.identities.find(c => c.id === seatFor(side)?.cannon);
const hasCannon = (side: Side) => browser || isAI(side) || Boolean(cannonFor(side)?.present && cannonFor(side)?.legal && cannonFor(side)?.side===side);
const nameFor = (side: Side) => seatFor(side)?.player.name ?? (side === 0 ? 'Your tower' : 'Other tower');
const currentHuman = () => mode === 'play' && match.phase === 'aim' && !isAI(match.turn);
const canStart = () => ready && !selectorOpen() && seats.length === 2 && new Set(seats.map(s=>s.side)).size === 2 && seats.every(s=>s.side!==null && hasCannon(s.side));
function cue(text: string, seconds = 2) { banner = text; bannerTime = seconds; }
function setMode(next: Mode) { mode = next; gestures.clear(); updateLabel(); }
function updateLabel() {
  canvas.setAttribute?.('aria-label', mode === 'play' ? `${nameFor(match.turn)}. ${match.phase}. Angle ${Math.round(match.angle[match.turn])} degrees. Power ${Math.round(match.power[match.turn])} percent. Tower health ${match.health.join(' to ')}. Arrow keys aim and power; Space fires.` : mode === 'over' ? `${nameFor(match.winner ?? 0)} wins. Rematch or change setup.` : `${BoardPlatform.game.name}. ${mode}.`);
}
function sound(kind: 'place' | 'fire' | 'hit' | 'miss' | 'bird' | 'win') {
  try {
    const {ctx:a, sfx} = gameAudio();
    const notes = kind === 'win' ? [440, 554, 660, 880] : kind === 'bird' ? [850, 1200] : [kind === 'fire' ? 150 : kind === 'hit' ? 95 : kind === 'place' ? 480 : 220];
    notes.forEach((freq,i) => {
      const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+i*.12;
      o.type=kind==='hit'?'triangle':'sine'; o.frequency.setValueAtTime(freq,t);
      o.frequency.exponentialRampToValueAtTime(kind==='fire'?45:freq*.7,t+.2);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+.28);
      o.connect(g);g.connect(sfx);o.start(t);o.stop(t+.3);
    });
  } catch { /* Browser audio remains optional when the output device is unavailable. */ }
}
function persist() {
  if (mode !== 'play' && mode !== 'over') return;
  BoardPlatform.state.save({ version: 2, match, sides: seats.filter(s=>s.side!==null).map(s=>({sessionId:s.player.sessionId,side:s.side!})) });
  updateLabel();
}
function syncRoster() {
  const before = seats;
  seats = seated().slice(0,2).map(player => {
    const old = before.find(s=>s.player.sessionId===player.sessionId);
    return old ? {...old,player,cannon:player.type===BoardPlayerType.AI?null:old.cannon} : {player,side:null,cannon:null};
  });
  // Browser pointer controls use the same roster, with the two screen positions assigned in order.
  if (browser) seats.forEach((s,i)=>{s.side=i as Side;});
  for (const s of seats) if (s.player.type === BoardPlayerType.AI && s.side === null)
    s.side = ([1,0] as const).find(side=>!seats.some(other=>other.side===side)) ?? null;
  bindCannons();
  if (mode === 'play' && seats.length < 2) { setMode('setup'); cue('Choose two players'); }
}
async function selectOpponent() {
  if (selectorOpen()) return;
  // A lone player may own either tower. Add the second player before offering replacement.
  const opponent=seats.length===2?seats[1]:undefined;
  await pickPlayer([], opponent?.player.sessionId);syncRoster();
}
function bindCannons() {
  for (const c of tracker.identities) {
    if (!c.present || c.side === null || !c.legal) continue;
    let seat=seats.find(s=>s.cannon===c.id);
    if (seat) continue;
    seat=seats.find(s=>s.side===c.side && s.player.type!==BoardPlayerType.AI && (!cannonFor(c.side!)?.present));
    seat ??= mode === 'setup' ? seats.find(s=>s.side===null && s.player.type!==BoardPlayerType.AI) : undefined;
    if (seat && !seats.some(s=>s!==seat && s.side===c.side)) { seat.side=c.side;seat.cannon=c.id; }
  }
}
function newMatch() { continuing=false;match=createMatch();aiPlan=null;aiDelay=0;lastTurn=-1;impactSerial=0;saved=undefined;setMode('play');persist(); }
function enterSetup() { setMode('setup');syncRoster(); }
function openMatchSetup() {
  if(saved){
    continuing=true;match=saved.match;
    for(const s of seats){s.side=saved.sides.find(p=>p.sessionId===s.player.sessionId)?.side??null;s.cannon=null;}
  }
  enterSetup();
}
function changeSetup() { continuing=false;saved=undefined;seats.forEach(s=>{s.side=null;s.cannon=null;});enterSetup(); }
function startMatch() {
  syncRoster();
  if(!canStart())return;
  if(continuing&&saved){match=saved.match;impactSerial=match.serial;aiPlan=null;aiDelay=0;lastTurn=-1;continuing=false;saved=undefined;setMode('play');persist();}
  else newMatch();
}
function shotPose() {
  if (browser) return;
  const c=cannonFor(match.turn);
  const p=active.get(c?.contactId??-1);
  // Position and direction come from the same physical barrel pose.
  // Keep the tracker's known glyph through a brief glyph-zero reading.
  const f=c&&p?pieceFootprint(footprints,{...p,glyphId:c.glyphId}):null;
  return f?{...frontPoint(f,TUNE.ballRadius+1),facingDeg:f.facingDeg}:undefined;
}
function shoot() {
  if (!currentHuman() || !hasCannon(match.turn)) return;
  if (beginShot(match,undefined,undefined,shotPose())) { sound('fire');gestures.clear();persist(); }
}
function powerBox():Box {return {x:700,y:886,w:660,h:146};}
function fireBox():Box {return {x:1450,y:888,w:400,h:144};}
function setPower(x:number) { const b=powerBox();match.power[match.turn]=Math.round(clamp(20+(x-b.x-32)/(b.w-64)*80,20,100));updateLabel(); }
function setAim(p:{x:number;y:number}) {
  const side=match.turn, dx=(p.x-TUNE.towerX[side])*(side===0?1:-1),dy=TUNE.cannonY-p.y;
  if (Math.hypot(dx,dy)<25) return;
  match.angle[side]=Math.round(clamp(Math.atan2(dy,Math.max(1,dx))*180/Math.PI,15,80)); updateLabel();
}
function press(p:{x:number;y:number},id:number) {
  if (!running || !ready || selectorOpen()) return;
  if (mode==='title') {
    if (inside(p,LEARN)) {previous='title';helpPage=0;setMode('help');}
    else if (inside(p,PLAY)) openMatchSetup();
    return;
  }
  if (mode==='setup') { if(inside(p,BACK))setMode('title');else if(inside(p,PICK))void selectOpponent();else if(inside(p,START))startMatch();return; }
  if (mode==='help') { if(inside(p,BACK))setMode(previous);else if(inside(p,PICK)){helpPage++;if(helpPage>2)setMode(previous);}return; }
  if (mode==='over') {if(inside(p,AGAIN))newMatch();else if(inside(p,SETUP))changeSetup();return;}
  if (!currentHuman()) return;
  const q=p;
  if (inside(q,fireBox())) {shoot();return;}
  if (inside(q,powerBox())) {setPower(q.x);gestures.set(id,{kind:'power',side:match.turn});return;}
  if (browser) {
    if(inside(q,{x:64,y:898,w:120,h:134})) {match.angle[match.turn]=clamp(match.angle[match.turn]-5,15,80);updateLabel();return;}
    if(inside(q,{x:500,y:898,w:120,h:134})) {match.angle[match.turn]=clamp(match.angle[match.turn]+5,15,80);updateLabel();return;}
    if(p.y<865) {setAim(p);gestures.set(id,{kind:'angle',side:match.turn});}
  }
}
function move(p:{x:number;y:number},id:number) {
  const g=gestures.get(id);if(!g||!currentHuman()||g.side!==match.turn)return;
  if(g.kind==='angle')setAim(p);else setPower(p.x);
}
canvas.addEventListener('pointerdown',e=>{
  if(!browser||e.shiftKey)return;
  canvas.setPointerCapture?.(e.pointerId);press(clientToWorld(canvas,e.clientX,e.clientY),e.pointerId);
});
canvas.addEventListener('pointermove',e=>{if(browser)move(clientToWorld(canvas,e.clientX,e.clientY),e.pointerId);});
canvas.addEventListener('pointerup',e=>{gestures.delete(e.pointerId);persist();});
canvas.addEventListener('pointercancel',e=>gestures.delete(e.pointerId));
window.addEventListener('keydown',e=>{
  if(!running||selectorOpen()||!browser)return;
  if(e.key==='Enter'&&mode==='title'){press({x:PLAY.x+50,y:PLAY.y+50},-1);return;}
  if(!currentHuman())return;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();
  if(e.key===' ')shoot();
  if(e.key==='ArrowLeft')match.angle[match.turn]=clamp(match.angle[match.turn]-1,15,80);
  if(e.key==='ArrowRight')match.angle[match.turn]=clamp(match.angle[match.turn]+1,15,80);
  if(e.key==='ArrowUp')match.power[match.turn]=clamp(match.power[match.turn]+1,20,100);
  if(e.key==='ArrowDown')match.power[match.turn]=clamp(match.power[match.turn]-1,20,100);
  updateLabel();
});
startInput((batch,contacts)=>{
  noteContacts(batch);active.clear();
  for(const c of contacts.values()) {
    const p=browser?clientToWorld(canvas,c.x,c.y):c;
    active.set(c.contactId,{...c,x:p.x,y:p.y});
  }
  for(const c of batch) {
    const p=browser?clientToWorld(canvas,c.x,c.y):c;
    if(c.type===BoardContactType.Glyph&&c.glyphId!==2&&c.phase===BoardContactPhase.Began&&!unsupported.has(c.contactId)) {
      unsupported.add(c.contactId);splashes.at(p.x,p.y,{inner:65,color:'#f2c85f'});cue('Use the Bloogs cannon',1.5);
      if(mode==='title')openMatchSetup();
    }
    if(c.phase===BoardContactPhase.Ended||c.phase===BoardContactPhase.Canceled)unsupported.delete(c.contactId);
    if(!browser&&c.type===BoardContactType.Finger) {
      if(c.phase===BoardContactPhase.Began && performance.now()-resumeAt<2000 && pausedFingers.some(p=>Math.hypot(p.x-c.x,p.y-c.y)<120)) ignoredFingers.add(c.contactId);
      if(ignoredFingers.has(c.contactId)){if(c.phase===BoardContactPhase.Ended||c.phase===BoardContactPhase.Canceled){ignoredFingers.delete(c.contactId);pausedFingers=pausedFingers.filter(p=>Math.hypot(p.x-c.x,p.y-c.y)>=120);}continue;}
      if(c.phase===BoardContactPhase.Began)press(p,c.contactId);
      else if(c.phase===BoardContactPhase.Moved)move(p,c.contactId);
      else if(c.phase===BoardContactPhase.Ended||c.phase===BoardContactPhase.Canceled){gestures.delete(c.contactId);persist();}
    }
  }
},()=>{pausedFingers=[...active.values()].filter(c=>c.type===BoardContactType.Finger).map(c=>({x:c.x,y:c.y}));tracker.paused(performance.now());active.clear();gestures.clear();});

function update(now:number,dt:number) {
  simulationTime+=dt;
  const arrivals=tracker.update(active,now,footprints);
  if(arrivals.length&&mode==='title')openMatchSetup();
  for(const c of arrivals) {
    const p=active.get(c.contactId??-1),f=p?pieceFootprint(footprints,p):null;
    splashes.at(c.x,c.y,{inner:f?.radiusPx??97,color:colors[c.side??0],sound:()=>sound('place'),sparks:particles});
    if(c.side===null)cue('Place your cannon on a tower',3);
  }
  if(mode==='setup'||mode==='play'||mode==='over')bindCannons();
  if(mode==='setup') {
    if(now-rosterTime>700){syncRoster();rosterTime=now;}
    bindCannons();
  }
  if(mode==='play') {
    if(!browser&&match.phase==='aim'&&!isAI(match.turn)) {
      const c=cannonFor(match.turn);if(c?.present&&c.legal)match.angle[match.turn]=c.angle;
    }
    const key=match.shots[0]+match.shots[1];
    if(match.phase==='aim'&&isAI(match.turn)) {
      if(key!==lastTurn){lastTurn=key;aiPlan=chooseShot(match);aiDelay=1.7;}
      if(aiPlan){const k=1-Math.exp(-dt*4);match.angle[match.turn]+=(aiPlan.angle-match.angle[match.turn])*k;match.power[match.turn]+=(aiPlan.power-match.power[match.turn])*k;}
      aiDelay-=dt;
      if(aiDelay<=0&&aiPlan&&seats.every(s=>s.side!==null&&hasCannon(s.side))) {beginShot(match,aiPlan.angle,aiPlan.power);sound('fire');persist();}
    }
    const before=match.phase,terrainBefore=match.terrain.revision;advance(match,dt);
    if(match.impact&&match.impact.serial!==impactSerial){
      impactSerial=match.impact.serial;const hit=match.impact.kind==='hit',bird=match.impact.kind==='bird';
      particles.burst(match.impact.x,match.impact.y,{count:hit?50:bird?12:32,color:hit?'#ffcc63':bird?'#fffbea':match.impact.kind==='tree'?'#8fc573':'#c7a16b',speed:hit?390:bird?120:250,life:1,gravity:bird?50:480,size:bird?6:10,glow:false});
      sound(hit?'hit':bird?'bird':'miss');cue(hit?'Direct hit!':bird?'Bird blocked it!':match.impact.kind==='tree'?'Timber!':match.impact.kind==='ground'?(match.terrain.revision>terrainBefore?'New crater!':'Ground hit!'):'Just missed!',1.1);persist();
    }
    if(before!==match.phase)persist();
    if(match.phase==='over'){setMode('over');sound('win');persist();}
    if(now-saveAt>700){persist();saveAt=now;}
  }
  bannerTime-=dt;splashes.update(dt);particles.update(dt);
}

function round(b:Box,r=28,fill=cream,stroke?:string){ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.lineWidth=3;ctx.strokeStyle=stroke;ctx.stroke();}}
function text(t:string,x:number,y:number,size=48,color=ink,align:CanvasTextAlign='center') {ctx.font=gameFont(size);ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(t,x,y);}
function fit(t:string,width:number,size=48){ctx.font=gameFont(size);while(t.length&&ctx.measureText(t).width>width)t=t.slice(0,-2)+'…';return t;}
function button(b:Box,label:string,fill=teal,enabled=true){ctx.save();ctx.globalAlpha=enabled?1:.45;round({...b,y:b.y+7},28,'#193d4933');round(b,28,fill);text(label,b.x+b.w/2,b.y+b.h/2,48,fill===cream?ink:'#fffdf0');ctx.restore();}
function label(t:string,x:number,y:number,color=ink){text(t,x,y,32,color);}
function heart(x:number,y:number,full:boolean,color:string){ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.moveTo(0,15);ctx.bezierCurveTo(-40,-8,-18,-36,0,-17);ctx.bezierCurveTo(18,-36,40,-8,0,15);ctx.fillStyle=full?color:'#d6ddce';ctx.fill();ctx.restore();}
function drawHealth(side:Side,x:number,y:number){for(let i=0;i<3;i++)heart(x+(i-1)*57,y,match.health[side]>i,colors[side]);}
function wind(){
  round({x:778,y:48,w:364,h:134},30,'#fffbeaee');
  label('WIND',960,80,'#66888a');
  const dir=match.wind>=0?1:-1;
  ctx.strokeStyle=ink;ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(920-dir*42,132);ctx.lineTo(920+dir*42,132);ctx.lineTo(920+dir*25,117);ctx.moveTo(920+dir*42,132);ctx.lineTo(920+dir*25,147);ctx.stroke();
  text(String(Math.abs(match.wind)),1042,132,48);
}
function playerCard(side:Side){
  const x=side===0?64:1356,b={x,y:48,w:500,h:150},activeSide=match.turn===side;
  round(b,30,activeSide?'#fffbea':'#fffbeacc',activeSide?colors[side]:undefined);
  text(fit(nameFor(side),300),x+36,91,48,ink,'left');
  for(let i=0;i<3;i++)heart(x+60+i*57,154,match.health[side]>i,colors[side]);
  label(isAI(side)?'COMPUTER':activeSide?'YOUR TURN':'READY',x+370,154,colors[side]);
}
function controls(side:Side){
  const enabled=match.phase==='aim'&&match.turn===side&&!isAI(side),readyToFire=enabled&&hasCannon(side);
  ctx.save();
  round({x:48,y:874,w:1824,h:166},32,'#fffbeaef');
  label(browser?'ANGLE':'TURN TO AIM',342,917);text(`${Math.round(match.angle[side])}°`,342,978,64,colors[side]);
  if(browser){
    button({x:64,y:898,w:120,h:134},'−',cream,enabled);
    button({x:500,y:898,w:120,h:134},'+',cream,enabled);
  }
  const b=powerBox(),fire=fireBox();
  label('POWER',b.x+b.w/2,b.y+30);
  const trackY=b.y+100,lo=b.x+32,hi=b.x+b.w-32,f=(match.power[side]-20)/80;
  ctx.strokeStyle='#d7e3d3';ctx.lineWidth=20;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(lo,trackY);ctx.lineTo(hi,trackY);ctx.stroke();
  ctx.strokeStyle=colors[side];ctx.beginPath();ctx.moveTo(lo,trackY);ctx.lineTo(lo+(hi-lo)*f,trackY);ctx.stroke();
  ctx.beginPath();ctx.arc(lo+(hi-lo)*f,trackY,25,0,Math.PI*2);ctx.fillStyle=cream;ctx.fill();ctx.lineWidth=5;ctx.stroke();
  text(`${Math.round(match.power[side])}%`,b.x+b.w-40,b.y+30,48,colors[side],'right');
  button(fire,isAI(side)?'AIMING':match.phase==='flight'?'FLYING':match.phase==='settle'?'…':hasCannon(side)?'FIRE!':'RETURN',colors[side],readyToFire);
  ctx.restore();
}
function drawShots(){
  if(match.phase==='aim'&&(browser||hasCannon(match.turn))){
    const dots=preview(match,.30,shotPose());ctx.fillStyle=colors[match.turn];
    dots.forEach((p,i)=>{ctx.globalAlpha=.8-i*.12;ctx.beginPath();ctx.arc(p.x,p.y,5-i*.5,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
  }
  const p=match.projectile;
  if(p){
    ctx.lineCap='round';ctx.lineWidth=6;ctx.strokeStyle='#fffbeab0';ctx.beginPath();p.trail.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
    if(p.y<35){text('↑',clamp(p.x,400,1520),52,48,colors[match.turn]);}
    else{ctx.beginPath();ctx.arc(p.x,p.y,TUNE.ballRadius,0,Math.PI*2);ctx.fillStyle='#153e50';ctx.fill();ctx.beginPath();ctx.arc(p.x-3,p.y-3,3,0,Math.PI*2);ctx.fillStyle='#adc8cb';ctx.fill();}
  }
}
let pieceImage: HTMLImageElement|null=null;
if(typeof Image!=='undefined'){pieceImage=new Image();pieceImage.src='piece-art/2.png';}
function equipment(x:number,y:number,size=170){if(pieceImage?.complete&&pieceImage.naturalWidth)ctx.drawImage(pieceImage,x-size/2,y-size/2,size,size);}
function drawTitleScreen(now:number){
  // One shared title faces the landscape on Board and in the browser.
  ctx.fillStyle='#eefaf118';ctx.fillRect(0,0,1920,1080);
  round({x:620,y:118,w:680,h:68},34,'#fffbea');label('A LITTLE AIM. A BIG KABOOM.',960,153,teal);
  drawTitle(ctx,{x:130,y:210,width:1660,height:430},{ink});
  button(PLAY,saved?'CONTINUE':'PLAY');
  button(LEARN,'HOW TO PLAY',cream);
  label('2 PLAYERS  /  SOLO VS PIP',960,1002,ink);
}
function drawSetup(){
  ctx.fillStyle='#d9f3e8b8';ctx.fillRect(0,0,1920,1080);button(BACK,'BACK',cream);
  text('READY TO LOB?',960,185,72);
  for(const side of [0,1] as const){
    const x=side===0?64:1356,seat=seatFor(side);
    round({x,y:275,w:500,h:220},30,cream);
    label(side===0?'LEFT TOWER':'RIGHT TOWER',x+250,312,colors[side]);
    text(fit(seat?.player.name??(browser?'Choose a player':'Place your cannon'),440),x+250,371,48,colors[side]);
    text(isAI(side)?'Pip is ready':seat&&hasCannon(side)?'Ready!':browser?'Choose a player':'Cannon goes here ↓',x+250,441,40);
  }
  round({x:620,y:275,w:680,h:350},32,cream);
  text(browser?'Drag from your tower to aim.':'Put real cannons on the towers.',960,335,40);
  text(browser?'Or use the − / + buttons.':'Turn your cannon to aim.',960,403,40);
  text('Set power. Tap Fire.',960,471,40);
  label(`${seats.length} / 2 PLAYERS CHOSEN`,960,535,teal);
  label(fit(seats.map(s=>s.player.name).join('  +  ')||'Choose your players below',610,32),960,585);
  const missing=([0,1] as const).filter(side=>!hasCannon(side)||!seatFor(side));
  const next=seats.length<2?'Choose '+(seats.length?'your opponent':'your first player'):
    canStart()?'All set. Tap Start Game.':browser?'Choose your players':
    missing.length===2?'Place a cannon on each tower':`Place a cannon on the ${missing[0]===0?'left':'right'} tower`;
  text(next,960,669,40,teal);
  button(PICK,seats.length<2?(seats.length?'CHOOSE YOUR OPPONENT':'CHOOSE A PLAYER'):'CHANGE OPPONENT',cream);
  button(START,continuing?'CONTINUE GAME':'START GAME',teal,canStart());
}
function drawHelp(){
  ctx.fillStyle='#d9f3e8e8';ctx.fillRect(0,0,1920,1080);button(BACK,'BACK',cream);
  const titles=['TURN TO AIM','SET YOUR POWER','THREE HITS. ONE WINNER.'];
  text(titles[helpPage],960,220,72);
  round({x:440,y:330,w:1040,h:330},36,cream);
  if(helpPage===0){equipment(625,480,190);text(browser?'Drag from your tower.':'Cannon goes on your tower.',1110,425,40);text(browser?'Use − / + to adjust the angle.':'Turn to change the arc.',1110,490,40);text('The dotted arc shows your aim.',1110,555,32);}
  if(helpPage===1){text('A new valley every game.',960,392,48);text('Lob over hills and treetops.',960,458,40);text('Shots dig craters and knock down trees.',960,522,40);text('Watch the wind and passing birds!',960,588,40);}
  if(helpPage===2){text('Take turns. Knock down the other tower.',960,420,48);drawHealth(0,960,510);text('Each direct hit breaks one heart.',960,590,40);}
  button(PICK,helpPage<2?'NEXT':previous==='play'?'BACK TO GAME':'GOT IT');label(`${helpPage+1} / 3`,960,934);
}
function drawResult(){
  ctx.fillStyle='#173e4866';ctx.fillRect(0,0,1920,1080);
  round({x:420,y:270,w:1080,h:600},42,cream);
  const winner=match.winner??0;
  label('TOWER TOPPLED!',960,330,colors[winner]);
  text(fit(`${nameFor(winner)} wins!`,950,80),960,437,80,colors[winner]);
  text(`${match.shots[winner]} shots. A glorious little victory.`,960,548,40);
  button(AGAIN,'REMATCH');button(SETUP,'NEW SETUP',coral);
}
function draw(now:number){
  world.draw(ctx,simulationTime*1000,match,{title:mode==='title'});
  if(mode==='title')drawTitleScreen(now);
  else if(mode==='setup')drawSetup();
  else if(mode==='help')drawHelp();
  else{
    drawShots();
    playerCard(0);playerCard(1);wind();if(mode==='play')controls(match.turn);
    if(mode==='play'){
      if(!hasCannon(match.turn)&&!isAI(match.turn)) {ctx.save();ctx.strokeStyle=colors[match.turn];ctx.lineWidth=5;ctx.setLineDash([14,12]);ctx.beginPath();ctx.ellipse(TUNE.towerX[match.turn],TUNE.cannonY,86,38,0,0,Math.PI*2);ctx.stroke();ctx.restore();cue('Return your cannon to its tower',.2);}
      if(browser&&match.shots[0]+match.shots[1]===0) {round({x:670,y:760,w:580,h:72},24,'#fffbea');label('Drag from your tower to aim',960,796,teal);}
      if(bannerTime>0){round({x:580,y:370,w:760,h:100},30,'#fffbea');text(banner,960,420,48);}
    }
    if(mode==='over')drawResult();
  }
  particles.draw(ctx);splashes.draw(ctx);
  if(mode==='setup'&&bannerTime>0){round({x:580,y:630,w:760,h:78},24,cream);text(banner,960,669,40,coral);}
}
const frame=(now:number)=>{if(!running)return;const dt=Math.min(.05,last?(now-last)/1000:0);last=now;update(now,dt);draw(now);requestAnimationFrame(frame);};
if(Board.isOnDevice){
  Board.application.onPause(()=>{running=false;gestures.clear();persist();});
  Board.application.onResume(()=>{resumeAt=performance.now();tracker.resumed(performance.now());if(!running){running=true;last=0;requestAnimationFrame(frame);}});
}
// Paint the world immediately while platform services and bundled fonts become ready.
world=createWorld();draw(0);
void(async()=>{
  await BoardPlatform.state.ready();
  registerAiTypes([{name:'Pip',description:'A cheerful rival with a good aim and the occasional miss.'}]);syncRoster();
  if(Board.isOnDevice)Board.session.onPlayersChanged(syncRoster);
  [footprints]=await Promise.all([loadPieceFootprints(),loadTitleFont()]);
  saved=loadSavedMatch();
  BoardPlatform.state.onRestore(()=>{syncRoster();if(mode==='title')saved=loadSavedMatch();});
  BoardPlatform.menu.setButtons([{id:'help',title:'How to play',icon:'square'},{id:'restart',title:'Rematch',icon:'circular_arrow'},{id:'setup',title:'Change setup',icon:'left_arrow'}]);
  BoardPlatform.menu.onButton(id=>{if(id==='help'){if(mode!=='help')previous=mode;helpPage=0;setMode('help');}if(id==='restart'){if(seats.length===2&&seats.every(s=>s.side!==null))newMatch();else enterSetup();}if(id==='setup')changeSetup();});
  ready=true;updateLabel();requestAnimationFrame(frame);
})().catch(error=>{console.error('Game could not start',error);ctx.fillStyle=cream;ctx.fillRect(0,0,1920,1080);text('Could not start. Please reload.',960,540,64);});
