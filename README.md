# Recipe RAG

A recipe chatbot built from scratch in TypeScript to learn **retrieval-augmented generation (RAG)** and **vector databases**: embeddings, pgvector, full-text and hybrid search, evaluation, grounded generation with citations, agentic tool use, and MCP.

It's a learning project built in small stages. Each stage teaches one concept and can be run with a single command. Retrieval changes are measured by an evaluation set, and every Eval Run is committed so the history shows what helped and what didn't.

- **The plan:** [docs/PLAN.md](docs/PLAN.md): stages, what each teaches, and done criteria
- **Vocabulary:** [GLOSSARY.md](GLOSSARY.md)
- **Design decisions:** [docs/adr/](docs/adr/)

## Stack

TypeScript on Node 24 · Postgres + pgvector (Docker) · Voyage AI embeddings · Claude for chat · optionally Ollama on another machine on the local network.

The embedding model and chat model are each behind a small interface, chosen with environment variables, so providers can be swapped and compared.

## Progress

- [x] 0. Embeddings playground
- [x] 1. Ingest
- [ ] 2. Retrieval: vector vs full-text
- [ ] 3. Evaluation
- [ ] 4. Generation with citations
- [ ] 5a. Metadata filters
- [ ] 5b. Hybrid search (RRF)
- [ ] 5c. HNSW index
- [ ] 6. Agentic RAG
- [ ] 7. MCP server
- [ ] 8. (optional) Ollama over the LAN

## Getting started

Requirements: Node 24+, Docker, a [Voyage AI](https://www.voyageai.com/) API key, and an [Anthropic](https://console.anthropic.com/) API key.

```sh
cp .env.example .env   # then fill in your keys
npm install
```

| Stage | Command | What you'll see |
|---|---|---|
| 0 | `npm run playground` | Similarity matrix for 12 sentences, and a sample search |
| 0 | `EMBEDDER=fake npm run playground` | The same with a word-counting baseline (offline, no key) |
| 1 | `npm run db:up`, `npm run db:migrate` | Starts Postgres + pgvector on port 5433 and creates the tables |
| 1 | `npm run ingest` | Downloads the data and stores 400 Recipes with one Embedding each. Safe to re-run |

`npm test` runs the unit tests and `npm run typecheck` type-checks the code. More detail on each stage is in [docs/PLAN.md](docs/PLAN.md).

## Data and attribution

Recipes come from the [Wikibooks Cookbook](https://en.wikibooks.org/wiki/Cookbook:Table_of_Contents) via the [`gossminn/wikibooks-cookbook`](https://huggingface.co/datasets/gossminn/wikibooks-cookbook) dataset. They are licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) and written by Wikibooks contributors.

The raw dataset is not committed: the ingest step downloads it. Each stored recipe keeps its source URL. Recipe titles and IDs that appear in `eval/` files come from that dataset and stay under the same licence.

## Licence

Code: [MIT](LICENSE). Recipe data: CC BY-SA 4.0, as described above.
