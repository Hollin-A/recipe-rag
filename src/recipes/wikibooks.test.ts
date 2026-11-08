import { describe, expect, it } from "vitest";
import { categoryLabel, parseWikibooks, slugify } from "./wikibooks.ts";

const line = (text: string, section: string | null, line_type = "ul") => ({ text, section, line_type });
const raw = (title: string, text_lines: ReturnType<typeof line>[]) => ({
  recipe_data: {
    url: `https://example.org/${title}`,
    title,
    infobox: { category: "/wiki/Category:Cake_recipes", time: "1 h" },
    text_lines,
  },
});

describe("parseWikibooks", () => {
  it("splits ingredients and steps by section, ignoring other sections", () => {
    const [recipe] = parseWikibooks([
      raw("Cake", [
        line("An intro", null, "p"),
        line("2 eggs[1]", "Ingredients:"),
        line("A remark", "Ingredients", "p"),
        line("Mix well", "Procedure", "ol"),
        line("Eat quickly", "Notes, tips, and variations"),
      ]),
    ]);
    expect(recipe).toMatchObject({
      id: "cake",
      category: "Cake recipes",
      timeText: "1 h",
      ingredients: ["2 eggs"],
      steps: ["Mix well"],
    });
  });

  it("drops recipes with no ingredients or no steps", () => {
    expect(parseWikibooks([raw("Stub", [line("Mix", "Procedure", "ol")])])).toEqual([]);
  });

  it("refuses two recipes with the same id", () => {
    const lines = [line("egg", "Ingredients"), line("mix", "Procedure", "ol")];
    expect(() => parseWikibooks([raw("Pão", lines), raw("Pao", lines)])).toThrow(/share the id/);
  });
});

describe("helpers", () => {
  it("slugifies titles", () => {
    expect(slugify("'Out of Salad Dressing' Salad Dressing")).toBe("out-of-salad-dressing-salad-dressing");
    expect(slugify("Crème Brûlée")).toBe("creme-brulee");
  });

  it("labels categories", () => {
    expect(categoryLabel("/wiki/Category:Cake_recipes")).toBe("Cake recipes");
    expect(categoryLabel(null)).toBeNull();
  });
});
