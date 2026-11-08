// Stage 0: embed a handful of sentences and look at how similar the model thinks they are.
//
//   npm run playground                 # Voyage (needs VOYAGE_API_KEY)
//   EMBEDDER=fake npm run playground   # word-counting baseline, offline

import { createEmbedder } from "../embedders/embedder.ts";
import { cosineSimilarity, vectorLength } from "../math/cosine.ts";

// Each group is a small experiment. Guess the scores before you run it.
const sentences = [
  // Paraphrase that shares words
  { id: "pasta-1", text: "Simmer chopped tomatoes with garlic and olive oil for a pasta sauce." },
  { id: "pasta-2", text: "Gently cook tomatoes and garlic to make a sauce for spaghetti." },
  // Paraphrase with almost no shared words
  { id: "stew", text: "A hearty beef stew for cold winter evenings." },
  { id: "cosy", text: "Something warm and comforting to eat when it's freezing outside." },
  // Negation: opposite meaning, nearly identical words
  { id: "meat", text: "This dish contains meat." },
  { id: "no-meat", text: "This dish contains no meat." },
  // Same technique, different words
  { id: "meringue", text: "Whisk the egg whites until stiff peaks form." },
  { id: "eggs", text: "Beat the eggs until light and fluffy." },
  // One word, two meanings
  { id: "apple-pie", text: "Peel and slice the apples for the pie." },
  { id: "apple-co", text: "Apple released a new phone today." },
  { id: "stock-soup", text: "Simmer the bones for hours to make a rich stock." },
  { id: "stock-mkt", text: "The stock market fell sharply this morning." },
];

const experiments: [string, string, string][] = [
  ["pasta-1", "pasta-2", "paraphrase, shared words"],
  ["stew", "cosy", "paraphrase, no shared words"],
  ["meat", "no-meat", "negation"],
  ["meringue", "eggs", "same technique"],
  ["apple-pie", "apple-co", "same word, different meaning"],
  ["stock-soup", "stock-mkt", "same word, different meaning"],
  ["stock-soup", "stew", "different words, same world"],
];

const query = "What could I cook on a chilly night?";

const embedder = createEmbedder();
const { model, dimensions, vectors } = await embedder.embed(
  sentences.map((s) => s.text),
  "document",
);
const vectorOf = (id: string) => vectors[sentences.findIndex((s) => s.id === id)]!;
const similarity = (a: string, b: string) => cosineSimilarity(vectorOf(a), vectorOf(b));

// 1. What an embedding looks like
const first = vectors[0]!;
console.log(`\nModel: ${model}, ${dimensions} dimensions`);
console.log(`"${sentences[0]!.text}"`);
console.log(`  → [${first.slice(0, 6).map((x) => x.toFixed(4)).join(", ")}, … ${dimensions - 6} more]`);
console.log(`  length: ${vectorLength(first).toFixed(4)}`);

// 2. Every pair at once
const width = Math.max(...sentences.map((s) => s.id.length));
console.log("\nCosine similarity matrix\n");
console.log(" ".repeat(width + 4) + sentences.map((_, i) => String(i + 1).padStart(5)).join(""));
sentences.forEach((row, i) => {
  const cells = sentences.map((col, j) => (i === j ? "    ·" : similarity(row.id, col.id).toFixed(2).padStart(5)));
  console.log(`${String(i + 1).padStart(2)}  ${row.id.padEnd(width)}${cells.join("")}`);
});

// 3. The experiments, side by side
console.log("\nExperiments\n");
for (const [a, b, label] of experiments) {
  console.log(`  ${similarity(a, b).toFixed(3)}  ${`${a} ↔ ${b}`.padEnd(24)} ${label}`);
}

// 4. A search: one query against all sentences, embedded as a query and as a document
const asQuery = (await embedder.embed([query], "query")).vectors[0]!;
const asDocument = (await embedder.embed([query], "document")).vectors[0]!;
const ranked = sentences
  .map((s) => ({
    id: s.id,
    query: cosineSimilarity(asQuery, vectorOf(s.id)),
    document: cosineSimilarity(asDocument, vectorOf(s.id)),
  }))
  .toSorted((a, b) => b.query - a.query);

console.log(`\nSearch: "${query}"\n`);
console.log(`  ${"as query".padStart(8)}  ${"as doc".padStart(8)}`);
for (const r of ranked) {
  console.log(`  ${r.query.toFixed(3).padStart(8)}  ${r.document.toFixed(3).padStart(8)}  ${r.id}`);
}
console.log();
