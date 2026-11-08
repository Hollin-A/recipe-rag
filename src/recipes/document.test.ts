import { describe, expect, it } from "vitest";
import { contentHash, toRecipeDocument } from "./document.ts";
import type { Recipe } from "./wikibooks.ts";

const recipe: Recipe = {
  id: "soup",
  title: "Soup",
  category: "Soup recipes",
  timeText: null,
  ingredients: ["1 onion", "water"],
  steps: ["Chop.", "Boil."],
  sourceUrl: "https://example.org/soup",
};

describe("toRecipeDocument", () => {
  it("renders the template", () => {
    expect(toRecipeDocument(recipe)).toBe(
      "Title: Soup\nCategory: Soup recipes\nIngredients: 1 onion; water\nMethod: Chop. Boil.",
    );
  });

  it("leaves out a missing category", () => {
    expect(toRecipeDocument({ ...recipe, category: null })).not.toContain("Category");
  });

  it("caps a long method at a word boundary", () => {
    const method = toRecipeDocument({ ...recipe, steps: ["word ".repeat(1000)] }).split("Method: ")[1]!;
    expect(method.length).toBeLessThanOrEqual(1500);
    expect(method.endsWith("word")).toBe(true);
  });
});

describe("contentHash", () => {
  it("changes when the text changes", () => {
    expect(contentHash("a")).toBe(contentHash("a"));
    expect(contentHash("a")).not.toBe(contentHash("b"));
  });
});
