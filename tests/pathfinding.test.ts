import { describe, expect, it } from "vitest";
import { findMazePath } from "../src/utils/pathfinding";

describe("findMazePath", () => {
  it("finds a path through a framed maze with two openings", () => {
    const grid = [
      [1, 0, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 0, 1],
    ];

    const path = findMazePath(grid);

    expect(path).not.toBeNull();
    expect(path?.[0]).toEqual({ row: 0, column: 1 });
    expect(path?.at(-1)).toEqual({ row: 8, column: 7 });
  });

  it("returns null when the frame does not expose exactly two openings", () => {
    const grid = [
      [1, 0, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 0, 1],
    ];

    expect(findMazePath(grid)).toBeNull();
  });
});
