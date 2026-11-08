// Turns the raw Wikibooks Cookbook JSON into clean Recipes.
// Dataset: https://huggingface.co/datasets/gossminn/wikibooks-cookbook (CC BY-SA 4.0)

export type Recipe = {
  id: string;
  title: string;
  category: string | null;
  timeText: string | null;
  ingredients: string[];
  steps: string[];
  sourceUrl: string;
};

type RawLine = { text: string; line_type: string; section: string | null };
type RawRecipe = {
  recipe_data: {
    url: string;
    title: string;
    infobox: { category: string | null; time: string | null } | null;
    text_lines: RawLine[];
  };
};

// Section headings are hand-written, so they vary: "Ingredients:", "Procedures", "Preparation"…
const INGREDIENTS_SECTION = /ingredient/i;
const STEPS_SECTION = /^(procedures?|preparation|instructions?|directions?|method|process|steps?)\b/i;

// Recipes with no ingredients or no steps can't answer a cooking question, so they are left out.
export function parseWikibooks(raw: RawRecipe[]): Recipe[] {
  const recipes = raw.map(parseRecipe).filter((r) => r.ingredients.length > 0 && r.steps.length > 0);

  const seen = new Set<string>();
  for (const { id, title } of recipes) {
    if (id === "") throw new Error(`Title "${title}" has no usable characters for an id.`);
    if (seen.has(id)) throw new Error(`Two recipes share the id "${id}".`);
    seen.add(id);
  }
  return recipes;
}

function parseRecipe({ recipe_data: data }: RawRecipe): Recipe {
  const lines = data.text_lines ?? [];
  // A plain paragraph under "Ingredients" is a remark, not an ingredient.
  const ingredients = lines.filter(
    (l) => l.section && INGREDIENTS_SECTION.test(l.section) && l.line_type !== "p",
  );
  const steps = lines.filter((l) => l.section && STEPS_SECTION.test(l.section));

  return {
    id: slugify(data.title),
    title: data.title,
    category: categoryLabel(data.infobox?.category ?? null),
    timeText: data.infobox?.time ?? null,
    ingredients: ingredients.map((l) => clean(l.text)),
    steps: steps.map((l) => clean(l.text)),
    sourceUrl: data.url,
  };
}

export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // é → e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// "/wiki/Category:Cake_recipes" → "Cake recipes"
export function categoryLabel(path: string | null): string | null {
  if (!path) return null;
  const name = path.split("Category:")[1];
  return name ? decodeURIComponent(name).replaceAll("_", " ") : null;
}

// Footnote markers like "[1]" are left over from the wiki page.
function clean(text: string): string {
  return text.replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim();
}
