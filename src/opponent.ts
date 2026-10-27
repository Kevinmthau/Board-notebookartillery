import { clamp, collision, makeProjectile, other, random, stepBall, TUNE, type Match } from './artillery';

type Shot = { angle: number; power: number };
type Window = Shot & { width: number };

// Aim only with the visible wind and the same launch, integration, and collision
// rules as a person. Planning never consumes the match's wind/random sequence.
export function chooseShot(match: Match): Shot {
  const rng = { seed: (match.seed ^ Math.imul(match.shots[0] + 1, 0x9e3779b1)
    ^ Math.imul(match.shots[1] + 1, 0x85ebca6b) ^ Math.imul(match.turn + 1, 0xc2b2ae35)) >>> 0 };
  const windows: Window[] = [];
  const target = other(match.turn);
  for (let angle = 30; angle <= 75; angle += 3) {
    let start: number | null = null;
    for (let power = 40; power <= 101.5; power += 1.5) {
      let hits = false;
      if (power <= 100) {
        const ball = makeProjectile(match.turn, angle, power);
        for (let tick = 0; tick < 1500; tick++) {
          stepBall(ball, match.wind, TUNE.step);
          const impact = collision(ball);
          if (impact) { hits = impact.target === target; break; }
        }
      }
      if (hits && start === null) start = power;
      if (!hits && start !== null) {
        const end = power - 1.5;
        windows.push({ angle, power: (start + end) / 2, width: end - start });
        start = null;
      }
    }
  }

  // Prefer a forgiving trajectory, then vary it between turns. No corrections
  // happen after firing: a bounded aiming error can genuinely miss the tower.
  const widest = windows.reduce((width, shot) => Math.max(width, shot.width), 0);
  const choices = windows.filter(shot => shot.width >= widest - 1.5);
  const aim = choices.length ? choices[Math.floor(random(rng) * choices.length)] : { angle: 48, power: 75 };
  const mistake = random(rng) < .3;
  const angleError = (random(rng) * 2 - 1) * (mistake ? 2.8 : .7);
  const powerError = mistake ? (random(rng) < .5 ? -1 : 1) * (14 + random(rng) * 4)
    : (random(rng) * 2 - 1) * 1.5;
  return {
    angle: clamp(aim.angle + angleError, TUNE.minAngle, TUNE.maxAngle),
    power: clamp(aim.power + powerError, TUNE.minPower, TUNE.maxPower),
  };
}
