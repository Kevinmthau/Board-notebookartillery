import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BoardContactType, BoardContactPhase, type BoardContact } from '@board.fun/web-sdk';
import { CannonTracker, CANNON_DOCKS } from '../src/cannons';
import type { PieceFootprints } from '../src/piece-footprints';
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
  assert.equal(tracker.identities[0].angle, 0);
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

test('rotation immediately follows the physical barrel on both sides without an offset or angle clamp', () => {
  const tracker = new CannonTracker(); tracker.update(map(contact(1, 0, 359), contact(2, 1, 181)), 0, footprints);
  const [left, right] = tracker.identities;
  assert.equal(left.facingDeg, 359);
  assert.equal(left.angle, 1); assert.equal(right.angle, 1);
  const cases = [[0, 180, 0], [355, 185, 5], [345, 195, 15], [280, 260, 80],
    [275, 265, 85], [270, 270, 90], [250, 290, 110], [180, 0, -180], [90, 90, -90]];
  for (const [i, [leftFacing, rightFacing, expected]] of cases.entries()) {
    tracker.update(map(contact(1, 0, leftFacing), contact(2, 1, rightFacing)), 17 + i * 17, footprints);
    assert.equal(left.angle, expected, `left facing ${leftFacing}`);
    assert.equal(right.angle, expected, `right facing ${rightFacing}`);
  }
});

test('crossing the facing wrap keeps the signed elevation without resting-pose calibration', () => {
  const tracker = new CannonTracker();
  for (let i = 0; i < 12; i++) {
    tracker.update(map(contact(1, 0, i % 2 ? 1 : 359)), i * 17, footprints);
    assert.equal(tracker.identities[0].angle, i % 2 ? -1 : 1);
  }
});

test('lift removes presence immediately; nearby timely return keeps identity and physical angle', () => {
  const tracker = new CannonTracker(); rest(tracker, [contact(1)]);
  rest(tracker, [contact(1, 0, 330)], 300, 40);
  const identity = tracker.identities[0], angle = identity.angle;
  tracker.update(new Map(), 1000, footprints);
  assert.equal(identity.present, false); assert.equal(identity.legal, false); assert.equal(identity.contactId, null);
  const arrivals = tracker.update(map(contact(8, 0, 330, { x: CANNON_DOCKS[0].x+50, phase: BoardContactPhase.Began })), 1200, footprints);
  assert.equal(arrivals.length, 0); assert.equal(identity.contactId, 8); assert.equal(identity.present, true);
  assert.equal(identity.angle, angle); assert.equal(tracker.identities.length, 1);
});

test('far and late returns are real placements, even if a host reuses a contact number', () => {
  const tracker = new CannonTracker(); tracker.update(map(contact(1)), 0, footprints);
  tracker.update(new Map(), 100, footprints);
  assert.equal(tracker.update(map(contact(1, 1, 180)), 200, footprints).length, 1);
  tracker.update(new Map(), 300, footprints);
  assert.equal(tracker.update(map(contact(4, 1, 180)), 1301, footprints).length, 1);
  assert.equal(tracker.identities.length, 3);
});

test('three pause epochs preserve identities and immediately read changed barrel poses after long pauses', () => {
  const tracker = new CannonTracker(); rest(tracker, [contact(1), contact(2, 1, 180)]);
  rest(tracker, [contact(1, 0, 330), contact(2, 1, 205)], 300, 40);
  const [left, right] = tracker.identities;
  for (let cycle = 1; cycle <= 3; cycle++) {
    const t = cycle * 10000;
    tracker.paused(t);
    assert.equal(left.present, false); assert.equal(right.present, false);
    assert.deepEqual(tracker.update(map(contact(1)), t + 1, footprints), []);
    tracker.resumed(t + 5000);
    assert.equal(tracker.update(new Map(), t + 5010, footprints).length, 0);
    const leftFacing = 330 - cycle * 10, rightFacing = 205 + cycle * 10;
    assert.equal(tracker.update(map(contact(2, 0, leftFacing), contact(1, 1, rightFacing)), t + 5100, footprints).length, 0);
    assert.equal(left.contactId, 2); assert.equal(right.contactId, 1);
    assert.equal(left.side, 0); assert.equal(right.side, 1);
    assert.equal(left.angle, 30 + cycle * 10); assert.equal(right.angle, 25 + cycle * 10);
    tracker.update(map(contact(2, 0, leftFacing + 1), contact(1, 1, rightFacing - 1)), t + 5200, footprints);
    assert.equal(left.angle, 29 + cycle * 10); assert.equal(right.angle, 24 + cycle * 10);
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
  assert.equal(identity.present, true); assert.equal(identity.angle, -90);
  tracker.update(map(contact(1, 0, 90, { glyphId: 0 })), 300, footprints);
  assert.equal(identity.present, false);
  assert.equal(tracker.update(map(contact(1)), 350, footprints).length, 0);
  assert.equal(identity.present, true);
});

test('an invalid glyph-zero pose cannot corrupt the retained cannon position or angle', () => {
  for (const pose of [{ x: NaN }, { y: Infinity }, { orientation: NaN }]) {
    const tracker = new CannonTracker(); tracker.update(map(contact(1, 0, 330)), 0, footprints);
    const identity = tracker.identities[0];
    tracker.update(map(contact(1, 0, 330, { glyphId: 0, ...pose })), 100, footprints);
    assert.equal(identity.present, false); assert.equal(identity.legal, false);
    assert.equal(identity.x, CANNON_DOCKS[0].x); assert.equal(identity.y, CANNON_DOCKS[0].y);
    assert.equal(identity.angle, 30);
    assert.equal(tracker.update(map(contact(8, 0, 330)), 200, footprints).length, 0);
    assert.equal(identity.present, true); assert.equal(identity.contactId, 8);
  }
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

test('pause matches by nearest pose after delayed detection, while a far return gets a new arrival', () => {
  const tracker = new CannonTracker(); tracker.update(map(contact(1), contact(2, 1, 180)), 0, footprints);
  const [left, right] = tracker.identities;
  tracker.paused(100); tracker.resumed(20000);
  assert.equal(tracker.update(map(contact(9, 0, 0, { x: 800 })), 20100, footprints).length, 1);
  assert.equal(tracker.update(map(contact(9, 0, 0, { x: 800 }), contact(8, 1, 180)), 30000, footprints).length, 0);
  assert.equal(right.contactId, 8); assert.equal(right.present, true);
  assert.equal(left.present, false); assert.equal(tracker.identities.length, 3);
});

test('repeated pause boundaries preserve a resting cannon awaiting redetection', () => {
  const tracker = new CannonTracker(); tracker.update(map(contact(1)), 0, footprints);
  const identity = tracker.identities[0];
  tracker.paused(100); tracker.paused(110); tracker.resumed(10000);
  tracker.update(new Map(), 14000, footprints);
  tracker.paused(15000); tracker.resumed(20000);
  assert.equal(tracker.update(map(contact(8, 0, 330)), 25000, footprints).length, 0);
  assert.equal(identity.contactId, 8); assert.equal(identity.angle, 30);
  assert.equal(identity.present, true); assert.equal(tracker.identities.length, 1);
  // Once observed, a later genuine lift still uses ordinary bounded tracking-gap recovery.
  tracker.update(new Map(), 26000, footprints);
  assert.equal(tracker.update(map(contact(9)), 30000, footprints).length, 1);
});

test('a cannon already lifted before pause does not become a pending pause match', () => {
  const tracker = new CannonTracker(); tracker.update(map(contact(1)), 0, footprints);
  tracker.update(new Map(), 100, footprints);
  tracker.paused(200); tracker.resumed(10000);
  assert.equal(tracker.update(map(contact(9)), 15000, footprints).length, 1);
});

test('a changed pose on redetection updates aim immediately without a further turn', () => {
  const tracker = new CannonTracker(); rest(tracker, [contact(1)]);
  rest(tracker, [contact(1, 0, 330)], 300, 40);
  const identity = tracker.identities[0];
  assert.equal(identity.angle, 30);
  tracker.update(new Map(), 1000, footprints);
  assert.equal(tracker.update(map(contact(2, 0, 350)), 1100, footprints).length, 0);
  assert.equal(identity.contactId, 2); assert.equal(identity.angle, 10);
  tracker.update(map(contact(2, 0, 349)), 1117, footprints);
  assert.equal(identity.angle, 11);
});
