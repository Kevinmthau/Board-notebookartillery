import { BoardContactPhase, BoardContactType, type BoardContact } from '@board.fun/web-sdk';
import { pieceFootprint, type PieceFootprints } from './piece-footprints';
import { elevationFromFacing, TUNE } from './artillery';

export type CannonSide = 0 | 1;
export const CANNON_GLYPH = 2;
export const CANNON_DOCKS = [{ x: TUNE.towerX[0], y: TUNE.cannonY }, { x: TUNE.towerX[1], y: TUNE.cannonY }] as const;
export const CANNON_TRACKING = {
  legalRadius: 110, rebindRadius: 140, rebindMs: 900,
  glyphFlapMs: 250,
} as const;

/** Stable identity is separate from the sensor's replaceable contact id and the owning side. */
export interface CannonIdentity {
  id: number;
  contactId: number | null;
  glyphId: number;
  x: number;
  y: number;
  facingDeg: number;
  angle: number;
  present: boolean;
  legal: boolean;
  side: CannonSide | null;
  lastSeen: number;
}

type Memory = {
  lastValidGlyph: number; pauseCandidate: boolean;
};
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
export function cannonSideAt(x: number, y: number): CannonSide | null {
  for (const side of [0, 1] as const) if (distance({ x, y }, CANNON_DOCKS[side]) <= CANNON_TRACKING.legalRadius) return side;
  return null;
}
const alive = (c: BoardContact) => c.phase !== BoardContactPhase.Ended && c.phase !== BoardContactPhase.Canceled;
const validPose = (c: BoardContact) => Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.orientation);
const cannon = (c: BoardContact) => c.type === BoardContactType.Glyph && c.glyphId === CANNON_GLYPH && alive(c)
  && validPose(c);

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

  clear(): void {
    this.identities.length = 0;
    this.memory.clear();
    this.isPaused = false;
  }

  paused(_now: number): void {
    this.isPaused = true;
    for (const identity of this.identities) {
      const m = this.memory.get(identity.id)!;
      // An unobserved piece may still be resting on the glass even if detection is slow or
      // another menu opens before it returns. Only an actual observation ends this recovery.
      m.pauseCandidate ||= identity.present;
      identity.contactId = null;
      identity.present = false;
      identity.legal = false;
    }
  }

  resumed(_now: number): void {
    this.isPaused = false;
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
        && validPose(c) && now - m.lastValidGlyph <= CANNON_TRACKING.glyphFlapMs;
      if (c && (cannon(c) || glyphFlap)) {
        claimed.add(c.contactId);
        this.observe(identity, glyphFlap ? { ...c, glyphId: CANNON_GLYPH } : c, now, footprints, Boolean(glyphFlap));
      } else {
        identity.contactId = null;
        identity.present = false;
        identity.legal = false;
      }
    }

    const contacts = [...active.values()].filter(c => cannon(c) && !claimed.has(c.contactId));
    // Match the closest pair first. This is stable even when the host reverses its contact order.
    const candidates = contacts.flatMap(c => this.identities.flatMap(identity => {
      const m = this.memory.get(identity.id)!;
      const close = distance(identity, c) <= CANNON_TRACKING.rebindRadius;
      const timely = now - identity.lastSeen <= CANNON_TRACKING.rebindMs;
      const pausedMatch = m.pauseCandidate;
      return !identity.present && close && (timely || pausedMatch)
        ? [{ c, identity, gap: distance(identity, c) }] : [];
    })).sort((a, b) => a.gap - b.gap || a.identity.id - b.identity.id);
    const rebound = new Set<number>();
    for (const { c, identity } of candidates) {
      if (claimed.has(c.contactId) || rebound.has(identity.id)) continue;
      claimed.add(c.contactId); rebound.add(identity.id);
      const m = this.memory.get(identity.id)!;
      m.pauseCandidate = false;
      // Retain ownership through sensor churn, and read the actual barrel direction immediately.
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
        x: c.x, y: c.y, facingDeg: footprint.facingDeg,
        angle: elevationFromFacing(cannonSideAt(c.x,c.y)??0,footprint.facingDeg),
        present: true, legal: false, side: cannonSideAt(c.x, c.y), lastSeen: now,
      };
      this.memory.set(identity.id, {
        lastValidGlyph: now, pauseCandidate: false,
      });
      identity.legal = identity.side !== null;
      this.identities.push(identity);
      arrivals.push(identity);
    }
    return arrivals;
  }

  private observe(identity: CannonIdentity, c: BoardContact, now: number, footprints: PieceFootprints | null, uncertainGlyph: boolean): void {
    const m = this.memory.get(identity.id)!;
    const footprint = pieceFootprint(footprints, c);
    identity.x = c.x; identity.y = c.y; identity.present = true;
    identity.side ??= cannonSideAt(c.x, c.y);
    identity.legal = identity.side !== null && distance(identity, CANNON_DOCKS[identity.side]) <= CANNON_TRACKING.legalRadius;
    identity.lastSeen = now;
    if (!uncertainGlyph) m.lastValidGlyph = now;
    if (!footprint) return;
    identity.facingDeg = footprint.facingDeg;
    identity.angle = elevationFromFacing(identity.side??0,footprint.facingDeg);
  }
}
