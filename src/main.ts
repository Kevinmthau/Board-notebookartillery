import './style.css';
import { Board, BoardContactPhase, BoardContactType, BoardPlayerType, type BoardContact, type BoardPlayer } from '@board.fun/web-sdk';
import { clientToWorld, createSurface, gameAudio, gameFont, loadTitleFont, startInput } from './runtime';
import { drawTitle } from './title';
import { Splashes, Particles } from './fx';
import { loadPieceFootprints, pieceFootprint, type PieceFootprints } from './piece-footprints';
import { noteContacts, pickPlayer, registerAiTypes, seated, selectorOpen } from './seats';
import { advance, beginShot, clamp, createMatch, launchPoint, preview, TUNE, type Match, type Side } from './artillery';
import { CannonTracker, type CannonIdentity } from './cannons';
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
let setupLocked = false, continuing = false, resumeAt = -Infinity;
let pausedFingers: {x:number;y:number}[] = [];
const ignoredFingers = new Set<number>(), selectorPlacements = new Set<number>();
let saved: { version: number; match: Match; sides: {sessionId:number;side:Side}[] } | undefined;
const active = new Map<number, BoardContact>();
const unsupported = new Set<number>();
const gestures = new Map<number, { kind: 'angle' | 'power'; side: Side }>();
const PLAY: Box = {x:665,y:660,w:590,h:142};
const LEARN: Box = {x:740,y:830,w:440,h:120};
const PICK: Box = browser?{x:600,y:720,w:720,h:140}:{x:840,y:290,w:240,h:500};
const BACK: Box = { x: 64, y: 48, w: 200, h: 120 };
const HELP: Box = { x: 900, y: 210, w: 120, h: 120 };
const AGAIN: Box = browser?{x:530,y:680,w:420,h:140}:{x:790,y:210,w:150,h:660};
const SETUP: Box = browser?{x:980,y:680,w:420,h:140}:{x:980,y:210,w:150,h:660};
const inside = (p: { x: number; y: number }, b: Box) => p.x >= b.x && p.x <= b.x+b.w && p.y >= b.y && p.y <= b.y+b.h;
const seatFor = (side: Side) => seats.find(s => s.side === side);
const isAI = (side: Side) => seatFor(side)?.player.type === BoardPlayerType.AI;
const cannonFor = (side: Side) => tracker.identities.find(c => c.id === seatFor(side)?.cannon);
const hasCannon = (side: Side) => browser || isAI(side) || Boolean(cannonFor(side)?.present && cannonFor(side)?.legal);
const nameFor = (side: Side) => seatFor(side)?.player.name ?? (side === 0 ? 'Your tower' : 'Other tower');
const currentHuman = () => mode === 'play' && match.phase === 'aim' && !isAI(match.turn);
function cue(text: string, seconds = 2) { banner = text; bannerTime = seconds; }
function setMode(next: Mode) { mode = next; gestures.clear(); updateLabel(); }
function updateLabel() {
  canvas.setAttribute?.('aria-label', mode === 'play' ? `${nameFor(match.turn)}. ${match.phase}. Angle ${Math.round(match.angle[match.turn])} degrees. Power ${Math.round(match.power[match.turn])} percent. Tower health ${match.health.join(' to ')}. Arrow keys aim and power; Space fires.` : mode === 'over' ? `${nameFor(match.winner ?? 0)} wins. Rematch or change setup.` : `${BoardPlatform.game.name}. ${mode}.`);
}
function sound(kind: 'place' | 'fire' | 'hit' | 'miss' | 'win') {
  try {
    const {ctx:a, sfx} = gameAudio();
    const notes = kind === 'win' ? [440, 554, 660, 880] : [kind === 'fire' ? 150 : kind === 'hit' ? 95 : kind === 'place' ? 480 : 220];
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
  BoardPlatform.state.save({ version: 1, match, sides: seats.filter(s=>s.side!==null).map(s=>({sessionId:s.player.sessionId,side:s.side!})) });
  updateLabel();
}
function syncRoster() {
  const before = seats;
  seats = seated().slice(0,2).map(player => {
    const old = before.find(s=>s.player.sessionId===player.sessionId);
    return old ? {...old,player} : {player,side:null,cannon:null};
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
  const opponent=seats.find(s=>s.side===1) ?? seats[1];
  const selected=await pickPlayer([], opponent?.player.sessionId);if(selected)setupLocked=false;syncRoster();
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
function newMatch() { setupLocked=false;continuing=false;match=createMatch();aiPlan=null;aiDelay=0;lastTurn=-1;impactSerial=0;saved=undefined;setMode('play');persist(); }
function enterSetup() { setMode('setup');syncRoster(); }
function changeSetup() { setupLocked=true;continuing=false;saved=undefined;selectorPlacements.clear();seats.forEach(s=>{s.side=null;s.cannon=null;});enterSetup(); }
function shotOrigin() {
  const c=cannonFor(match.turn);
  let origin;
  if (!browser && c) {
    // Pose stays physical truth; launch outside this cannon's actual footprint.
    const p = active.get(c.contactId ?? -1), f=p?pieceFootprint(footprints,p):null;
    const a=match.angle[match.turn]*Math.PI/180, r=(f?.radiusPx??97)+16;
    origin={x:c.x+Math.cos(a)*r*(match.turn===0?1:-1),y:c.y-Math.sin(a)*r};
  }
  return origin;
}
function shoot() {
  if (!currentHuman() || !hasCannon(match.turn)) return;
  if (beginShot(match,undefined,undefined,shotOrigin())) { sound('fire');gestures.clear();persist(); }
}
function localControls(p:{x:number;y:number},side:Side) {
  if (browser) return p;
  // Rotate hit tests exactly as the seat's drawn control strip.
  return side===0 ? {x:p.y-540,y:120-p.x} : {x:540-p.y,y:p.x-1800};
}
function powerBox():Box {return browser?{x:700,y:886,w:660,h:146}:{x:-170,y:-70,w:350,h:140};}
function fireBox():Box {return browser?{x:1450,y:888,w:400,h:144}:{x:210,y:-70,w:240,h:140};}
function setPower(x:number) { const b=powerBox();match.power[match.turn]=Math.round(clamp(20+(x-b.x-32)/(b.w-64)*80,20,100));updateLabel(); }
function setAim(p:{x:number;y:number}) {
  const side=match.turn, dx=(p.x-TUNE.towerX[side])*(side===0?1:-1),dy=610-p.y;
  if (Math.hypot(dx,dy)<25) return;
  match.angle[side]=Math.round(clamp(Math.atan2(dy,Math.max(1,dx))*180/Math.PI,15,80)); updateLabel();
}
function press(p:{x:number;y:number},id:number) {
  if (!running || !ready || selectorOpen()) return;
  if (mode==='title') {
    if (inside(p,LEARN)) {previous='title';helpPage=0;setMode('help');}
    else if (inside(p,PLAY)) {
      if(saved) {continuing=true;match=saved.match;enterSetup();for(const s of saved.sides){const found=seats.find(p=>p.player.sessionId===s.sessionId);if(found)found.side=s.side;}}
      else enterSetup();
    }
    return;
  }
  if (mode==='setup') { if(inside(p,BACK))setMode('title');else if(inside(p,PICK))void selectOpponent();return; }
  if (mode==='help') { if(inside(p,BACK))setMode(previous);else if(inside(p,PICK)){helpPage++;if(helpPage>2)setMode(previous);}return; }
  if (mode==='over') {if(inside(p,AGAIN))newMatch();else if(inside(p,SETUP))changeSetup();return;}
  if (browser && inside(p,HELP)) {previous='play';helpPage=0;setMode('help');return;}
  if (!currentHuman()) return;
  const q=localControls(p,match.turn);
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
  if(g.kind==='angle')setAim(p);else setPower(localControls(p,g.side).x);
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
      if(mode==='title')enterSetup();
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
  if(arrivals.length&&mode==='title')enterSetup();
  for(const c of arrivals) {
    const p=active.get(c.contactId??-1),f=p?pieceFootprint(footprints,p):null;
    splashes.at(c.x,c.y,{inner:f?.radiusPx??97,color:colors[c.side??0],sound:()=>sound('place'),sparks:particles});
    if(c.side===null)cue('Place your cannon on a tower',3);
  }
  if(mode==='setup'||mode==='play'||mode==='over')bindCannons();
  if(mode==='setup') {
    if(now-rosterTime>700){syncRoster();rosterTime=now;}
    bindCannons();
    const emptyCannon=tracker.identities.find(c=>c.present&&c.legal&&!seats.some(s=>s.cannon===c.id)&&!selectorPlacements.has(c.id));
    if(!browser&&emptyCannon&&seats.length<2&&!selectorOpen()){selectorPlacements.add(emptyCannon.id);void selectOpponent();}
    if(!setupLocked&&seats.length===2&&seats.every(s=>s.side!==null)&&([0,1] as const).every(hasCannon)){
      if(continuing&&saved){match=saved.match;impactSerial=match.serial;continuing=false;saved=undefined;setMode('play');persist();}
      else newMatch();
    }
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
    const before=match.phase;advance(match,dt);
    if(match.impact&&match.impact.serial!==impactSerial){
      impactSerial=match.impact.serial;const hit=match.impact.kind==='hit';
      particles.burst(match.impact.x,match.impact.y,{count:hit?50:24,color:hit?'#ffcc63':'#b4ce78',speed:hit?390:210,life:1,gravity:480,size:12,glow:false});
      sound(hit?'hit':'miss');cue(hit?'Direct hit!':'Try a little more arc',1.1);persist();
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
function button(b:Box,label:string,fill=teal,enabled=true){ctx.save();ctx.globalAlpha=enabled?1:.45;round({...b,y:b.y+7},28,'#193d4933');round(b,28,fill);if(!browser&&b.h>250){for(const side of [0,1]){ctx.save();ctx.translate(b.x+b.w/2,b.y+b.h*(side===0?.28:.72));ctx.rotate(side===0?Math.PI/2:-Math.PI/2);text(label,0,0,40,fill===cream?ink:'#fffdf0');ctx.restore();}}else text(label,b.x+b.w/2,b.y+b.h/2,48,fill===cream?ink:'#fffdf0');ctx.restore();}
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
  if(browser){
    round({x:48,y:874,w:1824,h:166},32,'#fffbeaef');
    button({x:64,y:898,w:120,h:134},'−',cream,enabled);
    label('ANGLE',342,917);text(`${Math.round(match.angle[side])}°`,342,978,64,colors[side]);
    button({x:500,y:898,w:120,h:134},'+',cream,enabled);
  }else{
    ctx.translate(side===0?120:1800,540);ctx.rotate(side===0?Math.PI/2:-Math.PI/2);
    round({x:-450,y:-75,w:900,h:150},28,'#fffbeaee');
    label('ANGLE',-330,-38);text(`${Math.round(match.angle[side])}°`,-330,26,56,colors[side]);
    text(fit(nameFor(side),650),0,-125,48,colors[side]);
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
    const dots=preview(match,.43,shotOrigin());ctx.fillStyle=colors[match.turn];
    dots.forEach((p,i)=>{ctx.globalAlpha=.8-i*.085;ctx.beginPath();ctx.arc(p.x,p.y,7-i*.5,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
  }
  const p=match.projectile;
  if(p){
    ctx.lineCap='round';ctx.lineWidth=10;ctx.strokeStyle='#fffbeab0';ctx.beginPath();p.trail.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
    if(p.y<35){text('↑',clamp(p.x,400,1520),52,48,colors[match.turn]);}
    else{ctx.beginPath();ctx.arc(p.x,p.y,18,0,Math.PI*2);ctx.fillStyle='#153e50';ctx.fill();ctx.beginPath();ctx.arc(p.x-5,p.y-6,5,0,Math.PI*2);ctx.fillStyle='#adc8cb';ctx.fill();}
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
  if(!browser){
    ctx.fillStyle='#d9f3e8d8';ctx.fillRect(0,0,1920,1080);
    for(const side of [0,1] as const){ctx.save();ctx.translate(side===0?460:1460,540);ctx.rotate(side===0?Math.PI/2:-Math.PI/2);text('READY TO LOB?',0,-240,64);equipment(0,-80,190);text('Cannon goes on your tower.',0,80,40);text('Turn to aim. Tap power and Fire.',0,145,40);text(fit(nameFor(side),650),0,245,48,colors[side]);ctx.restore();}
    button(PICK,'PLAYERS');button(BACK,'BACK',cream);return;
  }
  ctx.fillStyle='#d9f3e8b8';ctx.fillRect(0,0,1920,1080);button(BACK,'BACK',cream);
  text('A cannon. A tower. A rival.',960,185,72);
  const human=seats[0];
  round({x:440,y:300,w:1040,h:380},36,cream);
  equipment(640,472,200);
  text(browser?'Your cannon does the aiming.':'Place a cannon on each tower.',1120,402,40);
  text(browser?'Drag to aim in the browser.':'Point forward. Turn to aim.',1120,468,40);
  text('Set power. Tap Fire.',1120,534,40);
  label(human?`${fit(human.player.name,450,32)} is ready`:'Waiting for Board players…',960,626,teal);
  button(PICK,'CHOOSE YOUR OPPONENT');
  if(!browser)for(const side of [0,1] as const)if(!hasCannon(side)){equipment(TUNE.towerX[side],590,140);}
  label('Save the Bloogs · 2 Cannon pieces',960,935);
}
function drawHelp(){
  if(!browser){
    ctx.fillStyle='#d9f3e8ed';ctx.fillRect(0,0,1920,1080);
    for(const side of [0,1]){ctx.save();ctx.translate(side===0?460:1460,540);ctx.rotate(side===0?Math.PI/2:-Math.PI/2);text(['TURN TO AIM','SET POWER','THREE HITS'][helpPage],0,-230,64);if(helpPage===0)equipment(0,-60,180);else drawHealth(0,0,-60);text(['Place your cannon. Turn it to aim.','Higher power sends a shot farther.','Take turns. Topple the other tower.'][helpPage],0,100,40);text(['Its first resting direction is your zero.','Watch the wind. Tap Fire to shoot.','Each direct hit breaks one heart.'][helpPage],0,180,32);ctx.restore();}
    button(PICK,helpPage<2?'NEXT':'DONE');button(BACK,'BACK',cream);return;
  }
  ctx.fillStyle='#d9f3e8e8';ctx.fillRect(0,0,1920,1080);button(BACK,'BACK',cream);
  const titles=['TURN TO AIM','SET YOUR POWER','THREE HITS. ONE WINNER.'];
  text(titles[helpPage],960,220,72);
  round({x:440,y:330,w:1040,h:330},36,cream);
  if(helpPage===0){equipment(625,480,190);text(browser?'Drag from your tower.':'Cannon goes on your tower.',1110,425,40);text(browser?'Use − / + to adjust the angle.':'Turn to change the arc.',1110,490,40);text('The dotted arc shows your aim.',1110,555,32);}
  if(helpPage===1){text('Higher power flies farther.',960,420,48);text('Watch the wind arrow before you fire.',960,500,40);text('Tap Fire when your aim feels right.',960,570,40);}
  if(helpPage===2){text('Take turns. Knock down the other tower.',960,420,48);drawHealth(0,960,510);text('Each direct hit breaks one heart.',960,590,40);}
  button(PICK,helpPage<2?'NEXT':previous==='play'?'BACK TO GAME':'GOT IT');label(`${helpPage+1} / 3`,960,934);
}
function drawResult(){
  if(!browser){
    ctx.fillStyle='#173e4866';ctx.fillRect(0,0,1920,1080);round({x:360,y:130,w:1200,h:820},40,cream);
    for(const side of [0,1]){ctx.save();ctx.translate(side===0?580:1340,540);ctx.rotate(side===0?Math.PI/2:-Math.PI/2);text('TOWER TOPPLED!',0,-100,48);text(fit(nameFor(match.winner??0),650,64),0,0,64,colors[match.winner??0]);text('WINS!',0,90,64,colors[match.winner??0]);ctx.restore();}
    button(AGAIN,'REMATCH');button(SETUP,'SETUP',coral);return;
  }
  ctx.fillStyle='#173e4866';ctx.fillRect(0,0,1920,1080);
  round({x:420,y:270,w:1080,h:600},42,cream);
  const winner=match.winner??0;
  label('TOWER TOPPLED!',960,330,colors[winner]);
  text(fit(`${nameFor(winner)} wins!`,950,80),960,437,80,colors[winner]);
  text(`${match.shots[winner]} shots. A glorious little victory.`,960,548,40);
  button(AGAIN,'REMATCH');button(SETUP,'NEW SETUP',coral);
  if(!browser){ctx.save();ctx.translate(960,575);ctx.rotate(Math.PI/2);text('WINNER',0,0,48,colors[winner]);ctx.restore();}
}
function draw(now:number){
  world.draw(ctx,simulationTime*1000,match,{title:mode==='title'});
  if(mode==='title')drawTitleScreen(now);
  else if(mode==='setup')drawSetup();
  else if(mode==='help')drawHelp();
  else{
    drawShots();
    if(browser){playerCard(0);playerCard(1);wind();if(mode==='play'){button(HELP,'?',cream);controls(match.turn);}}
    else{controls(0);controls(1);for(const side of [0,1] as const){ctx.save();ctx.translate(side===0?350:1570,220);ctx.rotate(side===0?Math.PI/2:-Math.PI/2);drawHealth(side,0,0);text(`WIND ${match.wind>=0?'→':'←'} ${Math.abs(match.wind)}`,0,75,48);ctx.restore();}}
    if(mode==='play'){
      if(!hasCannon(match.turn)&&!isAI(match.turn)) {ctx.save();ctx.strokeStyle=colors[match.turn];ctx.lineWidth=5;ctx.setLineDash([14,12]);ctx.beginPath();ctx.ellipse(TUNE.towerX[match.turn],610,86,38,0,0,Math.PI*2);ctx.stroke();ctx.restore();cue('Return your cannon to its tower',.2);}
      if(browser&&match.shots[0]+match.shots[1]===0) {round({x:670,y:760,w:580,h:72},24,'#fffbea');label('Drag from your tower to aim',960,796,teal);}
      if(bannerTime>0){round({x:580,y:370,w:760,h:100},30,'#fffbea');text(banner,960,420,48);}
    }
    if(mode==='over')drawResult();
  }
  particles.draw(ctx);splashes.draw(ctx);
  if(mode==='setup'&&bannerTime>0)text(banner,960,1030,48,coral);
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
  saved=BoardPlatform.state.load<typeof saved>();
  if(saved?.version!==1||!saved.match||saved.match.phase==='over')saved=undefined;
  BoardPlatform.state.onRestore(()=>{syncRoster();if(mode==='title'){saved=BoardPlatform.state.load<typeof saved>();if(saved?.version!==1)saved=undefined;}});
  BoardPlatform.menu.setButtons([{id:'help',title:'How to play',icon:'square'},{id:'restart',title:'Rematch',icon:'circular_arrow'},{id:'setup',title:'Change setup',icon:'left_arrow'}]);
  BoardPlatform.menu.onButton(id=>{if(id==='help'){previous=mode;helpPage=0;setMode('help');}if(id==='restart'){if(seats.length===2&&seats.every(s=>s.side!==null))newMatch();else enterSetup();}if(id==='setup')changeSetup();});
  ready=true;updateLabel();requestAnimationFrame(frame);
})().catch(error=>{console.error('Game could not start',error);ctx.fillStyle=cream;ctx.fillRect(0,0,1920,1080);text('Could not start. Please reload.',960,540,64);});
