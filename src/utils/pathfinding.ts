import type { Grid, GridPoint } from "../types";

type MazeFrame = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  openings: [GridPoint, GridPoint];
};

const directions = [
  { row: -1, column: 0 },
  { row: 1, column: 0 },
  { row: 0, column: -1 },
  { row: 0, column: 1 },
];

function pointKey(row: number, column: number): string {
  return `${row}:${column}`;
}

function isWalkable(grid: Grid, row: number, column: number, walkableValue: 0 | 1): boolean {
  return (
    row >= 0 &&
    row < grid.length &&
    column >= 0 &&
    column < grid[0].length &&
    grid[row][column] === walkableValue
  );
}

function getPerimeterPoints(top: number, right: number, bottom: number, left: number): GridPoint[] {
  const points: GridPoint[] = [];

  for (let column = left; column <= right; column += 1) {
    points.push({ row: top, column });
  }

  for (let row = top + 1; row <= bottom; row += 1) {
    points.push({ row, column: right });
  }

  for (let column = right - 1; column >= left; column -= 1) {
    points.push({ row: bottom, column });
  }

  for (let row = bottom - 1; row > top; row -= 1) {
    points.push({ row, column: left });
  }

  return points;
}

function mergeWrappedGroups(groups: GridPoint[][]): GridPoint[][] {
  if (groups.length < 2) {
    return groups;
  }

  const first = groups[0][0];
  const last = groups[groups.length - 1][groups[groups.length - 1].length - 1];
  const areAdjacent =
    (Math.abs(first.row - last.row) === 1 && first.column === last.column) ||
    (Math.abs(first.column - last.column) === 1 && first.row === last.row);

  if (!areAdjacent) {
    return groups;
  }

  const merged = [...groups];
  merged[0] = [...groups[groups.length - 1], ...groups[0]];
  merged.pop();
  return merged;
}

function getOpeningGroups(grid: Grid, perimeter: GridPoint[], walkableValue: 0 | 1): GridPoint[][] {
  const groups: GridPoint[][] = [];
  let currentGroup: GridPoint[] = [];

  for (const point of perimeter) {
    if (grid[point.row][point.column] === walkableValue) {
      currentGroup.push(point);
      continue;
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
      currentGroup = [];
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return mergeWrappedGroups(groups);
}

function getRepresentativePoint(points: GridPoint[]): GridPoint {
  return points[Math.floor(points.length / 2)];
}

function scoreFrame(
  grid: Grid,
  top: number,
  right: number,
  bottom: number,
  left: number,
  wallValue: 0 | 1,
  walkableValue: 0 | 1,
): MazeFrame | null {
  const perimeter = getPerimeterPoints(top, right, bottom, left);
  const wallCount = perimeter.reduce(
    (sum, point) => sum + (grid[point.row][point.column] === wallValue ? 1 : 0),
    0,
  );
  const wallRatio = wallCount / perimeter.length;
  const openingGroups = getOpeningGroups(grid, perimeter, walkableValue);

  if (wallRatio < 0.8 || openingGroups.length !== 2) {
    return null;
  }

  return {
    top,
    right,
    bottom,
    left,
    openings: [
      getRepresentativePoint(openingGroups[0]),
      getRepresentativePoint(openingGroups[1]),
    ],
  };
}

type RowCandidate = {
  row: number;
  left: number;
  right: number;
};

function findRowCandidates(grid: Grid, minSideLength: number, wallValue: 0 | 1): RowCandidate[] {
  const candidates: RowCandidate[] = [];

  for (let row = 0; row < grid.length; row += 1) {
    let left = -1;
    let right = -1;
    let wallCount = 0;

    for (let column = 0; column < grid[row].length; column += 1) {
      if (grid[row][column] !== wallValue) {
        continue;
      }

      if (left === -1) {
        left = column;
      }

      right = column;
      wallCount += 1;
    }

    if (left === -1 || right === -1) {
      continue;
    }

    const width = right - left + 1;
    const density = wallCount / width;

    if (width >= minSideLength && density >= 0.7) {
      candidates.push({ row, left, right });
    }
  }

  return candidates;
}

function findMazeFrame(grid: Grid, wallValue: 0 | 1, walkableValue: 0 | 1): MazeFrame | null {
  if (grid.length === 0 || grid[0].length === 0) {
    return null;
  }

  const rows = grid.length;
  const minSideLength = Math.max(8, Math.floor(Math.min(rows, grid[0].length) * 0.25));
  const rowCandidates = findRowCandidates(grid, minSideLength, wallValue);
  const edgeTolerance = 3;
  let bestFrame: MazeFrame | null = null;
  let bestArea = -1;

  for (let topIndex = 0; topIndex < rowCandidates.length; topIndex += 1) {
    for (let bottomIndex = topIndex + 1; bottomIndex < rowCandidates.length; bottomIndex += 1) {
      const topCandidate = rowCandidates[topIndex];
      const bottomCandidate = rowCandidates[bottomIndex];
      const height = bottomCandidate.row - topCandidate.row + 1;

      if (height < minSideLength) {
        continue;
      }

      if (
        Math.abs(topCandidate.left - bottomCandidate.left) > edgeTolerance ||
        Math.abs(topCandidate.right - bottomCandidate.right) > edgeTolerance
      ) {
        continue;
      }

      const left = Math.max(topCandidate.left, bottomCandidate.left);
      const right = Math.min(topCandidate.right, bottomCandidate.right);
      const width = right - left + 1;

      if (width < minSideLength) {
        continue;
      }

      const candidate = scoreFrame(
        grid,
        topCandidate.row,
        right,
        bottomCandidate.row,
        left,
        wallValue,
        walkableValue,
      );

      if (!candidate) {
        continue;
      }

      const area = width * height;

      if (area > bestArea) {
        bestFrame = candidate;
        bestArea = area;
      }
    }
  }

  return bestFrame;
}

function isPlausibleFrame(grid: Grid, frame: MazeFrame): boolean {
  const gridHeight = grid.length;
  const gridWidth = grid[0]?.length ?? 0;
  const frameHeight = frame.bottom - frame.top + 1;
  const frameWidth = frame.right - frame.left + 1;
  const areaRatio = (frameWidth * frameHeight) / Math.max(1, gridWidth * gridHeight);
  const widthRatio = frameWidth / Math.max(1, gridWidth);
  const heightRatio = frameHeight / Math.max(1, gridHeight);

  return areaRatio >= 0.35 && widthRatio >= 0.55 && heightRatio >= 0.55;
}

function reconstructPath(
  predecessors: Map<string, string>,
  start: GridPoint,
  end: GridPoint,
): GridPoint[] {
  const path: GridPoint[] = [];
  const startKey = pointKey(start.row, start.column);
  let currentKey = pointKey(end.row, end.column);

  while (true) {
    const [row, column] = currentKey.split(":").map(Number);
    path.push({ row, column });

    if (currentKey === startKey) {
      break;
    }

    const previousKey = predecessors.get(currentKey);

    if (!previousKey) {
      return [];
    }

    currentKey = previousKey;
  }

  path.reverse();
  return path;
}

function bfsWithinFrame(grid: Grid, frame: MazeFrame, walkableValue: 0 | 1): GridPoint[] | null {
  const [start, end] = frame.openings;
  const queue: GridPoint[] = [start];
  const visited = new Set<string>([pointKey(start.row, start.column)]);
  const predecessors = new Map<string, string>();
  const endKey = pointKey(end.row, end.column);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const currentKey = pointKey(current.row, current.column);

    if (currentKey === endKey) {
      return reconstructPath(predecessors, start, end);
    }

    for (const direction of directions) {
      const nextRow = current.row + direction.row;
      const nextColumn = current.column + direction.column;
      const nextKey = pointKey(nextRow, nextColumn);

      if (
        nextRow < frame.top ||
        nextRow > frame.bottom ||
        nextColumn < frame.left ||
        nextColumn > frame.right ||
        !isWalkable(grid, nextRow, nextColumn, walkableValue) ||
        visited.has(nextKey)
      ) {
        continue;
      }

      visited.add(nextKey);
      predecessors.set(nextKey, currentKey);
      queue.push({ row: nextRow, column: nextColumn });
    }
  }

  return null;
}

function solveWithPolarity(
  grid: Grid,
  wallValue: 0 | 1,
  walkableValue: 0 | 1,
): GridPoint[] | null {
  const frame = findMazeFrame(grid, wallValue, walkableValue);

  if (!frame || !isPlausibleFrame(grid, frame)) {
    return null;
  }

  return bfsWithinFrame(grid, frame, walkableValue);
}

export function findMazePath(grid: Grid): GridPoint[] | null {
  return solveWithPolarity(grid, 1, 0);
}
