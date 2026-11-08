import { describe, expect, it } from "vitest";
import { seededSample } from "./sample.ts";

const items = Array.from({ length: 100 }, (_, i) => i);

describe("seededSample", () => {
  it("returns the same sample for the same seed", () => {
    expect(seededSample(items, 10, 42)).toEqual(seededSample(items, 10, 42));
  });

  it("returns a different sample for another seed", () => {
    expect(seededSample(items, 10, 42)).not.toEqual(seededSample(items, 10, 43));
  });

  it("returns distinct items and leaves the input alone", () => {
    const copy = [...items];
    expect(new Set(seededSample(items, 10, 42)).size).toBe(10);
    expect(items).toEqual(copy);
  });
});
