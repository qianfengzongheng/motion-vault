const defaults = Object.freeze({ mode: "form", density: 0.7, speed: 1, pointerRadius: 95 });
const maxParticles = 12500;
const background = "#f4f3ef";
const graphite = "#302f2c";
const rotation = -0.36;
const tiltX = Math.cos(rotation);
const tiltY = Math.sin(rotation);

function numericOption(value, fallback, min, max) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

function normalize(options) {
  return {
    mode: options.mode === "field" ? "field" : "form",
    density: numericOption(options.density, defaults.density, 0.15, 1),
    speed: numericOption(options.speed, defaults.speed, 0.2, 2),
    pointerRadius: numericOption(options.pointerRadius, defaults.pointerRadius, 30, 180)
  };
}

function makeParticles(count) {
  let seed = 32056;
  function next() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  return Array.from({ length: count }, () => {
    const angle = next() * Math.PI * 2;
    const spread = next() + next() + next() - 1.5;
    const x = Math.sin(angle);
    const y = 0.51 * Math.sin(2 * angle);
    const tangentX = Math.cos(angle);
    const tangentY = 1.02 * Math.cos(2 * angle);
    const length = Math.hypot(tangentX, tangentY);
    const depth = (Math.cos(angle + 0.48) + 1) / 2;
    const ribbonWidth = (0.095 + depth * 0.21) * spread;
    const bandX = x - tangentY / length * ribbonWidth;
    const bandY = y + tangentX / length * ribbonWidth;
    const ambient = next() < 0.61;
    const fieldX = next();
    const fieldY = next();
    const grain = next();
    const strength = next();
    return {
      fieldX,
      fieldY,
      formX: bandX * tiltX - bandY * tiltY,
      formY: bandX * tiltY + bandY * tiltX,
      ambient,
      fieldSize: 0.65 + grain * 1.15,
      formSize: 1.05 + grain * (0.86 + depth * 0.75),
      fieldOpacity: 0.08 + strength * 0.17,
      formOpacity: (0.36 + strength * 0.49) * (0.58 + depth * 0.42) * (1 - 0.36 * Math.min(1, Math.abs(spread))),
      phase: next() * Math.PI * 2,
      drift: 0.48 + next() * 0.5,
      offsetX: 0,
      offsetY: 0
    };
  });
}

/**
 * Mount an independent Canvas 2D effect. Set the canvas size in CSS.
 * Call destroy() when removing the canvas.
 */
export function mountParticleForm(canvas, initialOptions = {}) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable");

  const owner = canvas.ownerDocument;
  const view = owner.defaultView;
  const reducedMotion = view.matchMedia("(prefers-reduced-motion: reduce)");
  const particles = makeParticles(maxParticles);
  let options = normalize(initialOptions);
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let time = 0;
  let previousTime = null;
  let pointer = null;
  let frameId = null;
  let playing = false;
  let inViewport = true;
  let destroyed = false;

  function render(step = 0) {
    if (!width || !height) return;
    ctx.globalAlpha = 1;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = graphite;

    const capacity = Math.min(maxParticles, Math.max(400, Math.round(width * height / 20)));
    const count = Math.round(capacity * options.density);
    const relaxation = step ? 1 - Math.exp(-step * 11) : 1;
    const scale = Math.min(height * 0.52, width * 0.25);
    const centerX = width * 0.66;
    const centerY = height * 0.49;
    const { mode, pointerRadius } = options;
    for (let index = 0; index < count; index += 1) {
      const particle = particles[index];
      const dispersed = mode === "field" || particle.ambient;
      const baseX = dispersed ? particle.fieldX * width : centerX + particle.formX * scale;
      const baseY = dispersed ? particle.fieldY * height : centerY + particle.formY * scale;
      const driftTime = time * particle.drift + particle.phase;
      const flow = time * 0.82 + baseX / width * 4.4 - baseY / height * 3;
      const displacement = dispersed ? 2.5 : Math.min(13, scale * 0.063);
      const x = baseX + (Math.sin(flow) + Math.sin(driftTime) * 0.38) * displacement;
      const y = baseY + (Math.cos(flow * 0.91) + Math.cos(driftTime * 0.82) * 0.38) * displacement * 0.75;
      let targetX = 0;
      let targetY = 0;
      if (pointer) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared > 0 && distanceSquared < pointerRadius * pointerRadius) {
          const distance = Math.sqrt(distanceSquared);
          const influence = 1 - distance / pointerRadius;
          const push = influence * influence * pointerRadius * 0.78;
          targetX = dx / distance * push;
          targetY = dy / distance * push;
        }
      }
      particle.offsetX += (targetX - particle.offsetX) * relaxation;
      particle.offsetY += (targetY - particle.offsetY) * relaxation;
      const size = dispersed ? particle.fieldSize : particle.formSize;
      ctx.globalAlpha = dispersed ? particle.fieldOpacity : particle.formOpacity;
      const left = Math.round((x + particle.offsetX) * pixelRatio) / pixelRatio;
      const top = Math.round((y + particle.offsetY) * pixelRatio) / pixelRatio;
      const side = Math.max(1, Math.round(size * pixelRatio)) / pixelRatio;
      ctx.fillRect(left, top, side, side);
    }
    ctx.globalAlpha = 1;
  }

  function resize() {
    const nextWidth = canvas.clientWidth;
    const nextHeight = canvas.clientHeight;
    if (!nextWidth || !nextHeight) return;
    const nextRatio = Math.min(2, view.devicePixelRatio || 1);
    const pixelsWide = Math.max(1, Math.round(nextWidth * nextRatio));
    const pixelsHigh = Math.max(1, Math.round(nextHeight * nextRatio));
    if (width === nextWidth && height === nextHeight && canvas.width === pixelsWide && canvas.height === pixelsHigh) return;
    width = nextWidth;
    height = nextHeight;
    pixelRatio = nextRatio;
    canvas.width = pixelsWide;
    canvas.height = pixelsHigh;
    ctx.setTransform(pixelsWide / width, 0, 0, pixelsHigh / height, 0, 0);
    render();
  }

  function tick(now) {
    frameId = null;
    if (!playing || destroyed || owner.hidden || !inViewport) return;
    const step = previousTime === null ? 0 : Math.min(0.045, (now - previousTime) / 1000);
    previousTime = now;
    time += step * options.speed;
    render(step);
    schedule();
  }

  function schedule() {
    if (playing && !destroyed && !owner.hidden && inViewport && frameId === null) {
      frameId = view.requestAnimationFrame(tick);
    }
  }

  function stopFrame() {
    if (frameId !== null) view.cancelAnimationFrame(frameId);
    frameId = null;
    previousTime = null;
  }

  function onPointerMove(event) {
    if (event.pointerType === "touch" || (reducedMotion.matches && !playing)) return;
    const bounds = canvas.getBoundingClientRect();
    pointer = { x: event.clientX - bounds.left - canvas.clientLeft, y: event.clientY - bounds.top - canvas.clientTop };
    if (!playing) render();
  }

  function clearPointer() {
    pointer = null;
    if (!playing) render();
  }

  function syncVisibility() {
    if (owner.hidden || !inViewport) {
      pointer = null;
      stopFrame();
    } else {
      schedule();
    }
  }

  const resizeObserver = new view.ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersectionObserver = view.IntersectionObserver && new view.IntersectionObserver(entries => {
    inViewport = entries.at(-1).isIntersecting;
    syncVisibility();
  });
  intersectionObserver?.observe(canvas);
  view.addEventListener("resize", resize);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", clearPointer);
  canvas.addEventListener("pointercancel", clearPointer);
  owner.addEventListener("visibilitychange", syncVisibility);
  resize();

  return {
    setOptions(changes) {
      if (destroyed) return;
      options = normalize({ ...options, ...changes });
      render();
    },
    reset() {
      if (destroyed) return;
      time = 0;
      pointer = null;
      render();
    },
    play() {
      if (destroyed) return;
      playing = true;
      schedule();
    },
    pause() {
      playing = false;
      stopFrame();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopFrame();
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      view.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", clearPointer);
      canvas.removeEventListener("pointercancel", clearPointer);
      owner.removeEventListener("visibilitychange", syncVisibility);
    }
  };
}
