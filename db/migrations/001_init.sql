-- pgvector adds the `vector` column type and distance operators such as <=>.
CREATE EXTENSION IF NOT EXISTS vector;

-- What the source data actually says. Derived values arrive later (stage 5a).
CREATE TABLE recipes (
  id          text PRIMARY KEY,        -- readable slug of the title, e.g. "apple-crisp-i"
  title       text NOT NULL,
  category    text,
  time_text   text,                    -- free text as written, e.g. "30–40 minutes"
  ingredients text[] NOT NULL,
  steps       text[] NOT NULL,
  source_url  text NOT NULL UNIQUE     -- CC BY-SA attribution
);

-- One row per (recipe, model). See docs/adr/0001-embeddings-table-keyed-by-model.md.
CREATE TABLE recipe_embeddings (
  recipe_id    text NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  model        text NOT NULL,
  dimensions   integer NOT NULL,
  content_hash text NOT NULL,          -- hash of the Recipe Document that was embedded
  embedding    vector NOT NULL,        -- no fixed size: models differ
  PRIMARY KEY (recipe_id, model),
  CHECK (vector_dims(embedding) = dimensions)
);
