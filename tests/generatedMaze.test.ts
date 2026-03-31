import { describe, expect, it } from "vitest";
import type { Grid } from "../src/types";
import { remapBoundaryOpening, resolveGeneratedOpenings } from "../src/utils/generatedMaze";

describe("generatedMaze helpers", () => {
  it("remaps top-edge openings proportionally to the new width", () => {
    expect(remapBoundaryOpening({ row: 0, column: 5 }, 11, 11, 21, 21)).toEqual({
      row: 0,
      column: 10,
    });
  });

  it("falls back to maze openings when remapped openings collide", () => {
    const rawMaze: Grid = [
      [1, 0, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 0, 1],
    ];
    const previousBaseGrid: Grid = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
    ];
    const previousOpenings = [
      { row: 0, column: 1 },
      { row: 0, column: 1 },
    ];

    expect(resolveGeneratedOpenings(rawMaze, previousBaseGrid, previousOpenings)).toEqual([
      { row: 0, column: 1 },
      { row: 4, column: 3 },
    ]);
  });
});
