import { limitNumber, mountCanvasMotion, radialGlow, seededRandom } from "../canvas-motion.js";

const fullTurn = Math.PI * 2;
const palettes = {
  violet: {
    base: "#080a18",
    stars: ["#f7e8ff", "#bcb1ff", "#8968fb", "#ea9cfe", "#577eea", "#a0d8ff"],
    cloud: [[0, "#34315c"], [0.44, "#1a2149"], [0.76, "#100e29"], [1, "#080a1800"]],
    core: [[0, "#fff5e9"], [0.1, "#fdf0dce3"], [0.27, "#dfb9ff88"], [0.6, "#7057ef31"], [1, "#7057ef00"]]
  },
  ice: {
    base: "#05141c",
    stars: ["#e9feff", "#9edfe7", "#65c7ea", "#70abdf", "#32a8b7", "#c8fff6"],
    cloud: [[0, "#235569"], [0.45, "#143748"], [0.76, "#102432"], [1, "#05141c00"]],
    core: [[0, "#f8ffff"], [0.1, "#e2ffeeee"], [0.26, "#99efe39c"], [0.6, "#60d4ff24"], [1, "#60d4ff00"]]
  }
};

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
    brightness: random(),
    color: Math.floor(random() * 6)
  }));
  return { sky, orbit };
}

function normalize(options) {
  return {
    palette: options.palette === "ice" ? "ice" : "violet",
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
    const glows = Object.fromEntries(Object.entries(palettes).map(([key, palette]) => [key, {
      cloud: radialGlow(ctx, centerX, centerY, radius * 1.03, palette.cloud),
      core: radialGlow(ctx, centerX, centerY, radius * 0.31, palette.core)
    }]));

    return time => {
      const palette = palettes[options.palette];
      const glow = glows[options.palette];
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.base;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = glow.cloud;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = palette.stars[0];
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
        ctx.fillStyle = palette.stars[star.color];
        ctx.fillRect(centerX + x * tiltX - y * tiltY, centerY + x * tiltY + y * tiltX, size, size);
      }

      ctx.fillStyle = glow.core;
      ctx.globalAlpha = 0.9;
      const half = radius * 0.31;
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
