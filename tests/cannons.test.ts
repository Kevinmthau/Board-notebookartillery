import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BoardContactType, BoardContactPhase, type BoardContact } from '@board.fun/web-sdk';
import { CannonTracker, CANNON_DOCKS } from '../src/cannons';
import { angleDeltaDeg, type PieceFootprints } from '../src/piece-footprints';
import { applyContacts } from '../src/runtime';

const footprints = JSON.parse(readFileSync('public/piece-footprints.json', 'utf8')) as PieceFootprints;
const contact = (contactId: number, side: 0 | 1 = 0, facing = 0, overrides: Partial<BoardContact> = {}): BoardContact => ({
  contactId, glyphId: 2, type: BoardContactType.Glyph, phase: BoardContactPhase.Moved,
  x: CANNON_DOCKS[side].x, y: CANNON_DOCKS[side].y, orientation: facing - 180,
  isTouched: false, ...overrides,
});
const map = (...contacts: BoardContact[]) => new Map(contacts.map(c => [c.contactId, c]));
function rest(tracker: CannonTracker, contacts: BoardContact[], from = 0, frames = 15) {
  for (let i = 0; i < frames; i++) tracker.update(map(...contacts), from + i * 17, footprints);
}

test('a stationary cannon stays active across empty delta batches and gets one arrival', () => {
  const tracker = new CannonTracker(), active = new Map<number, BoardContact>();
  applyContacts(active, [contact(4, 0, 0, { phase: BoardContactPhase.Began })]);
  assert.equal(tracker.update(active, 0, footprints).length, 1);
  applyContacts(active, []);
  for (let t = 17; t < 2000; t += 17) assert.equal(tracker.update(active, t, footprints).length, 0);
  assert.equal(tracker.identities[0].present, true);
  assert.equal(tracker.identities[0].angle, 45);
});

test('two same-glyph cannons are independent and retain ownership when displaced', () => {
  const tracker = new CannonTracker();
  assert.equal(tracker.update(map(contact(1), contact(2, 1, 180)), 0, footprints).length, 2);
  const [left, right] = tracker.identities;
  assert.notEqual(left.id, right.id); assert.equal(left.side, 0); assert.equal(right.side, 1);
  tracker.update(map(contact(1, 0, 0, { x: 700 }), contact(2, 1, 180)), 100, footprints);
  assert.equal(left.x, 700); assert.equal(left.present, true); assert.equal(left.legal, false); assert.equal(left.side, 0);
  assert.equal(right.legal, true);
  tracker.update(map(contact(1), contact(2, 1, 180)), 200, footprints);
  assert.equal(left.legal, true);
});

test('rotation uses configured facing, suppresses resting jitter, and mirrors the seats', () => {
  const tracker = new CannonTracker(); rest(tracker, [contact(1, 0, 359), contact(2, 1, 180)]);
  const [left, right] = tracker.identities;
  assert.equal(left.facingDeg, 359);
  for (let i = 0; i < 30; i++) tracker.update(map(contact(1, 0, (359 + (i % 2 ? 2 : -2) + 360) % 360), contact(2, 1, 180)), 300 + i * 17, footprints);
  assert.equal(left.angle, 45);
  rest(tracker, [contact(1, 0, 329), contact(2, 1, 210)], 1000, 50);
  assert.ok(left.angle > 70 && left.angle < 72); assert.ok(right.angle > 70 && right.angle < 72);
  assert.ok(Math.abs(angleDeltaDeg(left.zeroFacingDeg, 359)) < 1e-9);
});

test('initial zero is a circular mean rather than an average through 180 degrees', () => {
  const tracker = new CannonTracker();
  for (let i = 0; i < 12; i++) tracker.update(map(contact(1, 0, i % 2 ? 1 : 359)), i * 17, footprints);
  assert.ok(Math.abs(angleDeltaDeg(tracker.identities[0].zeroFacingDeg, 0)) < .01);
  assert.equal(tracker.identities[0].angle, 45);
});

test('lift removes presence immediately; nearby timely return keeps identity, angle and zero', () => {
  const tracker = new CannonTracker(); rest(tracker, [contact(1)]);
  rest(tracker, [contact(1, 0, 330)], 300, 40);
  const identity = tracker.identities[0], angle = identity.angle, zero = identity.zeroFacingDeg;
  tracker.update(new Map(), 1000, footprints);
  assert.equal(identity.present, false); assert.equal(identity.legal, false); assert.equal(identity.contactId, null);
  const arrivals = tracker.update(map(contact(8, 0, 330, { x: CANNON_DOCKS[0].x+50, phase: BoardContactPhase.Began })), 1200, footprints);
  assert.equal(arrivals.length, 0); assert.equal(identity.contactId, 8); assert.equal(identity.present, true);
  assert.equal(identity.angle, angle); assert.equal(identity.zeroFacingDeg, zero); assert.equal(tracker.identities.length, 1);
});

test('far and late returns are real placements, even if a host reuses a contact number', () => {
  const tracker = new CannonTracker(); tracker.update(map(contact(1)), 0, footprints);
  tracker.update(new Map(), 100, footprints);
  assert.equal(tracker.update(map(contact(1, 1, 180)), 200, footprints).length, 1);
  tracker.update(new Map(), 300, footprints);
  assert.equal(tracker.update(map(contact(4, 1, 180)), 1301, footprints).length, 1);
  assert.equal(tracker.identities.length, 3);
});

test('three pause epochs preserve cannon state despite swapped contact ids and long pauses', () => {
  const tracker = new CannonTracker(); rest(tracker, [contact(1), contact(2, 1, 180)]);
  rest(tracker, [contact(1, 0, 330), contact(2, 1, 205)], 300, 40);
  const [left, right] = tracker.identities, leftAngle = left.angle, rightAngle = right.angle;
  for (let cycle = 1; cycle <= 3; cycle++) {
    const t = cycle * 10000;
    tracker.paused(t);
    assert.equal(left.present, false); assert.equal(right.present, false);
    assert.deepEqual(tracker.update(map(contact(1)), t + 1, footprints), []);
    tracker.resumed(t + 5000);
    assert.equal(tracker.update(new Map(), t + 5010, footprints).length, 0);
    assert.equal(tracker.update(map(contact(2, 0, 330), contact(1, 1, 205)), t + 5100, footprints).length, 0);
    assert.equal(left.contactId, 2); assert.equal(right.contactId, 1);
    assert.equal(left.side, 0); assert.equal(right.side, 1);
    assert.equal(left.angle, leftAngle); assert.equal(right.angle, rightAngle);
    rest(tracker, [contact(2, 0, 331), contact(1, 1, 204)], t + 5200, 20);
    assert.equal(left.angle, leftAngle); assert.equal(right.angle, rightAngle);
  }
  assert.equal(tracker.identities.length, 2);
});

test('unclaimed nearby duplicates cannot steal an already live binding', () => {
  const tracker = new CannonTracker(); tracker.update(map(contact(1)), 0, footprints);
  const first = tracker.identities[0];
  assert.equal(tracker.update(map(contact(2, 0, 0, { x: CANNON_DOCKS[0].x+30 }), contact(1)), 100, footprints).length, 1);
  assert.equal(first.contactId, 1); assert.equal(tracker.identities[1].contactId, 2);
});

test('hands and fingers sharing a glyph number never become cannons', () => {
  const tracker = new CannonTracker();
  assert.deepEqual(tracker.update(map(contact(1, 0, 0, { type: BoardContactType.Hand }), contact(2, 1, 180, { type: BoardContactType.Finger })), 0, footprints), []);
  assert.equal(tracker.identities.length, 0);
});

test('brief glyph-zero flap preserves identity without allowing unknown pieces to join', () => {
  const tracker = new CannonTracker(); tracker.update(map(contact(1)), 0, footprints);
  const identity = tracker.identities[0];
  assert.equal(tracker.update(map(contact(1, 0, 90, { glyphId: 0 })), 200, footprints).length, 0);
  assert.equal(identity.present, true); assert.equal(identity.angle, 45);
  tracker.update(map(contact(1, 0, 90, { glyphId: 0 })), 300, footprints);
  assert.equal(identity.present, false);
  assert.equal(tracker.update(map(contact(1)), 350, footprints).length, 0);
  assert.equal(identity.present, true);
});

test('loading piece data does not guess orientation or consume the first arrival', () => {
  const tracker = new CannonTracker();
  assert.deepEqual(tracker.update(map(contact(1)), 0, null), []);
  assert.equal(tracker.update(map(contact(1)), 100, footprints).length, 1);
});

test('Ended and Canceled cannot count as present even when included by a caller', () => {
  const tracker = new CannonTracker(); tracker.update(map(contact(1), contact(2, 1)), 0, footprints);
  tracker.update(map(contact(1, 0, 0, { phase: BoardContactPhase.Ended }), contact(2, 1, 0, { phase: BoardContactPhase.Canceled })), 100, footprints);
  assert.ok(tracker.identities.every(identity => !identity.present && !identity.legal && identity.contactId === null));
});

test('pause matches by nearest pose, and a far or expired return gets a new arrival', () => {
  const tracker = new CannonTracker(); tracker.update(map(contact(1), contact(2, 1, 180)), 0, footprints);
  tracker.paused(100); tracker.resumed(20000);
  assert.equal(tracker.update(map(contact(9, 0, 0, { x: 800 })), 20100, footprints).length, 1);
  assert.equal(tracker.update(map(contact(9, 0, 0, { x: 800 }), contact(8, 1, 180)), 22100, footprints).length, 1);
  assert.equal(tracker.identities.length, 4);
});

test('a deliberate turn after redetection re-arms aim without recalibrating the zero', () => {
  const tracker = new CannonTracker(); rest(tracker, [contact(1)]);
  rest(tracker, [contact(1, 0, 330)], 300, 40);
  const identity = tracker.identities[0], oldAngle = identity.angle, zero = identity.zeroFacingDeg;
  tracker.update(new Map(), 1000, footprints);
  tracker.update(map(contact(2, 0, 330)), 1100, footprints);
  rest(tracker, [contact(2, 0, 350)], 1200, 40);
  assert.ok(identity.angle < oldAngle - 10);
  assert.equal(identity.zeroFacingDeg, zero);
});
