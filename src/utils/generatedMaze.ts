import type { Grid, GridPoint } from "../types";
import {
  applyBoundaryOpenings,
  generateMaze,
  getBoundaryOpenings,
  sealMazeBoundary,
  sortBoundaryOpenings,
} from "./mazeGenerator";

function pointsEqual(left: GridPoint, right: GridPoint): boolean {
  return left.row === right.row && left.column === right.column;
}

function scaleBoundaryIndex(value: number, previousMax: number, nextMax: number): number {
  if (previousMax <= 0 || nextMax <= 0) {
    return 0;
  }

  return Math.round((value / previousMax) * nextMax);
}

export function remapBoundaryOpening(
  opening: GridPoint,
  previousRows: number,
  previousColumns: number,
  nextRows: number,
  nextColumns: number,
): GridPoint {
  if (opening.row === 0) {
    return {
      row: 0,
      column: scaleBoundaryIndex(opening.column, previousColumns - 1, nextColumns - 1),
    };
  }

  if (opening.row === previousRows - 1) {
    return {
      row: nextRows - 1,
      column: scaleBoundaryIndex(opening.column, previousColumns - 1, nextColumns - 1),
    };
  }

  if (opening.column === 0) {
    return {
      row: scaleBoundaryIndex(opening.row, previousRows - 1, nextRows - 1),
      column: 0,
    };
  }

  return {
    row: scaleBoundaryIndex(opening.row, previousRows - 1, nextRows - 1),
    column: nextColumns - 1,
  };
}

export function resolveGeneratedOpenings(
  rawMaze: Grid,
  previousBaseGrid: Grid,
  previousOpenings: GridPoint[],
): GridPoint[] {
  const fallbackOpenings = getBoundaryOpenings(rawMaze).slice(0, 2);
  const baseGrid = sealMazeBoundary(rawMaze);
  const previousRows = previousBaseGrid.length;
  const previousColumns = previousBaseGrid[0]?.length ?? 0;
  const nextRows = baseGrid.length;
  const nextColumns = baseGrid[0]?.length ?? 0;
  const nextOpenings =
    previousOpenings.length >= 2 && previousRows > 0 && previousColumns > 0
      ? sortBoundaryOpenings(
          previousOpenings.slice(0, 2).map((opening) =>
            remapBoundaryOpening(opening, previousRows, previousColumns, nextRows, nextColumns),
          ),
        )
      : fallbackOpenings;

  if (nextOpenings.length < 2 || pointsEqual(nextOpenings[0], nextOpenings[1])) {
    return fallbackOpenings;
  }

  return sortBoundaryOpenings(nextOpenings);
}

export function buildGeneratedMazeState(
  width: number,
  height: number,
  previousBaseGrid: Grid,
  previousOpenings: GridPoint[],
): { baseGrid: Grid; grid: Grid; openings: GridPoint[] } {
  const rawMaze = generateMaze(width, height);
  const baseGrid = sealMazeBoundary(rawMaze);
  const openings = resolveGeneratedOpenings(rawMaze, previousBaseGrid, previousOpenings);

  return {
    baseGrid,
    grid: applyBoundaryOpenings(baseGrid, openings),
    openings,
  };
}
