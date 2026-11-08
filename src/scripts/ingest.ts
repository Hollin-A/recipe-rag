// Stage 1: load → clean → sample → store → embed.
// Safe to re-run: only Recipes with a missing or out-of-date Embedding are sent to the API.

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import pgvector from "pgvector";
import { createPool } from "../db.ts";
import { createEmbedder } from "../embedders/embedder.ts";
import { contentHash, toRecipeDocument } from "../recipes/document.ts";
import { seededSample } from "../recipes/sample.ts";
import { parseWikibooks } from "../recipes/wikibooks.ts";

// Pinned to one dataset revision, so everyone gets the same recipes.
const DATA_URL =
  "https://huggingface.co/datasets/gossminn/wikibooks-cookbook/resolve/49fb73ea07d2a1380c15197db5589934937457ed/recipes_parsed.mini.json";
const DATA_FILE = join(import.meta.dirname, "../../data/raw/recipes_parsed.mini.json");

const SAMPLE_SIZE = 400;
const SAMPLE_SEED = 42;
const BATCH_SIZE = 64;

async function loadRawData(): Promise<string> {
  if (!existsSync(DATA_FILE)) {
    console.log("Downloading the Wikibooks Cookbook dataset…");
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    await mkdir(dirname(DATA_FILE), { recursive: true });
    await writeFile(DATA_FILE, await response.text());
  }
  return readFile(DATA_FILE, "utf8");
}

const all = parseWikibooks(JSON.parse(await loadRawData()));
const recipes = seededSample(all, SAMPLE_SIZE, SAMPLE_SEED);
console.log(`Parsed ${all.length} usable recipes, sampled ${recipes.length}.`);

const pool = createPool();
const embedder = createEmbedder();

for (const r of recipes) {
  await pool.query(
    `INSERT INTO recipes (id, title, category, time_text, ingredients, steps, source_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title, category = EXCLUDED.category, time_text = EXCLUDED.time_text,
       ingredients = EXCLUDED.ingredients, steps = EXCLUDED.steps, source_url = EXCLUDED.source_url`,
    [r.id, r.title, r.category, r.timeText, r.ingredients, r.steps, r.sourceUrl],
  );
}

// Which Recipes need embedding with this model?
const { rows } = await pool.query<{ recipe_id: string; content_hash: string }>(
  "SELECT recipe_id, content_hash FROM recipe_embeddings WHERE model = $1",
  [embedder.model],
);
const storedHash = new Map(rows.map((r) => [r.recipe_id, r.content_hash]));

const pending = recipes
  .map((recipe) => {
    const document = toRecipeDocument(recipe);
    return { id: recipe.id, document, hash: contentHash(document) };
  })
  .filter((p) => storedHash.get(p.id) !== p.hash);

console.log(`Model ${embedder.model}: ${recipes.length - pending.length} up to date, ${pending.length} to embed.`);

for (let start = 0; start < pending.length; start += BATCH_SIZE) {
  const batch = pending.slice(start, start + BATCH_SIZE);
  const { model, dimensions, vectors } = await embedder.embed(
    batch.map((p) => p.document),
    "document",
  );

  for (const [i, item] of batch.entries()) {
    await pool.query(
      `INSERT INTO recipe_embeddings (recipe_id, model, dimensions, content_hash, embedding)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (recipe_id, model) DO UPDATE SET
         dimensions = EXCLUDED.dimensions, content_hash = EXCLUDED.content_hash, embedding = EXCLUDED.embedding`,
      [item.id, model, dimensions, item.hash, pgvector.toSql(vectors[i]!)],
    );
  }
  console.log(`  embedded ${Math.min(start + BATCH_SIZE, pending.length)}/${pending.length}`);
}

const counts = await pool.query<{ recipes: number; embeddings: number }>(
  `SELECT (SELECT count(*)::int FROM recipes) AS recipes,
          (SELECT count(*)::int FROM recipe_embeddings WHERE model = $1) AS embeddings`,
  [embedder.model],
);
console.log(`Done. ${counts.rows[0]!.recipes} recipes, ${counts.rows[0]!.embeddings} embeddings for ${embedder.model}.`);
await pool.end();
