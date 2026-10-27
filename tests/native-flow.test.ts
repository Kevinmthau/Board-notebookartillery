// Native integration evidence: real main.ts with the OS services and canvas stood in.
// No simulator marker is installed, and no game state is changed through a debug hook.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Board, BoardContactPhase, BoardContactType, BoardPlayerType, type BoardContact, type BoardPlayer } from '@board.fun/web-sdk';
import type { Match, Side } from '../src/artillery';

const g = globalThis as unknown as Record<string, unknown>;
let aria = '', now = 1000, raf: ((time: number) => void) | null = null;
let saved: { version: number; match: Match; sides: {sessionId:number;side:Side}[] } | undefined;
let loaded: typeof saved;
let restore: (() => void) | undefined;
let menu: ((id: string) => void) | undefined;
let contactSink: ((batch: readonly BoardContact[]) => void) | null = null;
const pauses: (() => void)[] = [], resumes: (() => void)[] = [];
const errors: unknown[] = [];
const draws: string[] = [];
const listeners = new Map<string, ((e: unknown) => void)[]>();
const listen = (type: string, callback: (e: unknown) => void) => listeners.set(type, [...(listeners.get(type) ?? []), callback]);
const context = () => new Proxy({} as Record<string, unknown>, {
  get(state, key) {
    if (key in state) return state[key as string];
    if (key === 'canvas') return { width: 1920, height: 1080 };
    return (...args: unknown[]) => {
      if (key === 'fillText') draws.push(String(args[0]));
      if (key === 'measureText') {
        const width = String(args[0]).length * .55 * (parseFloat(String(state.font)) || 32);
        return { width, actualBoundingBoxAscent: 30, actualBoundingBoxDescent: 8, actualBoundingBoxLeft: 0, actualBoundingBoxRight: width };
      }
      if (key === 'getTransform') return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
      return { addColorStop() {} };
    };
  },
  set(state, key, value) { state[key as string] = value; return true; },
});
const canvas = () => ({ width: 1920, height: 1080, style: {}, getContext: context,
  addEventListener: listen, removeEventListener() {}, setAttribute(name: string, value: string) { if (name === 'aria-label') aria = value; },
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1920, height: 1080, right: 1920, bottom: 1080 }),
});
const param = () => ({ value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
const audioNode = () => ({ connect() {}, disconnect() {}, start() {}, stop() {}, gain: param(), frequency: param(), detune: param(), Q: param() });
Object.defineProperty(performance, 'now', { value: () => now, configurable: true });
g.requestAnimationFrame = (callback: (time: number) => void) => { raf = callback; return 1; };
g.cancelAnimationFrame = () => { raf = null; };
g.document = { title: 'Native flow test', hidden: false, fonts: { add() {}, size: 0, ready: Promise.resolve() },
  querySelector: canvas, createElement: canvas, addEventListener: listen, removeEventListener() {} };
g.FontFace = class { load() { return Promise.resolve(this); } };
g.AudioContext = class {
  state = 'running'; sampleRate = 48000; currentTime = 0; destination = {};
  createGain() { return audioNode(); } createOscillator() { return audioNode(); } createBiquadFilter() { return audioNode(); }
  createBufferSource() { return audioNode(); }
  createBuffer(_ch: number, length: number, sampleRate: number) { return { length, sampleRate, getChannelData: () => new Float32Array(length) }; }
  decodeAudioData() { return Promise.resolve(this.createBuffer(1, 1, 48000)); }
  addEventListener() {} resume() { return Promise.resolve(); } suspend() { return Promise.resolve(); }
};
g.fetch = async (url: string) => {
  try {
    const body = readFileSync(`public/${String(url).split('?')[0].replace(/^\.?\//, '')}`);
    return { ok: true, status: 200, json: async () => JSON.parse(body.toString()), text: async () => body.toString(), arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) };
  } catch { return { ok: false, status: 404, json: async () => { throw new Error('404'); }, text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) }; }
};
g.window = { BoardSDK: {}, addEventListener: listen, removeEventListener() {}, devicePixelRatio: 1 };
g.BoardPlatform = {
  version: 'test', source: 'bundle', game: { name: 'Native flow test', appId: 'test' },
  state: { ready: async () => ({ restored: false }), load: () => loaded,
    save: (value: unknown) => { saved = JSON.parse(JSON.stringify(value)); }, clear() {},
    onRestore: (callback: () => void) => { restore = callback; return () => {}; }, progress: { get: (_key: string, value: unknown) => value, set() {}, all: () => ({}) },
  },
  audio: { bindBuses() {}, levels: () => ({ music: 70, sfx: 90, muted: false }), onChange: () => () => {} },
  menu: { setButtons() {}, onButton: (callback: (id: string) => void) => { menu = callback; return () => {}; } },
};
const patch = (target: unknown, fields: Record<string, unknown>) => Object.assign(target as Record<string, unknown>, fields);
patch(Board.input, { subscribe: (callback: typeof contactSink) => { contactSink = callback; }, unsubscribe() {}, getActiveModel: () => 'model.dla' });
patch(Board.application, {
  onPause: (callback: () => void) => { pauses.push(callback); return () => {}; },
  onResume: (callback: () => void) => { resumes.push(callback); return () => {}; },
});
const alice = { playerId: 'native-alice', sessionId: 1, name: 'Alice', type: BoardPlayerType.Profile, avatarId: '0' } as BoardPlayer;
const bob = { playerId: 'native-bob', sessionId: 2, name: 'Bob', type: BoardPlayerType.Guest, avatarId: '0' } as BoardPlayer;
const pip = { playerId: 'native-pip', sessionId: 3, name: 'Pip', type: BoardPlayerType.AI, avatarId: '0', aiTypeIndex: 0 } as BoardPlayer;
const players: BoardPlayer[] = [alice];
const rosterChanged: (() => void)[] = [];
const selections: { replace?: number; answer: (selected: boolean) => void }[] = [];
function selector(replace?: number) {
  return new Promise<boolean>(answer => selections.push({ replace, answer }));
}
patch(Board.session, { areServicesReady: () => true, isReady: () => true,
  getPlayers: () => players, getPlayerCount: () => players.length, getActiveProfile: () => ({ ...players[0], sessionId: -1 }),
  onPlayersChanged: (callback: () => void) => { rosterChanged.push(callback); return () => {}; }, onActiveProfileChanged: () => () => {}, setAIPlayerTypes() {},
  presentAddPlayer: () => selector(), presentReplacePlayer: (sessionId: number) => selector(sessionId),
});
process.on('uncaughtException', error => errors.push(error));
process.on('unhandledRejection', error => errors.push(error));
function run(seconds: number) {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    now += 1000 / 60;
    const callback = raf; raf = null;
    if (!callback) continue;
    draws.length = 0; callback(now);
  }
}
const piece = (id: number, side: Side, facing = side === 0 ? 0 : 180, phase = BoardContactPhase.Moved): BoardContact => ({
  contactId: id, glyphId: 2, type: BoardContactType.Glyph, phase, x: side === 0 ? 330 : 1590, y: 610,
  orientation: facing - 180, isTouched: false,
});
const finger = (id: number, x: number, y: number, phase: BoardContactPhase): BoardContact => ({
  contactId: id, glyphId: 0, type: BoardContactType.Finger, phase, x, y, orientation: 0, isTouched: true,
});
function emit(...contacts: BoardContact[]) { assert.ok(contactSink); contactSink(contacts); }
function tap(x: number, y: number, id = 99) {
  emit(finger(id, x, y, BoardContactPhase.Began));
  emit(finger(id, x, y, BoardContactPhase.Ended));
  run(.05);
}
function fire(side: Side, id = 100) {
  assert.equal(saved!.match.turn, side);
  tap(1650, 960, id);
}
async function answerSelection(player?: BoardPlayer) {
  const request = selections.at(-1)!;
  if (player) {
    if (request.replace === undefined) players.push(player);
    else players.splice(players.findIndex(p => p.sessionId === request.replace), 1, { ...player, sessionId: request.replace });
    for (const callback of rosterChanged) callback();
  }
  request.answer(Boolean(player));
  // Drain pickPlayer's promise race and the caller's roster sync before the next touch.
  for (let i = 0; i < 8; i++) await Promise.resolve();
  run(.2);
}
const totalShots = () => saved!.match.shots[0] + saved!.match.shots[1];

test('native landscape setup starts two-player and solo matches, with deliberate firing and pause recovery', async () => {
  await import('../src/main');
  for (let i = 0; i < 30 && !raf; i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.ok(raf, 'main did not boot'); run(.3);
  assert.match(aria, /\. title\.$/);
  assert.equal(selections.length, 0, 'boot opened the player selector before an intentional setup action');
  tap(960, 730); assert.match(aria, /\. setup\.$/, 'landscape Play did not open setup');
  tap(960, 950); assert.equal(saved, undefined, 'Start accepted an incomplete roster');

  // The first human may choose the RIGHT tower. Adding an opponent must not replace that human.
  emit(piece(2, 1, 180, BoardContactPhase.Began)); run(.5);
  tap(960, 790);
  assert.equal(selections.length, 1); assert.equal(selections[0].replace, undefined, 'one right-side human was replaced instead of adding a second player');
  await answerSelection();
  assert.match(aria, /\. setup\.$/); assert.equal(players.length, 1);
  tap(960, 790);
  assert.equal(selections.length, 2, 'canceled selection prevented retry');
  assert.equal(selections[1].replace, undefined);
  await answerSelection(bob);
  tap(960, 950); assert.equal(saved, undefined, 'Start accepted a human without a cannon');
  emit(piece(1, 0, 0, BoardContactPhase.Began)); run(.5);
  assert.match(aria, /\. setup\.$/, 'placing cannons started the match before Start');
  assert.equal(saved, undefined);
  tap(960, 950);
  assert.ok(saved, 'landscape Start did not begin the ready match');
  assert.equal(saved.match.phase, 'aim'); assert.deepEqual(saved.match.shots, [0, 0]);
  assert.deepEqual(saved.sides, [{sessionId:1,side:1},{sessionId:2,side:0}]);

  // Analog physical rotation affects the shot; only a separate native finger Fire commits it.
  emit(piece(1, 0, 335)); run(1);
  assert.ok(saved.match.angle[0] > 60, 'rotating the cannon did not set elevation');
  assert.equal(totalShots(), 0, 'rotation fired accidentally');
  emit(finger(90, 1030, 986, BoardContactPhase.Began));
  emit(finger(90, 1140, 986, BoardContactPhase.Moved));
  emit(finger(90, 1140, 986, BoardContactPhase.Ended)); run(.05);
  assert.ok(saved.match.power[0] >= 70 && saved.match.power[0] <= 80, 'native power drag did not update strength');
  assert.equal(totalShots(), 0, 'setting power fired accidentally');
  fire(0); assert.equal(saved.match.shots[0], 1); run(8);
  assert.equal(saved.match.turn, 1); assert.equal(saved.match.phase, 'aim');

  // A true long lift creates a new physical identity; the player's seat must rebind to it.
  emit(piece(2, 1, 180, BoardContactPhase.Ended)); run(1.3);
  const beforeReturn = totalShots(); fire(1); assert.equal(totalShots(), beforeReturn, 'missing cannon was allowed to fire');
  emit(piece(22, 1, 180, BoardContactPhase.Began)); run(.5);
  fire(1); assert.equal(saved.match.shots[1], 1, 'new contact after a real lift did not rebind the native seat'); run(8);
  assert.equal(saved.match.turn, 0); assert.equal(saved.match.phase, 'aim');

  // Native menu pause clears contacts. Re-detection gets new ids and must not commit a shot.
  const beforePause = totalShots(), health = [...saved.match.health];
  // The finger begins off Fire, then moves onto it without a new press. It is held when the menu opens.
  emit(finger(299, 1650, 800, BoardContactPhase.Began));
  emit(finger(299, 1650, 960, BoardContactPhase.Moved)); run(.1);
  assert.equal(totalShots(), beforePause);
  for (const callback of pauses) callback(); run(4);
  assert.equal(totalShots(), beforePause);
  for (const callback of resumes) callback();
  emit(piece(22, 0, 335, BoardContactPhase.Began), piece(1, 1, 180, BoardContactPhase.Began)); run(.15);
  emit(finger(300, 1650, 960, BoardContactPhase.Began)); run(.1);
  assert.equal(totalShots(), beforePause, 'post-menu finger re-detection fired before a new deliberate press');
  emit(finger(300, 1650, 960, BoardContactPhase.Ended)); run(.6);
  assert.deepEqual(saved.match.health, health); fire(0, 301);
  assert.equal(totalShots(), beforePause + 1, 'fresh Fire after resume was not accepted'); run(8);

  // The platform's rematch action preserves current physical bindings without another setup gate.
  assert.ok(menu); menu('restart'); run(.5);
  assert.deepEqual(saved.match.health, [3, 3]); assert.deepEqual(saved.match.shots, [0, 0]);
  assert.equal(saved.match.phase, 'aim'); fire(0, 302);
  assert.equal(saved.match.shots[0], 1, 'rematch lost the resting native cannon');

  // Changing setup is an explicit shared decision, not an automatic rematch while pieces stay down.
  menu('setup'); run(2);
  assert.match(aria, /\. setup\.$/, 'Change setup auto-started another match with the old roster and resting cannons');
  assert.equal(saved.match.shots[0], 1, 'Change setup reset the match before players chose their new setup');

  // Recreate the OS's one-profile roster, then choose AI while the human remains on the right.
  emit(piece(22, 0, 335, BoardContactPhase.Ended)); run(.2);
  players.splice(0, players.length, alice);
  for (const callback of rosterChanged) callback();
  menu('setup'); run(.3);
  tap(960, 790);
  assert.equal(selections.length, 3); assert.equal(selections[2].replace, undefined);
  await answerSelection(pip);
  assert.match(aria, /\. setup\.$/, 'selecting AI started the match before Start');
  tap(960, 950);
  assert.deepEqual(saved.sides, [{sessionId:1,side:1},{sessionId:3,side:0}]);
  assert.deepEqual(saved.match.shots, [0, 0]);
  run(8);
  assert.equal(saved.match.shots[0], 1, 'Pip did not take its turn without a physical cannon');
  assert.equal(saved.match.turn, 1); assert.equal(saved.match.phase, 'aim');
  fire(1, 303); assert.equal(saved.match.shots[1], 1, 'right-side human could not fire in solo mode');

  // A cannon placed on a saved title must take the same Continue path as the title button.
  const checkpoint = JSON.parse(JSON.stringify(saved)) as NonNullable<typeof saved>;
  menu('setup'); tap(160, 110);
  assert.match(aria, /\. title\.$/);
  loaded = checkpoint; assert.ok(restore); restore(); run(.1);
  assert.ok(draws.includes('CONTINUE'), 'restored title did not offer Continue');
  emit(piece(1, 1, 180, BoardContactPhase.Ended)); run(1.3);
  emit(piece(41, 1, 180, BoardContactPhase.Began)); run(.4);
  assert.match(aria, /\. setup\.$/);
  assert.ok(draws.includes('CONTINUE GAME'), 'cannon arrival discarded the saved-game setup path');
  tap(960, 950);
  assert.match(aria, /^Alice\. flight\./, 'Continue did not resume the saved shot');
  assert.equal(saved.match.phase, checkpoint.match.phase, 'Continue started a new match');
  assert.deepEqual(saved.match.shots, checkpoint.match.shots, 'Continue reset shot counts');
  assert.deepEqual(saved.match.health, checkpoint.match.health, 'Continue reset tower health');
  assert.deepEqual(saved.sides, checkpoint.sides, 'Continue rebound the right-side human to the wrong tower');
  assert.deepEqual(errors, []); assert.ok(aria.length > 0);
});
