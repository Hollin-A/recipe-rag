import { describe, expect, it } from "vitest";
import { cosineSimilarity, vectorLength } from "../math/cosine.ts";
import { createFakeEmbedder } from "./fake.ts";

describe("fake embedder", () => {
  const embedder = createFakeEmbedder();

  it("returns one unit-length vector per text, in order", async () => {
    const { vectors, dimensions } = await embedder.embed(["tomato soup", "apple pie"], "document");
    expect(vectors).toHaveLength(2);
    expect(vectors[0]).toHaveLength(dimensions);
    expect(vectorLength(vectors[0]!)).toBeCloseTo(1);
  });

  it("is deterministic", async () => {
    const a = await embedder.embed(["tomato soup"], "document");
    const b = await embedder.embed(["tomato soup"], "query");
    expect(a.vectors).toEqual(b.vectors);
  });

  it("scores texts that share words above texts that don't", async () => {
    const { vectors } = await embedder.embed(
      ["roast the tomato", "tomato soup", "chocolate cake"],
      "document",
    );
    const [roast, soup, cake] = vectors as [number[], number[], number[]];
    expect(cosineSimilarity(roast, soup)).toBeGreaterThan(cosineSimilarity(roast, cake));
  });
});
