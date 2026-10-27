import { BoardContactPhase, BoardContactType, type BoardContact } from '@board.fun/web-sdk';
import { angleDeltaDeg, pieceFootprint, type PieceFootprints } from './piece-footprints';
import { TUNE } from './artillery';

export type CannonSide = 0 | 1;
export const CANNON_GLYPH = 2;
export const CANNON_DOCKS = [{ x: TUNE.towerX[0], y: TUNE.cannonY }, { x: TUNE.towerX[1], y: TUNE.cannonY }] as const;
export const CANNON_TRACKING = {
  legalRadius: 110, rebindRadius: 140, rebindMs: 900, resumeMs: 2000,
  glyphFlapMs: 250, zeroReadings: 12, deadBandDeg: 4, smoothing: .12,
} as const;

/** Stable identity is separate from the sensor's replaceable contact id and the owning side. */
export interface CannonIdentity {
  id: number;
  contactId: number | null;
  glyphId: number;
  x: number;
  y: number;
  facingDeg: number;
  zeroFacingDeg: number;
  angle: number;
  present: boolean;
  legal: boolean;
  side: CannonSide | null;
  lastSeen: number;
}

type Memory = {
  samples: number; sin: number; cos: number; firstFacing: number;
  lastUpdate: number; lastValidGlyph: number; pauseCandidate: boolean;
  recoveryFacing: number | null;
};
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const norm = (x: number) => ((x % 360) + 360) % 360;
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
export function cannonSideAt(x: number, y: number): CannonSide | null {
  for (const side of [0, 1] as const) if (distance({ x, y }, CANNON_DOCKS[side]) <= CANNON_TRACKING.legalRadius) return side;
  return null;
}
const alive = (c: BoardContact) => c.phase !== BoardContactPhase.Ended && c.phase !== BoardContactPhase.Canceled;
const cannon = (c: BoardContact) => c.type === BoardContactType.Glyph && c.glyphId === CANNON_GLYPH && alive(c)
  && Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.orientation);

/**
 * Consume the maintained active map from startInput, not a raw event batch.
 * The return value contains only real placements, for one finite arrival effect.
 * This class never commits a gameplay action. Fire must remain a deliberate separate input.
 */
export class CannonTracker {
  readonly identities: CannonIdentity[] = [];
  private memory = new Map<number, Memory>();
  private nextId = 1;
  private isPaused = false;
  private resumeUntil = -Infinity;

  clear(): void {
    this.identities.length = 0;
    this.memory.clear();
    this.resumeUntil = -Infinity;
    this.isPaused = false;
  }

  paused(now: number): void {
    this.isPaused = true;
    this.resumeUntil = -Infinity;
    for (const identity of this.identities) {
      const m = this.memory.get(identity.id)!;
      // Only identities on the table at this boundary qualify for time-independent recovery.
      m.pauseCandidate = identity.present;
      m.lastUpdate = now;
      m.recoveryFacing = null;
      identity.contactId = null;
      identity.present = false;
      identity.legal = false;
    }
  }

  resumed(now: number): void {
    this.isPaused = false;
    this.resumeUntil = now + CANNON_TRACKING.resumeMs;
  }

  update(active: ReadonlyMap<number, BoardContact>, now: number, footprints: PieceFootprints | null): CannonIdentity[] {
    if (this.isPaused) return [];
    const arrivals: CannonIdentity[] = [];
    const claimed = new Set<number>();

    // Retain live contact bindings first, so a nearby duplicate cannot steal them.
    for (const identity of this.identities) {
      const m = this.memory.get(identity.id)!;
      const c = identity.contactId === null ? undefined : active.get(identity.contactId);
      const glyphFlap = c && alive(c) && c.type === BoardContactType.Glyph && c.glyphId === 0
        && now - m.lastValidGlyph <= CANNON_TRACKING.glyphFlapMs;
      if (c && (cannon(c) || glyphFlap)) {
        claimed.add(c.contactId);
        this.observe(identity, glyphFlap ? { ...c, glyphId: CANNON_GLYPH } : c, now, footprints, Boolean(glyphFlap));
      } else {
        identity.contactId = null;
        identity.present = false;
        identity.legal = false;
      }
      if (now > this.resumeUntil) m.pauseCandidate = false;
    }

    const contacts = [...active.values()].filter(c => cannon(c) && !claimed.has(c.contactId));
    // Match the closest pair first. This is stable even when the host reverses its contact order.
    const candidates = contacts.flatMap(c => this.identities.flatMap(identity => {
      const m = this.memory.get(identity.id)!;
      const close = distance(identity, c) <= CANNON_TRACKING.rebindRadius;
      const timely = now - identity.lastSeen <= CANNON_TRACKING.rebindMs;
      const pausedMatch = m.pauseCandidate && now <= this.resumeUntil;
      return !identity.present && close && (timely || pausedMatch)
        ? [{ c, identity, gap: distance(identity, c) }] : [];
    })).sort((a, b) => a.gap - b.gap || a.identity.id - b.identity.id);
    const rebound = new Set<number>();
    for (const { c, identity } of candidates) {
      if (claimed.has(c.contactId) || rebound.has(identity.id)) continue;
      claimed.add(c.contactId); rebound.add(identity.id);
      const m = this.memory.get(identity.id)!;
      m.pauseCandidate = false;
      m.lastUpdate = now;
      // Preserve the zero and output through sensor churn. A real subsequent turn re-arms aim.
      m.recoveryFacing = pieceFootprint(footprints, c)?.facingDeg ?? identity.facingDeg;
      identity.contactId = c.contactId;
      this.observe(identity, c, now, footprints, true);
      m.lastValidGlyph = now;
    }

    for (const c of contacts) {
      if (claimed.has(c.contactId)) continue;
      const footprint = pieceFootprint(footprints, c);
      // Never invent a facing from raw orientation while the configured piece data is loading.
      if (!footprint) continue;
      const identity: CannonIdentity = {
        id: this.nextId++, contactId: c.contactId, glyphId: CANNON_GLYPH,
        x: c.x, y: c.y, facingDeg: footprint.facingDeg, zeroFacingDeg: footprint.facingDeg,
        angle: 45, present: true, legal: false, side: cannonSideAt(c.x, c.y), lastSeen: now,
      };
      const radians = footprint.facingDeg * Math.PI / 180;
      this.memory.set(identity.id, {
        samples: 1, sin: Math.sin(radians), cos: Math.cos(radians), firstFacing: footprint.facingDeg,
        lastUpdate: now, lastValidGlyph: now, pauseCandidate: false, recoveryFacing: null,
      });
      identity.legal = identity.side !== null;
      this.identities.push(identity);
      arrivals.push(identity);
    }
    return arrivals;
  }

  private observe(identity: CannonIdentity, c: BoardContact, now: number, footprints: PieceFootprints | null, freezeAim: boolean): void {
    const m = this.memory.get(identity.id)!;
    const footprint = pieceFootprint(footprints, c);
    identity.x = c.x; identity.y = c.y; identity.present = true;
    identity.side ??= cannonSideAt(c.x, c.y);
    identity.legal = identity.side !== null && distance(identity, CANNON_DOCKS[identity.side]) <= CANNON_TRACKING.legalRadius;
    identity.lastSeen = now;
    if (!freezeAim) m.lastValidGlyph = now;
    if (!footprint) return;
    const facing = footprint.facingDeg;
    identity.facingDeg = facing;
    const elapsed = clamp(now - m.lastUpdate, 0, 50);
    m.lastUpdate = now;
    if (freezeAim) return;
    if (m.recoveryFacing !== null) {
      if (Math.abs(angleDeltaDeg(facing, m.recoveryFacing)) <= CANNON_TRACKING.deadBandDeg) return;
      m.recoveryFacing = null;
    }
    if (m.samples < CANNON_TRACKING.zeroReadings) {
      // Average resting jitter across the 0/360 boundary. An early deliberate twist ends calibration.
      if (Math.abs(angleDeltaDeg(facing, m.firstFacing)) <= 6) {
        const radians = facing * Math.PI / 180;
        m.samples++; m.sin += Math.sin(radians); m.cos += Math.cos(radians);
        identity.zeroFacingDeg = norm(Math.atan2(m.sin, m.cos) * 180 / Math.PI);
        return;
      }
      m.samples = CANNON_TRACKING.zeroReadings;
    }
    if (identity.side === null) return;
    const delta = angleDeltaDeg(facing, identity.zeroFacingDeg) * (identity.side === 0 ? -1 : 1);
    const beyondBand = Math.sign(delta) * Math.max(0, Math.abs(delta) - CANNON_TRACKING.deadBandDeg);
    const target = clamp(45 + beyondBand, 15, 80);
    const smoothing = 1 - Math.pow(1 - CANNON_TRACKING.smoothing, elapsed / (1000 / 60));
    identity.angle += (target - identity.angle) * smoothing;
  }
}
