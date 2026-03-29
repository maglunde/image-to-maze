import type { Grid } from "../types";
import type { GridPoint } from "../types";

function normalizeDimension(value: number): number {
  const safe = Math.max(5, Math.floor(value));
  return safe % 2 === 0 ? safe + 1 : safe;
}

function randomOddWithin(limit: number): number {
  const maxIndex = Math.max(0, Math.floor((limit - 3) / 2));
  return 1 + Math.floor(Math.random() * (maxIndex + 1)) * 2;
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

export function generateMaze(width: number, height: number): Grid {
  const columns = normalizeDimension(width);
  const rows = normalizeDimension(height);
  const grid: Grid = Array.from({ length: rows }, () => Array(columns).fill(1));
  const visited = new Set<string>();
  const stack: Array<{ row: number; column: number }> = [];
  const start = {
    row: randomOddWithin(rows),
    column: randomOddWithin(columns),
  };

  const visit = (row: number, column: number) => {
    visited.add(`${row}:${column}`);
    grid[row][column] = 0;
    stack.push({ row, column });
  };

  visit(start.row, start.column);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const candidates = shuffle([
      { row: current.row - 2, column: current.column, wallRow: current.row - 1, wallColumn: current.column },
      { row: current.row + 2, column: current.column, wallRow: current.row + 1, wallColumn: current.column },
      { row: current.row, column: current.column - 2, wallRow: current.row, wallColumn: current.column - 1 },
      { row: current.row, column: current.column + 2, wallRow: current.row, wallColumn: current.column + 1 },
    ]).filter(
      (candidate) =>
        candidate.row > 0 &&
        candidate.row < rows - 1 &&
        candidate.column > 0 &&
        candidate.column < columns - 1 &&
        !visited.has(`${candidate.row}:${candidate.column}`),
    );

    if (candidates.length === 0) {
      stack.pop();
      continue;
    }

    const next = candidates[0];
    grid[next.wallRow][next.wallColumn] = 0;
    visit(next.row, next.column);
  }

  for (let column = 0; column < columns; column += 1) {
    grid[0][column] = 1;
    grid[rows - 1][column] = 1;
  }

  for (let row = 0; row < rows; row += 1) {
    grid[row][0] = 1;
    grid[row][columns - 1] = 1;
  }

  let entryColumn = 1;

  for (let column = 1; column < columns - 1; column += 1) {
    if (grid[1][column] === 0) {
      entryColumn = column;
      break;
    }
  }

  let exitColumn = columns - 2;

  for (let column = columns - 2; column >= 1; column -= 1) {
    if (grid[rows - 2][column] === 0) {
      exitColumn = column;
      break;
    }
  }

  grid[0][entryColumn] = 0;
  grid[rows - 1][exitColumn] = 0;

  return grid;
}

export function invertGeneratedMaze(grid: Grid): Grid {
  if (grid.length === 0 || grid[0].length === 0) {
    return grid;
  }

  const rows = grid.length;
  const columns = grid[0].length;
  const openings: Array<{ row: number; column: number }> = [];

  for (let column = 0; column < columns; column += 1) {
    if (grid[0][column] === 0) {
      openings.push({ row: 0, column });
    }
    if (grid[rows - 1][column] === 0) {
      openings.push({ row: rows - 1, column });
    }
  }

  for (let row = 1; row < rows - 1; row += 1) {
    if (grid[row][0] === 0) {
      openings.push({ row, column: 0 });
    }
    if (grid[row][columns - 1] === 0) {
      openings.push({ row, column: columns - 1 });
    }
  }

  const inverted = grid.map((row, rowIndex) =>
    row.map((cell, columnIndex) => {
      const isBoundary =
        rowIndex === 0 || rowIndex === rows - 1 || columnIndex === 0 || columnIndex === columns - 1;

      if (isBoundary) {
        return 1;
      }

      return cell === 1 ? 0 : 1;
    }),
  );

  for (const opening of openings.slice(0, 2)) {
    inverted[opening.row][opening.column] = 0;
  }

  return inverted;
}

export function sealMazeBoundary(grid: Grid): Grid {
  if (grid.length === 0 || grid[0].length === 0) {
    return grid;
  }

  const rows = grid.length;
  const columns = grid[0].length;
  const sealed = grid.map((row) => [...row]);

  for (let column = 0; column < columns; column += 1) {
    sealed[0][column] = 1;
    sealed[rows - 1][column] = 1;
  }

  for (let row = 0; row < rows; row += 1) {
    sealed[row][0] = 1;
    sealed[row][columns - 1] = 1;
  }

  return sealed;
}

export function getBoundaryOpenings(grid: Grid): GridPoint[] {
  if (grid.length === 0 || grid[0].length === 0) {
    return [];
  }

  const rows = grid.length;
  const columns = grid[0].length;
  const openings: GridPoint[] = [];

  for (let column = 0; column < columns; column += 1) {
    if (grid[0][column] === 0) {
      openings.push({ row: 0, column });
    }
    if (grid[rows - 1][column] === 0) {
      openings.push({ row: rows - 1, column });
    }
  }

  for (let row = 1; row < rows - 1; row += 1) {
    if (grid[row][0] === 0) {
      openings.push({ row, column: 0 });
    }
    if (grid[row][columns - 1] === 0) {
      openings.push({ row, column: columns - 1 });
    }
  }

  return openings;
}

export function applyBoundaryOpenings(grid: Grid, openings: GridPoint[]): Grid {
  if (grid.length === 0 || grid[0].length === 0 || openings.length < 2) {
    return grid;
  }

  const nextGrid = sealMazeBoundary(grid);

  for (const opening of openings.slice(0, 2)) {
    nextGrid[opening.row][opening.column] = 0;
  }

  return nextGrid;
}

export function moveBoundaryOpening(
  baseGrid: Grid,
  openings: GridPoint[],
  openingIndex: number,
  target: GridPoint,
): { grid: Grid; openings: GridPoint[] } {
  if (openings.length < 2 || openingIndex < 0 || openingIndex >= openings.length) {
    return { grid: baseGrid, openings };
  }

  const rows = baseGrid.length;
  const columns = baseGrid[0].length;
  const clampedTarget = {
    row: Math.max(0, Math.min(rows - 1, target.row)),
    column: Math.max(0, Math.min(columns - 1, target.column)),
  };
  const isBoundaryTarget =
    clampedTarget.row === 0 ||
    clampedTarget.row === rows - 1 ||
    clampedTarget.column === 0 ||
    clampedTarget.column === columns - 1;

  if (!isBoundaryTarget) {
    return { grid: baseGrid, openings };
  }

  const nextOpenings = openings.map((opening, index) =>
    index === openingIndex ? clampedTarget : opening,
  );
  const otherOpening = nextOpenings[openingIndex === 0 ? 1 : 0];

  if (otherOpening.row === clampedTarget.row && otherOpening.column === clampedTarget.column) {
    return { grid: applyBoundaryOpenings(baseGrid, openings), openings };
  }

  return {
    grid: applyBoundaryOpenings(baseGrid, nextOpenings),
    openings: nextOpenings,
  };
}
