import type { Grid, GridPoint } from "../types";

function rowsEqual(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

export function normalizeGridThickness(grid: Grid): Grid {
  if (grid.length === 0 || grid[0].length === 0) {
    return grid;
  }

  const collapsedRows = grid.filter((row, index) => index === 0 || !rowsEqual(row, grid[index - 1]));
  const collapsedColumns = collapsedRows[0]
    .map((_, columnIndex) => collapsedRows.map((row) => row[columnIndex]))
    .filter((column, index, columns) => index === 0 || !rowsEqual(column, columns[index - 1]));

  return collapsedRows.map((_, rowIndex) => collapsedColumns.map((column) => column[rowIndex]));
}

export function countBoundaryOpenings(grid: Grid): number {
  if (grid.length === 0 || grid[0].length === 0) {
    return 0;
  }

  const rows = grid.length;
  const columns = grid[0].length;
  let openings = 0;

  for (let column = 0; column < columns; column += 1) {
    if (grid[0][column] === 0) {
      openings += 1;
    }

    if (grid[rows - 1][column] === 0) {
      openings += 1;
    }
  }

  for (let row = 1; row < rows - 1; row += 1) {
    if (grid[row][0] === 0) {
      openings += 1;
    }

    if (grid[row][columns - 1] === 0) {
      openings += 1;
    }
  }

  return openings;
}

export function getFibonacciTileSizes(minTileSize: number, maxTileSize: number): number[] {
  const sizes = new Set<number>();
  let previous = 1;
  let current = 1;

  while (previous <= maxTileSize) {
    sizes.add(previous);
    [previous, current] = [current, previous + current];
  }

  return [...sizes].filter((value) => value >= minTileSize && value <= maxTileSize).sort((a, b) => a - b);
}

export function scoreGridCandidate(grid: Grid, path: GridPoint[] | null): number {
  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;

  if (rows === 0 || columns === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  const cellCount = rows * columns;
  const wallCount = grid.reduce(
    (sum, row) => sum + row.reduce((rowSum, cell) => rowSum + cell, 0),
    0,
  );
  const wallRatio = wallCount / cellCount;
  const boundaryOpenings = countBoundaryOpenings(grid);
  let score = 0;

  if (path) {
    score += 100000;
    score += path.length * 20;
  }

  score -= Math.abs(boundaryOpenings - 2) * 3000;
  score -= Math.abs(wallRatio - 0.42) * 2000;

  if (Math.min(rows, columns) < 8) {
    score -= 4000;
  }

  return score;
}
