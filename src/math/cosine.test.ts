import { describe, expect, it } from "vitest";
import { cosineSimilarity } from "./cosine.ts";

describe("cosineSimilarity", () => {
  it("is 1 for vectors pointing the same way", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it("ignores length, only direction counts", () => {
    expect(cosineSimilarity([1, 2, 3], [10, 20, 30])).toBeCloseTo(1);
  });

  it("is 0 for perpendicular vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("is -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 2], [-1, -2])).toBeCloseTo(-1);
  });

  it("rejects vectors of different lengths", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(/lengths differ/);
  });

  it("rejects the zero vector", () => {
    expect(() => cosineSimilarity([0, 0], [1, 1])).toThrow(/zero vector/);
  });
});
