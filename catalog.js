const pageSize = 12;

export function createCatalog(index) {
  const categoryNames = new Map(index.categories.map(({ id, name }) => [id, name]));
  const effects = index.effects.map(effect => {
    const categoryName = categoryNames.get(effect.category);
    return {
      ...effect,
      categoryName,
      searchText: [effect.id, effect.name, effect.description, effect.technology, categoryName, ...effect.tags]
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
      const page = Number(params.get("page"));
      return {
        query: params.get("q") ?? "",
        category: categoryNames.has(category) ? category : "",
        page: Number.isSafeInteger(page) && page > 0 ? page : 1
      };
    },
    browse({ query, category, page }) {
      const terms = query.trim().normalize("NFKC").toLowerCase().split(/\s+/).filter(Boolean);
      const matches = effects.filter(effect =>
        (!category || effect.category === category) &&
        terms.every(term => effect.searchText.includes(term))
      );
      matches.sort((left, right) => right.addedAt.localeCompare(left.addedAt) || left.id.localeCompare(right.id));
      const pages = Math.max(1, Math.ceil(matches.length / pageSize));
      const current = Math.min(page, pages);
      const start = (current - 1) * pageSize;
      return {
        page: current,
        pages,
        total: matches.length,
        start,
        end: Math.min(start + pageSize, matches.length),
        results: matches.slice(start, start + pageSize)
      };
    }
  };
}

export function browseUrl(base, filters, route = "catalog", effectId) {
  const url = new URL(base);
  const { query, category, page } = filters;
  if (query) url.searchParams.set("q", query);
  if (category) url.searchParams.set("category", category);
  if (page > 1) url.searchParams.set("page", String(page));
  if (route === "index") url.searchParams.set("view", "index");
  if (route === "docs") url.searchParams.set("view", "docs");
  if (route === "detail" || route === "docs") url.searchParams.set("effect", effectId);
  return url;
}
