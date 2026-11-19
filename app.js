import { browseUrl, createCatalog } from "./catalog.js";

const base = new URL("./", import.meta.url);
const indexUrl = new URL("effects.json", base);
const indexNode = document.getElementById("index-content");
const startup = document.getElementById("startup-status");
const preview = document.getElementById("effect-preview");
const configCode = document.getElementById("effect-config");
const copyStatus = document.getElementById("copy-status");
const list = document.getElementById("effect-list");
const search = document.getElementById("search");
const categorySelect = document.getElementById("category-select");
const previousPage = document.getElementById("previous-page");
const nextPage = document.getElementById("next-page");
const routeLinks = document.querySelectorAll("a[data-route]");
const visibleSections = {
  catalog: document.getElementById("catalog"),
  detail: document.getElementById("detail"),
  docs: document.getElementById("docs-view"),
  index: document.getElementById("index-view"),
  missing: document.getElementById("missing-effect")
};
const categoryButtons = new Map();
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
let catalog;
let filters;
let route;
let visual;
let renderId = 0;
let lastCatalogPosition = 0;
let lastOpenedEffect = "";

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function asset(path) {
  return new URL(path, base);
}

function setupCategories(index) {
  const categoryNav = document.getElementById("category-nav");
  const categories = [{ id: "", name: "全部动效" }, ...index.categories];
  for (const { id, name } of categories) {
    const count = id ? catalog.counts.get(id) : catalog.effects.length;
    const button = node("button", "category-button", name);
    button.type = "button";
    button.append(node("span", "category-count", count));
    button.addEventListener("click", () => changeFilters({ category: id }));
    categoryButtons.set(id, button);
    categoryNav.append(button);
    categorySelect.append(new Option(name + "（" + count + "）", id));
  }
  document.getElementById("total-count").textContent = catalog.effects.length + " 个动效";
}

function routeUrl(nextRoute = "catalog", effectId) {
  return browseUrl(base, filters, nextRoute, effectId);
}

function updateLinks(effect) {
  for (const link of routeLinks) {
    const destination = link.dataset.route;
    if (!effect && (destination === "detail" || destination === "docs")) continue;
    link.href = routeUrl(destination, effect?.id).href;
    if (link.closest(".site-nav")) {
      const active = link.dataset.route === "index" ? route === "index" : route !== "index";
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
  }
}

function thumbnail(effect, className) {
  const image = node("img", className);
  image.src = asset(effect.thumbnail).href;
  image.alt = "";
  image.width = 720;
  image.height = 300;
  image.decoding = "async";
  return image;
}

function renderCatalog() {
  const page = catalog.browse(filters);
  filters.page = page.page;
  if (search.value !== filters.query) search.value = filters.query;
  categorySelect.value = filters.category;
  for (const [id, button] of categoryButtons) button.setAttribute("aria-pressed", String(id === filters.category));
  const items = page.results.map((effect, position) => {
    const item = node("li");
    const link = node("a", "effect-card");
    link.href = routeUrl("detail", effect.id).href;
    link.dataset.route = "detail";
    link.dataset.effect = effect.id;
    const image = thumbnail(effect, "effect-thumbnail");
    image.loading = position < 3 ? "eager" : "lazy";
    const copy = node("span", "effect-card-copy");
    const title = node("span", "effect-name", effect.name);
    const meta = [effect.categoryName, effect.technology].filter(Boolean).join(" · ");
    copy.append(title, node("span", "effect-card-meta", meta));
    link.append(image, copy);
    item.append(link);
    return item;
  });
  list.replaceChildren(...items);
  list.hidden = page.total === 0;
  document.getElementById("empty-state").hidden = page.total !== 0;
  document.getElementById("result-count").textContent = page.total
    ? "显示 " + (page.start + 1) + "–" + page.end + "，共 " + page.total + " 项"
    : "共 0 项";
  document.getElementById("pagination").hidden = page.pages < 2;
  document.getElementById("page-label").textContent = "第 " + page.page + " / " + page.pages + " 页";
  previousPage.disabled = page.page <= 1;
  nextPage.disabled = page.page >= page.pages;
}

function changeFilters(changes) {
  Object.assign(filters, { page: 1 }, changes);
  renderCatalog();
  history.replaceState(history.state, "", routeUrl());
  updateLinks();
}

function formatValue(value, { unit }) {
  if (unit === "ratio") return Math.round(value * 100) + "%";
  if (unit === "multiplier") return value.toFixed(1) + "×";
  return unit ? value + " " + unit : String(value);
}

function defaultOptions(effect) {
  return Object.fromEntries(Object.entries(effect.parameters).map(([key, spec]) => [key, spec.default]));
}

async function renderDetail(effect, expectedRender) {
  document.getElementById("effect-title").textContent = effect.name;
  document.getElementById("effect-meta").textContent = [effect.categoryName, effect.technology].join(" · ");
  document.getElementById("effect-description").textContent = effect.description;
  document.getElementById("source-link").href = asset(effect.source).href;
  copyStatus.textContent = "";

  const defaults = defaultOptions(effect);
  let options = { ...defaults };
  let playing = false;
  let player;
  let presetId = effect.presets[0]?.id ?? "";
  const inputs = [];
  const interactive = effect.previewType === "html";
  const surface = interactive ? node("div", "preview-interactive") : node("canvas", "preview-canvas");
  if (!interactive) {
    surface.width = 720;
    surface.height = 300;
    surface.setAttribute("role", "img");
    surface.setAttribute("aria-label", effect.name + "的实时画布");
  }
  const panel = node("div", "parameter-panel");
  panel.append(node("h2", "", "调试参数"));

  if (effect.presets.length) {
    const presetLabel = node("label", "", "预设");
    const presetSelect = node("select");
    for (const preset of effect.presets) presetSelect.append(new Option(preset.name, preset.id));
    presetSelect.addEventListener("change", () => {
      presetId = presetSelect.value;
      resetOptions();
    });
    presetLabel.append(presetSelect);
    panel.append(presetLabel);
  }

  for (const [key, spec] of Object.entries(effect.parameters)) {
    if (spec.type !== "number") continue;
    const input = node("input");
    input.id = "option-" + key;
    input.type = "range";
    input.min = spec.min;
    input.max = spec.max;
    input.step = spec.step;
    const label = node("label");
    const labelText = node("span", "parameter-label", spec.label);
    const output = node("output");
    output.htmlFor = input.id;
    output.setAttribute("aria-hidden", "true");
    input.setAttribute("aria-label", spec.label);
    input.addEventListener("input", () => {
      options[key] = Number(input.value);
      applyOptions();
    });
    inputs.push({ key, spec, input, output });
    labelText.append(output);
    label.append(labelText, input);
    panel.append(label);
  }

  const actions = node("div", "button-row");
  const playButton = node("button", "button", interactive ? "启用动效" : "播放");
  playButton.type = "button";
  playButton.disabled = true;
  playButton.addEventListener("click", () => changePlayback(!playing));
  const resetButton = node("button", "button", "重置");
  resetButton.type = "button";
  resetButton.addEventListener("click", resetOptions);
  actions.append(playButton, resetButton);
  panel.append(actions);
  const status = node("p", "preview-status", "正在加载预览…");
  status.setAttribute("role", "status");
  const media = node("div");
  media.append(surface, status);
  const layout = node("div", "preview-layout");
  layout.append(media, panel);
  preview.replaceChildren(layout);

  function changePlayback(value) {
    playing = value;
    playButton.textContent = interactive ? (playing ? "暂停动效" : "启用动效") : (playing ? "暂停" : "播放");
    if (playing) player.play();
    else player.pause();
  }

  function applyOptions() {
    for (const { key, spec, input, output } of inputs) {
      const value = formatValue(options[key], spec);
      input.value = options[key];
      input.setAttribute("aria-valuetext", value);
      output.value = value;
    }
    configCode.textContent = JSON.stringify({ id: effect.id, options }, null, 2);
    copyStatus.textContent = "";
    player?.setOptions(options);
  }

  function resetOptions() {
    const preset = effect.presets.find(({ id }) => id === presetId);
    options = { ...defaults, ...preset?.options };
    applyOptions();
    player?.reset();
  }

  resetOptions();
  try {
    const module = await import(asset(effect.source).href);
    if (renderId !== expectedRender) return;
    player = module[effect.mountExport](surface, options);
    visual = player;
    playButton.disabled = false;
    changePlayback(!motionPreference.matches);
    status.hidden = true;
  } catch (error) {
    if (renderId !== expectedRender) return;
    console.error("Effect preview failed:", error);
    player?.destroy();
    visual = undefined;
    playButton.disabled = true;
    surface.replaceWith(thumbnail(effect, "preview-fallback"));
    status.textContent = "实时预览加载失败，已显示静态画面。";
  }
}

async function renderDocs(effect, expectedRender) {
  document.getElementById("docs-title").textContent = effect.name + " · 接入文档";
  const status = document.getElementById("docs-status");
  const content = document.getElementById("docs-content");
  status.textContent = "正在加载接入文档…";
  content.hidden = true;
  content.textContent = "";
  try {
    const response = await fetch(asset(effect.docs));
    if (!response.ok) throw new Error("Could not read documentation (" + response.status + ")");
    // Response.text() decodes UTF-8 even when the static server omits a charset.
    const markdown = await response.text();
    if (renderId !== expectedRender) return;
    content.textContent = markdown;
    content.hidden = false;
    status.textContent = "";
  } catch (error) {
    if (renderId !== expectedRender) return;
    console.error(error);
    status.textContent = "接入文档加载失败，请刷新页面重试。";
  }
}

function showRoute({ focus = false, restoreCatalog = false } = {}) {
  const url = new URL(location.href);
  const effectId = url.searchParams.get("effect");
  filters = catalog.readFilters(url);
  const effect = catalog.byId.get(effectId);
  const view = url.searchParams.get("view");
  if (effect) route = view === "docs" ? "docs" : "detail";
  else if (effectId || view === "docs") route = "missing";
  else route = view === "index" ? "index" : "catalog";
  renderId += 1;
  visual?.destroy();
  visual = undefined;
  preview.replaceChildren();
  for (const [view, section] of Object.entries(visibleSections)) section.hidden = view !== route;
  if (route === "catalog") {
    renderCatalog();
    if (filters.page !== catalog.readFilters(url).page) history.replaceState(history.state, "", routeUrl());
  }
  if (route === "detail") void renderDetail(effect, renderId);
  if (route === "docs") void renderDocs(effect, renderId);
  updateLinks(effect);
  const heading = visibleSections[route].querySelector("h1");
  document.title = heading.textContent + " · Motion Vault";
  if (!focus) return;
  const previousCard = restoreCatalog && Array.from(list.querySelectorAll(".effect-card"))
    .find(link => link.dataset.effect === lastOpenedEffect);
  (previousCard || heading).focus({ preventScroll: true });
  window.scrollTo(0, restoreCatalog ? lastCatalogPosition : 0);
}

function bindControls() {
  search.addEventListener("input", () => changeFilters({ query: search.value }));
  categorySelect.addEventListener("change", () => changeFilters({ category: categorySelect.value }));
  document.getElementById("clear-filters").addEventListener("click", () => {
    changeFilters({ query: "", category: "" });
    search.focus();
  });
  previousPage.addEventListener("click", () => changePage(-1));
  nextPage.addEventListener("click", () => changePage(1));

  document.addEventListener("click", event => {
    const link = event.target.closest("a[data-route]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const nextRoute = link.dataset.route;
    if (nextRoute === route) return;
    if (nextRoute === "catalog" && link.classList.contains("back-link") && history.state?.fromCatalog) {
      history.back();
      return;
    }
    const fromCatalog = route === "catalog";
    if (fromCatalog) {
      lastCatalogPosition = window.scrollY;
      lastOpenedEffect = link.dataset.effect ?? "";
    }
    history.pushState({ fromCatalog }, "", link.href);
    showRoute({ focus: true, restoreCatalog: nextRoute === "catalog" });
  });
  window.addEventListener("popstate", () => {
    const url = new URL(location.href);
    showRoute({ focus: true, restoreCatalog: !url.searchParams.has("effect") && url.searchParams.get("view") !== "index" });
  });
  document.getElementById("copy-config").addEventListener("click", copyConfig);
}

function changePage(step) {
  changeFilters({ page: filters.page + step });
  document.getElementById("catalog-title").focus();
}

async function copyConfig() {
  const activeRender = renderId;
  try {
    await navigator.clipboard.writeText(configCode.textContent);
    if (activeRender === renderId) copyStatus.textContent = "已复制配置";
  } catch {
    if (activeRender !== renderId) return;
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(configCode);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    copyStatus.textContent = "配置已选中，请使用系统复制快捷键。";
  }
}

try {
  const response = await fetch(indexUrl);
  if (!response.ok) throw new Error("Could not read effects.json (" + response.status + ")");
  const index = await response.json();
  if (index.schemaVersion !== 1) throw new Error("Unsupported catalog schema");
  catalog = createCatalog(index);
  setupCategories(index);
  indexNode.textContent = JSON.stringify(index, null, 2);
  startup.hidden = true;
  history.scrollRestoration = "manual";
  bindControls();
  showRoute();
} catch (error) {
  console.error(error);
  startup.hidden = false;
  startup.textContent = "动效目录加载失败，请通过本地 HTTP 服务打开并检查 effects.json。";
}
