const pageSizes = { grid: 12, list: 24 };
const collator = new Intl.Collator("zh-CN", { numeric: true });

export function createCatalog(index) {
  const categoryNames = new Map(index.categories.map(({ id, name }) => [id, name]));
  const useNames = new Map(index.useCases.map(({ id, name }) => [id, name]));
  const effects = index.effects.map(effect => {
    const categoryName = categoryNames.get(effect.category);
    const useLabels = effect.useCases.map(id => useNames.get(id));
    return {
      ...effect,
      categoryName,
      useLabels,
      searchText: [effect.id, effect.name, effect.description, effect.technology, categoryName, ...useLabels, ...effect.tags]
        .join(" ").normalize("NFKC").toLowerCase()
    };
  });
  const counts = new Map(index.categories.map(({ id }) => [id, 0]));
  for (const { category } of effects) counts.set(category, (counts.get(category) ?? 0) + 1);

  return {
    effects,
    counts,
    byId: new Map(effects.map(effect => [effect.id, effect])),
    readFilters(url) {
      const { searchParams: params } = url;
      const category = params.get("category");
      const use = params.get("use");
      const page = Number(params.get("page"));
      return {
        query: params.get("q") ?? "",
        category: categoryNames.has(category) ? category : "",
        use: useNames.has(use) ? use : "",
        sort: params.get("sort") === "name" ? "name" : "recent",
        layout: params.get("layout") === "list" ? "list" : "grid",
        page: Number.isSafeInteger(page) && page > 0 ? page : 1
      };
    },
    browse({ query, category, use, sort, layout, page }) {
      const terms = query.trim().normalize("NFKC").toLowerCase().split(/\s+/).filter(Boolean);
      const matches = effects.filter(effect =>
        (!category || effect.category === category) &&
        (!use || effect.useCases.includes(use)) &&
        terms.every(term => effect.searchText.includes(term))
      );
      matches.sort(sort === "name"
        ? (left, right) => collator.compare(left.name, right.name) || left.id.localeCompare(right.id)
        : (left, right) => right.addedAt.localeCompare(left.addedAt) || left.id.localeCompare(right.id));
      const size = pageSizes[layout];
      const pages = Math.max(1, Math.ceil(matches.length / size));
      const current = Math.min(page, pages);
      const start = (current - 1) * size;
      return {
        page: current,
        pages,
        total: matches.length,
        start,
        end: Math.min(start + size, matches.length),
        results: matches.slice(start, start + size)
      };
    }
  };
}

export function browseUrl(base, filters, route = "catalog", effectId) {
  const url = new URL(base);
  const { query, category, use, sort, layout, page } = filters;
  if (query) url.searchParams.set("q", query);
  if (category) url.searchParams.set("category", category);
  if (use) url.searchParams.set("use", use);
  if (sort === "name") url.searchParams.set("sort", sort);
  if (layout === "list") url.searchParams.set("layout", layout);
  if (page > 1) url.searchParams.set("page", String(page));
  if (route === "index") url.searchParams.set("view", "index");
  if (route === "detail") url.searchParams.set("effect", effectId);
  return url;
}
