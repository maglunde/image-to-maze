import type { GridPoint } from "../types";

function getBoundaryPriority(point: GridPoint, rows: number, columns: number): number {
  if (point.row === 0) {
    return 0;
  }

  if (point.column === 0) {
    return 1;
  }

  if (point.column === columns - 1) {
    return 2;
  }

  if (point.row === rows - 1) {
    return 3;
  }

  return 4;
}

export function compareBoundaryOpenings(
  left: GridPoint,
  right: GridPoint,
  rows: number,
  columns: number,
): number {
  const leftPriority = getBoundaryPriority(left, rows, columns);
  const rightPriority = getBoundaryPriority(right, rows, columns);

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  switch (leftPriority) {
    case 0:
    case 3:
      if (left.column !== right.column) {
        return left.column - right.column;
      }
      return left.row - right.row;
    case 1:
    case 2:
      if (left.row !== right.row) {
        return left.row - right.row;
      }
      return left.column - right.column;
    default:
      if (left.row !== right.row) {
        return left.row - right.row;
      }
      return left.column - right.column;
  }
}

export function sortBoundaryOpenings(
  openings: GridPoint[],
  rows: number,
  columns: number,
): GridPoint[] {
  return [...openings].sort((left, right) => compareBoundaryOpenings(left, right, rows, columns));
}
