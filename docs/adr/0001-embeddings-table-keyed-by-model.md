# Embeddings live in their own table, keyed by (recipe, model)

Embeddings are stored in `recipe_embeddings(recipe_id, model, dimensions, content_hash, embedding vector)`, not as a column on `recipes`. The primary key is `(recipe_id, model)`, and the `vector` column has no fixed dimension.

We chose this because different embedding models produce vectors of different sizes (Voyage `voyage-3.5` gives 1024, Ollama `nomic-embed-text` gives 768), and we want vectors from both models side by side so the eval can compare them.

## Consequences

- Every vector query must filter on `model`. A query that doesn't would compare vectors from different spaces.
- An HNSW index has to be a partial expression index per model, e.g. `USING hnsw ((embedding::vector(1024)) vector_cosine_ops) WHERE model = 'voyage-3.5'`, and queries must use the same cast to hit it.
- Ingest is incremental: it embeds only Recipes with no row for the current model, or whose `content_hash` has changed. Switching models re-embeds automatically, and re-running ingest costs nothing.
