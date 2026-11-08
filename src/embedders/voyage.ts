import type { EmbedKind, Embedder, EmbedResult } from "./embedder.ts";

// Plain fetch against the REST API, so the request is visible. Docs:
// https://docs.voyageai.com/reference/embeddings-api

type VoyageResponse = {
  data: { embedding: number[]; index: number }[];
  model: string;
  usage: { total_tokens: number };
};

export function createVoyageEmbedder(options: { apiKey: string; model: string }): Embedder {
  return {
    model: options.model,

    async embed(texts: string[], kind: EmbedKind): Promise<EmbedResult> {
      const response = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: texts, model: options.model, input_type: kind }),
      });
      if (!response.ok) {
        throw new Error(`Voyage API ${response.status}: ${await response.text()}`);
      }

      const body = (await response.json()) as VoyageResponse;
      const vectors = body.data.toSorted((a, b) => a.index - b.index).map((d) => d.embedding);
      return { model: options.model, dimensions: vectors[0]?.length ?? 0, vectors };
    },
  };
}
