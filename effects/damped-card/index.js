const styles = `
  :host {
    display: grid; place-items: center; overflow: hidden; container-type: inline-size;
    background: #e9e8f0; color: #252235;
  }
  .scene { width: min(75%, 380px); perspective: 700px; touch-action: pan-y; }
  .card {
    box-sizing: border-box; position: relative; display: grid; gap: 8px; width: 100%;
    text-align: left; padding: clamp(12px, 3cqw, 22px); overflow: hidden;
    border: 1px solid #cfcadb; border-radius: 16px; color: inherit; background: #faf9fd;
    box-shadow: 0 12px 22px #30274b19; font: inherit; cursor: default;
    transform: rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
  }
  .card:focus-visible { outline: 2px solid #6652a1; outline-offset: 4px; }
  .moving .card { will-change: transform; }
  .glow {
    position: absolute; inset: 0; pointer-events: none; opacity: var(--glow, 0);
    background: radial-gradient(190px at var(--glow-x, 50%) var(--glow-y, 50%), #a58afb73, transparent 75%);
  }
  .heading { display: flex; align-items: center; gap: 10px; font-size: clamp(16px, 3.4cqw, 24px); font-weight: 650; }
  .mark { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; background: #ece5f9; color: #634b9e; }
  .hint { color: #59546b; font-size: clamp(11px, 2.5cqw, 14px); }
`;

export function mountDampedCard(host, initialOptions = {}) {
  const view = host.ownerDocument.defaultView;
  const reduced = view.matchMedia?.("(prefers-reduced-motion: reduce)");
  const lifetime = new AbortController();
  const listener = { signal: lifetime.signal };
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${styles}</style>
    <div class="scene">
      <div class="card" tabindex="0" role="group" aria-labelledby="card-title" aria-describedby="card-hint">
        <span id="card-title" class="heading"><span class="mark" aria-hidden="true">✦</span>工作区</span>
        <span id="card-hint" class="hint">移动鼠标、触摸或按方向键</span>
        <span class="glow" aria-hidden="true"></span>
      </div>
    </div>`;
  const scene = root.querySelector(".scene");
  const card = root.querySelector(".card");
  const axes = Array.from({ length: 3 }, () => ({ value: 0, velocity: 0, target: 0 }));
  let angle = 8;
  let damping = 15;
  let playing = false;
  let frame;
  let previousTime;
  let touch;
  let position;

  function paint() {
    scene.style.setProperty("--tilt-x", axes[0].value.toFixed(2) + "deg");
    scene.style.setProperty("--tilt-y", axes[1].value.toFixed(2) + "deg");
    scene.style.setProperty("--glow", axes[2].value.toFixed(3));
  }

  function tick(now) {
    frame = undefined;
    const dt = Math.min((now - previousTime) / 1000, 1 / 30);
    previousTime = now;
    let settled = true;
    for (const axis of axes) {
      axis.velocity += (160 * (axis.target - axis.value) - damping * axis.velocity) * dt;
      axis.value += axis.velocity * dt;
      if (Math.abs(axis.value - axis.target) > 0.01 || Math.abs(axis.velocity) > 0.01) settled = false;
    }
    if (settled) {
      for (const axis of axes) { axis.value = axis.target; axis.velocity = 0; }
      scene.classList.remove("moving");
    } else {
      frame = view.requestAnimationFrame(tick);
    }
    paint();
  }

  function run() {
    if (frame !== undefined) return;
    previousTime = view.performance.now();
    scene.classList.add("moving");
    frame = view.requestAnimationFrame(tick);
  }

  function aim(x, y) {
    if (!playing || reduced?.matches) return;
    position = [x, y];
    const maximum = angle * Math.min(1, 400 / scene.clientWidth);
    axes[0].target = (1 - 2 * y) * maximum;
    axes[1].target = (2 * x - 1) * maximum;
    axes[2].target = 1;
    scene.style.setProperty("--glow-x", x * 100 + "%");
    scene.style.setProperty("--glow-y", y * 100 + "%");
    run();
  }

  function release() {
    if (!position) return;
    position = undefined;
    for (const axis of axes) axis.target = 0;
    run();
  }

  function track(event) {
    if (touch !== undefined ? event.pointerId !== touch : event.pointerType === "touch") return;
    const rect = scene.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const clamp = value => Math.min(1, Math.max(0, value));
    aim(clamp((event.clientX - rect.left) / rect.width), clamp((event.clientY - rect.top) / rect.height));
  }

  function endTouch(event) {
    if (event.pointerId !== touch) return;
    touch = undefined;
    release();
  }

  function reset() {
    if (frame !== undefined) view.cancelAnimationFrame(frame);
    frame = touch = position = undefined;
    for (const axis of axes) axis.value = axis.velocity = axis.target = 0;
    scene.classList.remove("moving");
    paint();
  }

  function setOptions({ angle: nextAngle, damping: nextDamping } = {}) {
    if (Number.isFinite(nextAngle)) angle = Math.min(12, Math.max(2, nextAngle));
    if (Number.isFinite(nextDamping)) damping = Math.min(26, Math.max(10, nextDamping));
    if (position) aim(...position);
  }

  scene.addEventListener("pointermove", track, listener);
  scene.addEventListener("pointerleave", () => { if (touch === undefined) release(); }, listener);
  scene.addEventListener("pointerdown", event => {
    if (event.pointerType !== "touch" || touch !== undefined || !playing || reduced?.matches) return;
    touch = event.pointerId;
    track(event);
  }, listener);
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) scene.addEventListener(type, endTouch, listener);
  const directions = new Map([["ArrowLeft", [0, 0.5]], ["ArrowRight", [1, 0.5]], ["ArrowUp", [0.5, 0]], ["ArrowDown", [0.5, 1]]]);
  card.addEventListener("keydown", event => {
    const direction = directions.get(event.key);
    if (!direction || !playing || reduced?.matches) return;
    event.preventDefault();
    aim(...direction);
  }, listener);
  card.addEventListener("keyup", event => { if (directions.has(event.key)) release(); }, listener);
  card.addEventListener("blur", release, listener);
  reduced?.addEventListener("change", () => { if (reduced.matches) reset(); }, listener);
  setOptions(initialOptions);
  return {
    setOptions,
    play() { playing = true; },
    pause() { playing = false; reset(); },
    reset,
    destroy() { lifetime.abort(); reset(); root.replaceChildren(); }
  };
}
