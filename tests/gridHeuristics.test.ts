import { describe, expect, it } from "vitest";
import type { GridPoint } from "../src/types";
import {
  countBoundaryOpenings,
  getFibonacciTileSizes,
  normalizeGridThickness,
  scoreGridCandidate,
} from "../src/utils/gridHeuristics";

describe("gridHeuristics", () => {
  it("collapses duplicate rows and columns when normalizing thickness", () => {
    const input = [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 1, 1],
      [0, 0, 1, 1],
    ];

    expect(normalizeGridThickness(input)).toEqual([
      [1, 0],
      [0, 1],
    ]);
  });

  it("counts boundary openings across all edges", () => {
    const grid = [
      [1, 0, 1],
      [0, 1, 0],
      [1, 0, 1],
    ];

    expect(countBoundaryOpenings(grid)).toBe(4);
  });

  it("returns fibonacci tile sizes inside the requested range", () => {
    expect(getFibonacciTileSizes(3, 25)).toEqual([3, 5, 8, 13, 21]);
  });

  it("strongly prefers grids with a valid path", () => {
    const grid = Array.from({ length: 9 }, () => Array(9).fill(1));
    const path: GridPoint[] = [
      { row: 0, column: 1 },
      { row: 1, column: 1 },
      { row: 2, column: 1 },
      { row: 3, column: 1 },
    ];

    const scoreWithPath = scoreGridCandidate(grid, path);
    const scoreWithoutPath = scoreGridCandidate(grid, null);

    expect(scoreWithPath).toBeGreaterThan(scoreWithoutPath);
  });
});
