export function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function limitNumber(value, fallback, min, max) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

export function radialGlow(ctx, x, y, radius, stops) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
}

export function mountCanvasMotion(canvas, createScene, initialSpeed) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable");

  const owner = canvas.ownerDocument;
  const view = owner.defaultView;
  let scene;
  let width = 0;
  let height = 0;
  let elapsed = 0;
  let speed = initialSpeed;
  let frameId = null;
  let lastFrame = null;
  let playing = false;
  let inViewport = true;
  let destroyed = false;

  function redraw() {
    if (!destroyed) scene?.(elapsed);
  }

  function resize() {
    const nextWidth = canvas.clientWidth;
    const nextHeight = canvas.clientHeight;
    if (destroyed || !nextWidth || !nextHeight) return;
    const ratio = Math.min(2, view.devicePixelRatio || 1);
    const bitmapWidth = Math.max(1, Math.round(nextWidth * ratio));
    const bitmapHeight = Math.max(1, Math.round(nextHeight * ratio));
    if (nextWidth === width && nextHeight === height && canvas.width === bitmapWidth && canvas.height === bitmapHeight) return;

    width = nextWidth;
    height = nextHeight;
    canvas.width = bitmapWidth;
    canvas.height = bitmapHeight;
    ctx.setTransform(bitmapWidth / width, 0, 0, bitmapHeight / height, 0, 0);
    scene = createScene(ctx, width, height);
    redraw();
  }

  function stopFrame() {
    if (frameId !== null) view.cancelAnimationFrame(frameId);
    frameId = null;
    lastFrame = null;
  }

  function syncVisibility() {
    if (!playing || destroyed || !inViewport || owner.hidden) {
      stopFrame();
    } else if (frameId === null) {
      frameId = view.requestAnimationFrame(tick);
    }
  }

  function tick(now) {
    frameId = null;
    if (!playing || destroyed || !inViewport || owner.hidden) return;
    if (lastFrame !== null) elapsed += Math.min(0.05, (now - lastFrame) / 1000) * speed;
    lastFrame = now;
    redraw();
    syncVisibility();
  }

  resize();
  const resizeObserver = new view.ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersectionObserver = view.IntersectionObserver && new view.IntersectionObserver(entries => {
    inViewport = entries.at(-1).isIntersecting;
    syncVisibility();
  });
  intersectionObserver?.observe(canvas);
  view.addEventListener("resize", resize);
  owner.addEventListener("visibilitychange", syncVisibility);

  return {
    redraw,
    setSpeed(value) { speed = value; },
    play() {
      if (destroyed) return;
      playing = true;
      syncVisibility();
    },
    pause() {
      playing = false;
      stopFrame();
    },
    reset() {
      elapsed = 0;
      lastFrame = null;
      redraw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopFrame();
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      view.removeEventListener("resize", resize);
      owner.removeEventListener("visibilitychange", syncVisibility);
      scene = undefined;
    }
  };
}
