import { limitNumber, mountCanvasMotion, radialGlow, seededRandom } from "../canvas-motion.js";

const fullTurn = Math.PI * 2;
const streamColors = ["#56b1b3", "#80d8d4", "#a1e5dd", "#cefbf0", "#eafffe"];

function waterSeeds() {
  const random = seededRandom(809549);
  const streams = Array.from({ length: 2450 }, () => ({
    spread: (random() + random() + random() - 1.5) * 0.9,
    phase: random(),
    rate: 0.39 + random() * 0.44,
    thinness: random(),
    tint: Math.floor(random() * streamColors.length),
    brightness: random()
  }));
  const droplets = Array.from({ length: 510 }, () => ({
    side: (random() + random() - 1) * 1.4,
    phase: random(),
    launch: random(),
    tint: Math.floor(random() * streamColors.length)
  }));
  return { streams, droplets };
}

function normalize(options) {
  return {
    density: limitNumber(options.density, 0.8, 0.25, 1),
    speed: limitNumber(options.speed, 1, 0.2, 2),
    width: limitNumber(options.width, 0.35, 0.15, 0.65),
    spray: limitNumber(options.spray, 0.7, 0, 1)
  };
}

/** Mount a particle waterfall on a CSS-sized canvas. */
export function mountParticleWaterfall(canvas, initialOptions = {}) {
  const { streams, droplets } = waterSeeds();
  let options = normalize(initialOptions);

  const { redraw, setSpeed, ...motion } = mountCanvasMotion(canvas, (ctx, width, height) => {
    const center = width * 0.5;
    const source = -height * 0.06;
    const pool = height * 0.79;
    const drop = pool - source;
    const grain = Math.max(0.65, Math.min(1.35, height / 280));
    const background = radialGlow(ctx, center, height * 0.54, width * 0.48, [
      [0, "#1c4b51"], [0.46, "#133338"], [1, "#07131900"]
    ]);
    const mist = radialGlow(ctx, center, pool, Math.min(width * 0.25, height * 0.53), [
      [0, "#b9f8e77f"], [0.19, "#81d7cf58"], [0.61, "#4eb3aa1e"], [1, "#3a9a9700"]
    ]);
    const sourceGlow = radialGlow(ctx, center, 0, width * 0.21, [
      [0, "#bafbea63"], [0.4, "#6ddbd039"], [1, "#47aeb200"]
    ]);

    return time => {
      const flowWidth = width * options.width;
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#071319";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = sourceGlow;
      ctx.fillRect(0, 0, width, height);

      const count = Math.round(streams.length * options.density);
      for (let i = 0; i < count; i += 1) {
        const particle = streams[i];
        const progress = (particle.phase + time * particle.rate) % 1;
        const y = source + drop * (0.24 * progress + 0.76 * progress * progress);
        const x = center + particle.spread * flowWidth * (0.78 + progress * 0.28)
          + Math.sin(particle.spread * 27 + progress * 5 + time * 1.1) * grain * 4;
        const length = grain * (2 + progress * (6 + particle.rate * 21) + particle.thinness * 3.2);
        const size = grain * (0.6 + particle.thinness * 1.35);
        const fade = Math.min(1, (1 - progress) * 6);
        ctx.fillStyle = streamColors[particle.tint];
        ctx.globalAlpha = (0.16 + particle.brightness * 0.57) * fade;
        ctx.fillRect(x, y, size, Math.min(length, pool - y));
      }

      ctx.fillStyle = mist;
      ctx.globalAlpha = 0.32 + options.spray * 0.56;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "#bffae9";
      for (let ring = 0; ring < 4; ring += 1) {
        const phase = (time * 0.45 + ring / 4) % 1;
        const radius = flowWidth * (0.33 + phase * 0.79);
        ctx.globalAlpha = (1 - phase) * 0.3;
        for (let point = 0; point < 118; point += 1) {
          const angle = point / 118 * fullTurn;
          const x = center + Math.cos(angle) * radius;
          const y = pool + height * 0.035 + Math.sin(angle) * radius * 0.16;
          ctx.fillRect(x, y, (1 + phase) * grain, grain * 0.64);
        }
      }

      const sprayCount = Math.round(droplets.length * options.spray * options.density);
      for (let i = 0; i < sprayCount; i += 1) {
        const particle = droplets[i];
        const progress = (time * (0.57 + particle.launch * 0.38) + particle.phase) % 1;
        const x = center + particle.side * flowWidth * (0.36 + progress * 0.62);
        const lift = 4 * progress * (1 - progress);
        const y = pool - lift * height * (0.025 + particle.launch * 0.16) + progress * 4 * grain;
        const size = (0.65 + particle.launch * 1.3) * grain;
        ctx.fillStyle = streamColors[particle.tint];
        ctx.globalAlpha = (1 - progress) * (0.18 + particle.launch * 0.53);
        ctx.fillRect(x, y, size, size);
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
