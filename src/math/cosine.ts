// Cosine similarity: the cosine of the angle between two vectors.
//   1  → pointing the same way (same meaning, as far as the model can tell)
//   0  → unrelated (perpendicular)
//  -1  → opposite
// Length is ignored: only direction counts. That's why many models return
// unit-length vectors, where cosine similarity is simply the dot product.

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector lengths differ (${a.length} vs ${b.length}): different models?`);
  }
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;

  const lengths = vectorLength(a) * vectorLength(b);
  if (lengths === 0) throw new Error("Cosine similarity is undefined for a zero vector.");
  return dot / lengths;
}

export function vectorLength(v: number[]): number {
  return Math.hypot(...v);
}
