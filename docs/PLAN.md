# Recipe RAG: the plan

A recipe chatbot built from scratch to learn retrieval-augmented generation (RAG) and vector databases. Understanding comes before speed: each stage teaches one concept, ends with something you can run, and gets measured where measuring makes sense.

Vocabulary is in [GLOSSARY.md](../GLOSSARY.md). Decisions that are hard to reverse are in [docs/adr/](adr/).

## Stack

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript on Node 24, run directly with built-in type stripping | No build step; `tsc --noEmit` for type checks |
| Database | Postgres 17 + pgvector, one container via `docker compose` | One database for both relational data and vectors; light enough for 8 GB RAM |
| DB access | `pg` + `pgvector` helper, hand-written SQL, numbered `.sql` migrations | So the vector operators, full-text search and RRF stay visible |
| Embeddings | Voyage AI `voyage-4` (1024 dims) behind an `Embedder` interface | Claude has no embeddings API |
| Chat | Claude (`claude-sonnet-5-5`) behind a `ChatModel` interface | Swappable for Ollama in stage 8 |
| Data | [Wikibooks Cookbook](https://huggingface.co/datasets/gossminn/wikibooks-cookbook) (CC BY-SA 4.0), a seeded sample of about 400 recipes | Real, human-written and openly licensed; no scraping |
| UI | Terminal only (scripts plus a `readline` REPL) | A UI teaches nothing about RAG |
| Tests | Vitest for pure maths (cosine, RRF, recall) | The eval set is the real test suite |

## Ground rules

- Each stage is runnable with one npm script, named by what it does, not by stage number.
- After each stage: stop, explain the concepts and decisions, list the commands to run, and commit.
- Once stage 3 exists, every change to retrieval gets an Eval Run with a label. The result is committed to `eval/results/`, so git history records how the scores changed.
- Secrets go in `.env` (gitignored). `.env.example` is committed and lists every variable.

---

## Stage 0: Embeddings playground

**Goal:** see what an embedding is before using one for anything.

**Build:** the `Embedder` interface (`embed(texts, kind: "query" | "document")`), a Voyage implementation, a fake implementation for tests, and `cosineSimilarity()`. A script embeds about 10 hand-picked sentences and prints the similarity matrix. The sentences include near-synonyms, unrelated topics, a negation pair ("contains meat" vs "contains no meat") and a word with two meanings.

**What I'll learn:**
- An embedding is a list of numbers where "close" means "similar in meaning".
- What cosine similarity measures, and why vectors are often normalised.
- The range scores actually fall in for this model, which is not 0 to 1 in practice.
- What embeddings are bad at, such as negation.
- Why queries and documents get embedded differently (`input_type`).

**Run:** `npm run playground`

**Done when:**
- The matrix prints.
- The fake embedder and cosine have passing Vitest tests.
- You can explain why at least one pair scored higher or lower than you expected.

---

## Stage 1: Ingest

**Goal:** get recipes into Postgres with one Embedding each.

**Build:**
- `docker-compose.yml` for Postgres + pgvector, and the `db:migrate` script.
- Migration 001: `recipes` (the raw fields only: title, category, ingredients, steps, raw time text, source URL) and `recipe_embeddings` (see [ADR 0001](adr/0001-embeddings-table-keyed-by-model.md)).
- A download step that fetches the raw JSON into `data/raw/`.
- A parser that splits ingredients and steps on the section tag, and a seeded sample of about 400 recipes, skipping any with no ingredients.
- `toRecipeDocument()` for the embedding text: title, category, ingredients, and the method truncated to about 1,500 chars.
- An incremental embedding step that batches requests and skips rows whose `(recipe, model, content_hash)` already exists.

**What I'll learn:**
- The ingest pipeline: load → clean → document → embed → store.
- Why one vector per recipe works here, and when you'd need chunking instead.
- How pgvector stores vectors.
- Why the model name and a content hash are stored with each vector.
- Batching and rate limits when calling an embedding API.

**Run:** `npm run db:up`, `npm run db:migrate`, `npm run ingest`

**Done when:**
- About 400 recipes and about 400 Embeddings are stored.
- Re-running `ingest` makes no embedding API calls.
- Changing the `toRecipeDocument()` template causes a re-embed.

---

## Stage 2: Retrieval

**Goal:** find recipes for a Query, two different ways, and compare them.

**Build:**
- Vector top-k search (cosine distance `<=>`, filtered by model).
- Postgres full-text search: a migration adds a generated `tsvector` column with a GIN index, ranked with `ts_rank`.
- A script that prints both lists of Hits side by side, with scores.

**What I'll learn:**
- How semantic search differs from keyword search.
- Where each one wins: "something warming for winter" vs. an exact dish name or a rare ingredient.
- That the two score scales can't be compared with each other.

**Run:** `npm run search -- "pumpkin soup"`

**Done when:**
- You've run at least 5 Queries.
- You can name one Query where vector search wins and one where full-text wins.

---

## Stage 3: Evaluation

**Goal:** replace "it feels better" with a number.

**Build:**
- `eval/cases.json` with about 20 Eval Cases across four kinds: exact name, ingredient-led, vague/paraphrased, and constrained. Plus 2–3 No-Answer Cases.
- I draft the cases; you review them and rewrite some in your own words to reduce vocabulary bias.
- An eval script that reports Recall@5 and Hit@5 for each retrieval method and each case.
- Results saved to `eval/results/<timestamp>-<label>.json`, with a diff against the previous run printed.

**What I'll learn:**
- Recall@k and hit rate.
- Why evaluation comes before tuning.
- How eval sets get biased.
- Why you measure retrieval on its own, separately from generation.

**Run:** `npm run eval -- --label baseline`

**Done when:**
- A baseline Eval Run for vector and full-text search is committed.
- Rerunning takes one command.
- You know your weakest case type.

---

## Stage 4: Generation

**Goal:** answer questions grounded only in the retrieved recipes.

**Build:**
- The `ChatModel` interface (system + messages → text) and a Claude implementation.
- A chat REPL. Each turn embeds the Query, retrieves the top 5, formats them as context, and asks Claude to answer only from them, citing `[recipe:<id>]`.
- Code that checks every cited ID was retrieved, and prints titles and URLs from the DB rather than from Claude's text.
- "Nothing relevant" is left to Claude's judgement, checked against the No-Answer Cases. Hit scores are printed so you can see where a cutoff would fall.

**What I'll learn:**
- The basic RAG loop.
- How to format context.
- Grounding and citation.
- Why a fixed similarity cutoff is brittle (it depends on the model).
- How to make hallucinated citations impossible to display.

**Run:** `npm run chat`

**Done when:**
- Answers cite real retrieved IDs.
- Every No-Answer Case gets a "nothing found" reply.
- A follow-up question works.

---

## Stage 5a: Metadata filters

**Goal:** honour hard constraints such as "vegetarian" or "under 30 minutes".

**Build:**
- Enrichment at ingest:
  - a regex parser turns raw time text into `total_minutes`, with `null` meaning unknown;
  - one Claude Haiku call per recipe, with structured output, gives `is_vegetarian`;
  - both are cached by content hash.
- SQL `WHERE` filters combined with vector search.
- Eval Cases with constraints, and a Constraint Violation count in the eval output.

**What I'll learn:**
- Pre-filtering vs post-filtering.
- Why filters are exact while similarity is fuzzy.
- LLM metadata Enrichment and how to measure how reliable it is.
- How unknown values should behave.

**Run:** `npm run enrich`, `npm run eval -- --label filters`

**Done when:**
- Constrained cases show zero Constraint Violations.
- The Eval Run is committed and compared with the baseline.

---

## Stage 5b: Hybrid search with reciprocal rank fusion

**Goal:** get the best of vector and full-text search in one ranked list.

**Build:** an `rrf()` function, unit-tested, with `score = Σ 1/(k + rank)` and k = 60. A hybrid search that merges both lists of Hits, in SQL or in TypeScript (we'll decide when we get there).

**What I'll learn:**
- Why you fuse rankings instead of scores.
- What the constant k does.
- How to judge whether hybrid search is actually better, per case type.

**Run:** `npm run eval -- --label hybrid`

**Done when:** a hybrid Eval Run is committed, and you can say which case types improved and which got worse.

---

## Stage 5c: HNSW index

**Goal:** understand approximate nearest-neighbour (ANN) indexes and what they trade away.

**Build:** a migration adding a partial HNSW expression index per model ([ADR 0001](adr/0001-embeddings-table-keyed-by-model.md)), `EXPLAIN ANALYZE` before and after, and experiments with `hnsw.ef_search`.

**What I'll learn:**
- How HNSW works at a high level.
- Exact vs approximate search.
- Why, at about 400 rows, it doesn't buy speed.
- How to check that a query actually uses the index.
- That recall can drop.

**Run:** `npm run eval -- --label hnsw`, plus the `EXPLAIN` script

**Done when:** the plan shows an index scan, an Eval Run is committed, and any recall change is explained.

---

## Stage 6: Agentic RAG

**Goal:** let Claude decide when and how to search.

**Build:** extend `ChatModel` with tool calling. A `search_recipes` tool takes a query plus optional filters (vegetarian, max minutes). Claude can call it several times per turn. The tool loop has a turn cap, and the REPL shows each tool call.

**What I'll learn:**
- How tool use works.
- Fixed pipeline vs agent loop: what you gain and what you lose (cost, latency, predictability).
- Query rewriting by the model.
- Why tool descriptions matter.

**Run:** `npm run agent`

**Done when:**
- A multi-part question ("a vegetarian starter and a quick dessert") triggers more than one search.
- Answers stay grounded and cited.

---

## Stage 7: MCP server

**Goal:** make recipe search usable from any MCP client.

**Build:** a small stdio MCP server built with the official TypeScript SDK, exposing `search_recipes` and `get_recipe`, registered with Claude Code or Claude Desktop.

**What I'll learn:** what MCP standardises, and how the stage 6 tool and an MCP tool relate.

**Run:** `npm run mcp`, then call the tool from Claude Code.

**Done when:** Claude Code answers a recipe question using your server.

---

## Stage 8 (optional): Ollama over the LAN

**Goal:** swap both models for local ones and compare them honestly.

**Second-laptop setup (not code; a checklist we'll write when we get there):**
- Install Ollama.
- Make it listen on the LAN (`OLLAMA_HOST=0.0.0.0`).
- Allow the port through the firewall.
- Give the laptop a fixed IP.
- Pull the models (chosen by that laptop's RAM).

Check it first with `curl` from this laptop.

**Build:**
- `OllamaEmbedder` (with nomic's `search_query:` / `search_document:` prefixes) and `OllamaChatModel`, selected with `EMBEDDER=ollama` and `CHAT_PROVIDER=ollama`.
- Ingest re-embeds automatically under the new model name, and both models' vectors stay side by side.

**What I'll learn:**
- How much embedding quality matters.
- Why vectors from different models can't be mixed.
- How tool calling behaves on a small local model.

**Run:** `EMBEDDER=ollama npm run ingest`, then `EMBEDDER=ollama npm run eval -- --label ollama`

**Done when:** Eval Runs for both models are committed, with a short written comparison.
