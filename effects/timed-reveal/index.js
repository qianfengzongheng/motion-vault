const styles = `
  :host { display: block; position: relative; container-type: inline-size; overflow: hidden; background: #27334c; }
  .stage {
    position: absolute; inset: 0; display: grid; place-items: center; isolation: isolate; overflow: hidden;
    width: 100%; height: 100%; padding: 0; border: 0; cursor: pointer;
    background: #27334c; color: #fff8e8; font: inherit;
  }
  .stage:focus-visible { outline: 3px solid #f3d454; outline-offset: -5px; }
  .photos, .cover { position: absolute; inset: 0; pointer-events: none; }
  .photos { background-color: #897863; background-repeat: repeat; background-size: clamp(240px, 58cqw, 440px); }
  .cover { background: #27334c; clip-path: circle(72% at 50% 50%); }
  .with-motion .cover { transition: clip-path var(--duration) cubic-bezier(.25,.8,.25,1); }
  .is-open .cover { clip-path: circle(clamp(58px, 13cqw, 98px) at 50% 50%); }
  .title { position: relative; font-size: clamp(19px, 5cqw, 37px); letter-spacing: .12em; font-weight: 650; }
`;

export function mountTimedReveal(host, initialOptions = {}) {
  const view = host.ownerDocument.defaultView;
  const reduced = view.matchMedia?.("(prefers-reduced-motion: reduce)");
  const lifetime = new AbortController();
  const listener = { signal: lifetime.signal };
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${styles}</style>
    <button type="button" class="stage">
      <span class="photos" aria-hidden="true"></span>
      <span class="cover" aria-hidden="true"></span>
      <span class="title"></span>
    </button>`;
  const stage = root.querySelector(".stage");
  const photos = root.querySelector(".photos");
  const title = initialOptions.title ?? "光与材质";
  root.querySelector(".title").textContent = title;
  stage.setAttribute("aria-label", title + "，预览图片");
  const image = new URL(initialOptions.imageUrl ?? "./light-and-materials.webp",
    initialOptions.imageUrl ? host.ownerDocument.baseURI : import.meta.url);
  photos.style.backgroundImage = "url(" + JSON.stringify(image.href) + ")";

  let duration = 420;
  let speed = 52;
  let hold = 2500;
  let playing = false;
  let closeTimer;
  let finishTimer;
  let openingEndsAt = 0;
  let transitionTime = 0;
  let drift;
  let lastPointer;

  function clearPreview() {
    view.clearTimeout(closeTimer);
    view.clearTimeout(finishTimer);
    closeTimer = finishTimer = undefined;
    drift?.cancel();
    drift = undefined;
    photos.style.removeProperty("background-size");
    stage.classList.remove("is-open", "with-motion");
  }

  function reset() {
    clearPreview();
    lastPointer = undefined;
  }

  function close() {
    view.clearTimeout(closeTimer);
    closeTimer = undefined;
    stage.classList.remove("is-open");
    if (transitionTime) finishTimer = view.setTimeout(clearPreview, transitionTime);
    else clearPreview();
  }

  function reveal() {
    if (!stage.classList.contains("is-open")) {
      view.clearTimeout(finishTimer);
      finishTimer = undefined;
      const moving = playing && !reduced?.matches && typeof photos.animate === "function";
      transitionTime = moving ? duration : 0;
      openingEndsAt = view.performance.now() + transitionTime;
      stage.style.setProperty("--duration", transitionTime + "ms");
      stage.classList.toggle("with-motion", moving);
      stage.classList.add("is-open");

      if (moving && !drift) {
        // One whole tile in each direction keeps the repeated collage continuous.
        const tileSize = Number.parseFloat(view.getComputedStyle(photos).backgroundSize);
        photos.style.backgroundSize = tileSize + "px";
        drift = photos.animate([
          { backgroundPosition: "0px 0px" },
          { backgroundPosition: -tileSize + "px " + tileSize + "px" }
        ], { duration: tileSize / speed * 1000, iterations: Infinity });
      }
    }

    view.clearTimeout(closeTimer);
    const remainingOpening = Math.max(0, openingEndsAt - view.performance.now());
    closeTimer = view.setTimeout(close, hold + remainingOpening);
  }

  function setOptions({ duration: nextDuration, speed: nextSpeed, hold: nextHold } = {}) {
    if (Number.isFinite(nextDuration)) duration = Math.min(1000, Math.max(150, nextDuration));
    if (Number.isFinite(nextSpeed)) speed = Math.min(120, Math.max(12, nextSpeed));
    if (Number.isFinite(nextHold)) hold = Math.min(6000, Math.max(600, nextHold));
  }

  stage.addEventListener("pointermove", event => {
    if (!playing || reduced?.matches || event.pointerType !== "mouse") return;
    const { clientX, clientY } = event;
    if (lastPointer?.x === clientX && lastPointer.y === clientY) return;
    lastPointer = { x: clientX, y: clientY };
    reveal();
  }, listener);
  stage.addEventListener("pointerleave", event => {
    if (event.pointerType !== "mouse") return;
    lastPointer = undefined;
    if (stage.classList.contains("is-open")) close();
  }, listener);
  stage.addEventListener("click", reveal, listener);
  reduced?.addEventListener("change", reset, listener);
  setOptions(initialOptions);

  return {
    setOptions,
    play() { playing = true; },
    pause() { playing = false; reset(); },
    reset,
    destroy() { lifetime.abort(); reset(); root.replaceChildren(); }
  };
}
