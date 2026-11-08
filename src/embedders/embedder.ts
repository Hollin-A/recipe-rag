import { embedderName, voyageConfig } from "../config.ts";
import { createFakeEmbedder } from "./fake.ts";
import { createVoyageEmbedder } from "./voyage.ts";

// Retrieval models embed the two sides of a search differently: a short
// question ("quick vegan dinner?") and a long passage (a whole recipe). Passing
// the kind lets the provider apply the right treatment (Voyage: input_type;
// nomic-embed-text: a "search_query:" / "search_document:" prefix).
export type EmbedKind = "query" | "document";

export type EmbedResult = {
  model: string; // stored next to every vector: vectors from different models can't be compared
  dimensions: number;
  vectors: number[][]; // same order as the input texts
};

export interface Embedder {
  readonly model: string;
  embed(texts: string[], kind: EmbedKind): Promise<EmbedResult>;
}

export function createEmbedder(): Embedder {
  switch (embedderName()) {
    case "voyage":
      return createVoyageEmbedder(voyageConfig());
    case "fake":
      return createFakeEmbedder();
  }
}
