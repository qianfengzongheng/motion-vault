import { limitNumber, mountCanvasMotion, seededRandom } from "../canvas-motion.js";

const background = "#f4f3ef";
const graphite = "#302f2c";

function waterSeeds() {
  const random = seededRandom(809549);
  return Array.from({ length: 2450 }, () => ({
    spread: (random() + random() + random() - 1.5) * 0.9,
    phase: random(),
    rate: 0.39 + random() * 0.44,
    thinness: random(),
    brightness: random()
  }));
}

function normalize(options) {
  return {
    density: limitNumber(options.density, 0.8, 0.25, 1),
    speed: limitNumber(options.speed, 1, 0.2, 2),
    width: limitNumber(options.width, 0.35, 0.15, 0.65)
  };
}

/** Mount a particle waterfall on a CSS-sized canvas. */
export function mountParticleWaterfall(canvas, initialOptions = {}) {
  const streams = waterSeeds();
  let options = normalize(initialOptions);

  const { redraw, setSpeed, ...motion } = mountCanvasMotion(canvas, (ctx, width, height) => {
    const center = width * 0.5;
    const grain = Math.max(0.5, Math.min(1.15, height / 320));
    const source = -30 * grain;
    const drop = height - source;

    return time => {
      const flowWidth = width * options.width;
      ctx.globalAlpha = 1;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = graphite;

      const count = Math.round(streams.length * options.density);
      for (let i = 0; i < count; i += 1) {
        const particle = streams[i];
        const progress = (particle.phase + time * particle.rate) % 1;
        const y = source + drop * (0.24 * progress + 0.76 * progress * progress);
        const x = center + particle.spread * flowWidth;
        const length = grain * (1.5 + progress * (3 + particle.rate * 8) + particle.thinness * 2);
        const size = grain * (0.5 + particle.thinness * 0.8);
        ctx.globalAlpha = 0.12 + particle.brightness * 0.42;
        ctx.fillRect(x, y, size, length);
      }
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
