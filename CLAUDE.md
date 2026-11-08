# Recipe RAG

A **learning project**: the user is a full-stack TypeScript engineer learning RAG and vector databases. Their understanding is the deliverable; working code is the evidence.

- Stages, scope and done criteria: `docs/PLAN.md`. Build only the current stage.
- Vocabulary: `GLOSSARY.md`. Use its terms in code, comments and explanations (Recipe Document, Hit, Eval Case…).
- Hard-to-reverse decisions: `docs/adr/`. Read them before touching the schema or retrieval.

## Stage workflow

1. Build exactly one stage, up to its done criteria.
2. Stop and explain, in plain language: the key concepts, each decision and its alternative, and the exact commands to run to see it working.
3. Tick the stage in the README's Progress list and add its commands under Getting started. Then commit, with a message like `stage 2: vector vs full-text retrieval`.
4. Wait for the user before starting the next stage.

When a stage changes retrieval, run `npm run eval -- --label <name>` and commit the result file in `eval/results/`.

## Code conventions

- **Small and plain.** Write the direct version. Add an abstraction only once a second real use exists. `Embedder` and `ChatModel` are the deliberate exceptions, since providers get swapped in stage 8.
- **Node 24 type stripping, no build step.** Imports use `.ts` extensions. Use only erasable syntax: union types instead of enums, and plain fields instead of parameter properties. `npm run typecheck` runs `tsc --noEmit`.
- **Raw SQL** through `pg`. Schema changes go in a new numbered file in `db/migrations/`. An applied migration is never edited.
- **Every vector query filters on `model`** (ADR 0001). Embedding calls always pass `kind: "query"` or `"document"`.
- **Env access lives in `src/config.ts`.** Each new variable also goes into `.env.example` with a comment.
- **This repo is public.** Machine-specific or private values live only in `.env`: API keys, LAN IPs and hostnames (e.g. the Ollama laptop), and local paths. Committed files and examples use placeholders such as `http://192.168.x.x:11434`.
- **Tests** use Vitest, for pure functions only (maths, parsing, ranking). Retrieval quality is measured by the eval, not by unit tests.
- **Data:** `data/raw/` is gitignored. Wikibooks content is CC BY-SA 4.0, so each recipe keeps its source URL, and the README carries the attribution.
