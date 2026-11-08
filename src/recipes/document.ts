import { createHash } from "node:crypto";
import type { Recipe } from "./wikibooks.ts";

// Title and ingredients carry most of the meaning. Method text adds technique
// words, but a very long method would drown them out, so it is capped.
const MAX_METHOD_CHARS = 1500;

// The single block of text that represents a Recipe in the vector index.
// Changing this template changes every hash, so ingest re-embeds everything.
export function toRecipeDocument(recipe: Recipe): string {
  return [
    `Title: ${recipe.title}`,
    recipe.category && `Category: ${recipe.category}`,
    `Ingredients: ${recipe.ingredients.join("; ")}`,
    `Method: ${truncateAtWord(recipe.steps.join(" "), MAX_METHOD_CHARS)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function contentHash(document: string): string {
  return createHash("sha256").update(document).digest("hex");
}

function truncateAtWord(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  return cut.slice(0, cut.lastIndexOf(" "));
}
