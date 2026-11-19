import { limitNumber, mountCanvasMotion, radialGlow, seededRandom } from "../canvas-motion.js";

const fullTurn = Math.PI * 2;
const background = "#f4f3ef";
const graphite = "#302f2c";

function pointSeeds() {
  const random = seededRandom(183923);
  const sky = Array.from({ length: 310 }, () => ({
    x: random(), y: random(), size: random() ** 5, brightness: random(), phase: random() * fullTurn
  }));
  const orbit = Array.from({ length: 3650 }, () => ({
    radius: 0.045 + random() ** 1.42 * 0.955,
    arm: random(),
    scatter: (random() + random() + random() - 1.5) * 1.6,
    size: random() ** 3,
    brightness: random()
  }));
  return { sky, orbit };
}

function normalize(options) {
  return {
    density: limitNumber(options.density, 0.8, 0.25, 1),
    speed: limitNumber(options.speed, 1, 0.2, 2),
    arms: Math.round(limitNumber(options.arms, 3, 2, 5))
  };
}

/** Mount a rotating particle nebula on a CSS-sized canvas. */
export function mountParticleNebula(canvas, initialOptions = {}) {
  const { sky, orbit } = pointSeeds();
  let options = normalize(initialOptions);

  const { redraw, setSpeed, ...motion } = mountCanvasMotion(canvas, (ctx, width, height) => {
    const centerX = width * 0.51;
    const centerY = height * 0.49;
    const radius = Math.min(width * 0.45, height * 1.06);
    const grain = Math.max(0.65, Math.min(1.4, height / 280));
    const tiltX = Math.cos(-0.22);
    const tiltY = Math.sin(-0.22);
    const core = radialGlow(ctx, centerX, centerY, radius * 0.24, [
      [0, background], [0.2, "#f4f3efc0"], [0.57, "#f4f3ef28"], [1, "#f4f3ef00"]
    ]);

    return time => {
      ctx.globalAlpha = 1;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = graphite;
      for (const star of sky) {
        ctx.globalAlpha = 0.14 + star.brightness * (0.42 + 0.14 * Math.sin(time * 1.8 + star.phase));
        const size = (0.7 + star.size * 1.55) * grain;
        ctx.fillRect(star.x * width, star.y * height, size, size);
      }

      const count = Math.round(orbit.length * options.density);
      for (let i = 0; i < count; i += 1) {
        const star = orbit[i];
        const distance = star.radius;
        const arm = Math.floor(star.arm * options.arms) / options.arms * fullTurn;
        const spin = time * (0.51 - distance * 0.31);
        const angle = arm + distance * 4.75 + star.scatter * (0.28 + distance * 0.2) + spin;
        const x = Math.cos(angle) * distance * radius;
        const y = Math.sin(angle) * distance * radius * 0.42;
        const size = (0.72 + star.size * 2.3 + (1 - distance) * 0.55) * grain;
        const bright = (0.2 + star.brightness * 0.65) * (1 - distance * 0.36);
        ctx.globalAlpha = bright;
        ctx.fillRect(centerX + x * tiltX - y * tiltY, centerY + x * tiltY + y * tiltX, size, size);
      }

      ctx.fillStyle = core;
      ctx.globalAlpha = 0.9;
      const half = radius * 0.24;
      ctx.fillRect(centerX - half, centerY - half, half * 2, half * 2);
      ctx.globalAlpha = 1;
    };
  }, options.speed);

  return {
    ...motion,
    setOptions(changes) {
      options = normalize({ ...options, ...changes });
      setSpeed(options.speed);
      redraw();
    }
  };
}
