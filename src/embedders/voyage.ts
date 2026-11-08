import { setTimeout } from "node:timers/promises";
import type { EmbedKind, Embedder, EmbedResult } from "./embedder.ts";

// Plain fetch against the REST API, so the request is visible. Docs:
// https://docs.voyageai.com/reference/embeddings-api

const MAX_RATE_LIMIT_RETRIES = 5;
const RATE_LIMIT_WAIT_MS = 25_000; // limits are per minute

type VoyageResponse = {
  data: { embedding: number[]; index: number }[];
  model: string;
  usage: { total_tokens: number };
};

export function createVoyageEmbedder(options: { apiKey: string; model: string }): Embedder {
  return {
    model: options.model,

    async embed(texts: string[], kind: EmbedKind): Promise<EmbedResult> {
      const request = () =>
        fetch("https://api.voyageai.com/v1/embeddings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input: texts, model: options.model, input_type: kind }),
        });

      let response = await request();
      for (let attempt = 1; response.status === 429 && attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
        console.log(`  rate limited by Voyage, waiting ${RATE_LIMIT_WAIT_MS / 1000}s…`);
        await setTimeout(RATE_LIMIT_WAIT_MS);
        response = await request();
      }
      if (!response.ok) {
        throw new Error(`Voyage API ${response.status}: ${await response.text()}`);
      }

      const body = (await response.json()) as VoyageResponse;
      const vectors = body.data.toSorted((a, b) => a.index - b.index).map((d) => d.embedding);
      return { model: options.model, dimensions: vectors[0]?.length ?? 0, vectors };
    },
  };
}
