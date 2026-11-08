import type { Embedder, EmbedResult } from "./embedder.ts";

// An offline "embedder" with no understanding of meaning: it counts words.
// Each word is hashed to one of DIMENSIONS slots, and the vector is the
// (normalised) count per slot. Two texts are similar only if they share words.
//
// Used for tests, and as a baseline: run the playground with EMBEDDER=fake to
// see what similarity looks like *without* semantics.

const DIMENSIONS = 256;

export function createFakeEmbedder(): Embedder {
  const model = `fake-bag-of-words-${DIMENSIONS}`;
  return {
    model,

    async embed(texts: string[]): Promise<EmbedResult> {
      // kind is ignored: a bag of words has nothing to adapt for queries.
      return { model, dimensions: DIMENSIONS, vectors: texts.map(bagOfWords) };
    },
  };
}

function bagOfWords(text: string): number[] {
  const vector = new Array<number>(DIMENSIONS).fill(0);
  for (const word of text.toLowerCase().match(/[a-z]+/g) ?? []) {
    const slot = fnv1a(word) % DIMENSIONS;
    vector[slot] = (vector[slot] ?? 0) + 1;
  }
  const length = Math.hypot(...vector);
  return length === 0 ? vector : vector.map((x) => x / length);
}

// A small, well-known string hash. Deterministic, so tests are stable.
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
