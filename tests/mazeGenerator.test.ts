import { describe, expect, it } from "vitest";
import { findMazePath } from "../src/utils/pathfinding";
import {
  applyBoundaryOpenings,
  generateMaze,
  getBoundaryOpenings,
  moveBoundaryOpening,
  sealMazeBoundary,
  sortBoundaryOpenings,
} from "../src/utils/mazeGenerator";

describe("mazeGenerator", () => {
  it("normalizes generated dimensions to odd values and creates two openings", () => {
    const maze = generateMaze(10, 12);
    const openings = getBoundaryOpenings(maze);

    expect(maze.length % 2).toBe(1);
    expect(maze[0].length % 2).toBe(1);
    expect(openings).toHaveLength(2);
    expect(findMazePath(maze)).not.toBeNull();
  });

  it("applies explicit boundary openings on a sealed maze", () => {
    const base = sealMazeBoundary(generateMaze(15, 15));
    const openings = [
      { row: 0, column: 1 },
      { row: base.length - 1, column: base[0].length - 2 },
    ];

    const maze = applyBoundaryOpenings(base, openings);

    expect(getBoundaryOpenings(maze)).toEqual(openings);
    expect(findMazePath(maze)).not.toBeNull();
  });

  it("ignores invalid corner moves for openings", () => {
    const base = sealMazeBoundary(generateMaze(15, 15));
    const openings = [
      { row: 0, column: 1 },
      { row: base.length - 1, column: base[0].length - 2 },
    ];

    const moved = moveBoundaryOpening(base, openings, 0, { row: 0, column: 0 });

    expect(moved.openings).toEqual(openings);
  });

  it("sorts openings with top, then left, then right, then bottom priority", () => {
    const openings = [
      { row: 6, column: 3 },
      { row: 2, column: 0 },
      { row: 1, column: 6 },
      { row: 0, column: 4 },
    ];

    expect(sortBoundaryOpenings(openings, 7, 7)).toEqual([
      { row: 0, column: 4 },
      { row: 2, column: 0 },
      { row: 1, column: 6 },
      { row: 6, column: 3 },
    ]);
  });
});
