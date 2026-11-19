const styles = `
  :host { display: block; position: relative; overflow: hidden; container-type: inline-size; }
  .scene {
    --paper: #f5f1e7;
    --ink: #282832;
    --line: #cbc5b8;
    --orb: #d9a46c;
    position: absolute; inset: 0; background: var(--paper); color: var(--ink);
    display: grid; grid-template-rows: auto 1fr; box-sizing: border-box;
    padding: clamp(12px, 3cqw, 26px) clamp(16px, 5cqw, 42px);
  }
  .scene[data-theme="dark"] { --paper: #1c1d2b; --ink: #f1eadb; --line: #565368; --orb: #aaa9dd; }
  header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line); padding-bottom: 8px; }
  header > span { font-size: 13px; font-weight: 650; }
  button {
    display: grid; place-items: center; width: 42px; height: 42px; padding: 0; cursor: pointer;
    border: 1px solid var(--line); border-radius: 50%; background: var(--paper);
    color: var(--ink); font: 24px/1 system-ui, sans-serif;
  }
  button:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
  .body { position: relative; display: grid; grid-template-columns: 1fr 40%; align-items: center; }
  h2 { margin: 0; font-size: clamp(22px, 7cqw, 58px); letter-spacing: -0.04em; font-weight: 650; }
  .orb {
    position: relative; justify-self: center; border-radius: 50%; width: min(18cqw, 106px);
    aspect-ratio: 1; background: var(--orb); box-shadow: 0 0 0 1px var(--line), 0 0 0 10px var(--paper), 0 0 0 11px var(--line);
  }
  .scene[data-theme="dark"] .orb::after { content: ""; position: absolute; inset: -8% -9% 14% 13%; border-radius: 50%; background: var(--paper); }
  .outgoing { pointer-events: none; z-index: 1; }
`;

export function mountThemeRipple(host, initialOptions = {}) {
  const view = host.ownerDocument.defaultView;
  const reduced = view.matchMedia?.("(prefers-reduced-motion: reduce)");
  const lifetime = new AbortController();
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${styles}</style>
    <section class="scene" data-theme="light">
      <header><span>主题预览</span><button type="button"><span aria-hidden="true"></span></button></header>
      <div class="body"><h2></h2><div class="orb" aria-hidden="true"></div></div>
    </section>`;
  const scene = root.querySelector(".scene");
  const button = scene.querySelector("button");
  const icon = button.querySelector("span");
  const title = scene.querySelector("h2");
  let theme = "light";
  let duration = 560;
  let playing = false;
  let outgoing;
  let animation;

  function show(mode) {
    theme = mode;
    const dark = mode === "dark";
    scene.dataset.theme = mode;
    title.textContent = dark ? "夜间模式" : "日间模式";
    icon.textContent = dark ? "☀" : "☾";
    button.setAttribute("aria-label", dark ? "切换到日间模式" : "切换到夜间模式");
  }

  function clearTransition() {
    animation?.cancel();
    animation = undefined;
    outgoing?.remove();
    outgoing = undefined;
  }

  function toggle() {
    clearTransition();
    const next = theme === "light" ? "dark" : "light";
    if (!playing || reduced?.matches || !scene.animate) {
      show(next);
      return;
    }

    const bounds = scene.getBoundingClientRect();
    const anchor = button.getBoundingClientRect();
    const x = anchor.left + anchor.width / 2 - bounds.left;
    const y = anchor.top + anchor.height / 2 - bounds.top;
    const radius = Math.hypot(Math.max(x, bounds.width - x), Math.max(y, bounds.height - y));
    const hold = Math.min(radius * 0.5, Math.max(30, radius * 0.14));
    const center = x + "px " + y + "px";
    outgoing = scene.cloneNode(true);
    outgoing.classList.add("outgoing");
    outgoing.inert = true;
    outgoing.setAttribute("aria-hidden", "true");
    root.append(outgoing);
    show(next);
    const current = outgoing.animate([
      { clipPath: "circle(" + radius + "px at " + center + ")", easing: "cubic-bezier(.2,.46,.68,.91)" },
      { clipPath: "circle(" + hold + "px at " + center + ")", offset: 0.58, easing: "cubic-bezier(.2,.28,.7,1)" },
      { clipPath: "circle(0px at " + center + ")" }
    ], { duration, fill: "both" });
    animation = current;
    current.finished.then(() => { if (animation === current) clearTransition(); }, () => {});
  }

  function setOptions({ duration: next } = {}) {
    if (Number.isFinite(next)) duration = Math.min(1000, Math.max(200, next));
  }

  button.addEventListener("click", toggle, { signal: lifetime.signal });
  reduced?.addEventListener("change", () => {
    if (reduced.matches) clearTransition();
  }, { signal: lifetime.signal });
  setOptions(initialOptions);
  show(theme);
  return {
    setOptions,
    play() { playing = true; },
    pause() { playing = false; clearTransition(); },
    reset() { clearTransition(); show("light"); },
    destroy() { lifetime.abort(); clearTransition(); root.replaceChildren(); }
  };
}
