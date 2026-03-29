import type { GridPoint, PathRenderMode } from "../types";

type RenderPoint = {
  x: number;
  y: number;
};

function getCenterPoint(point: GridPoint, cellSize: number, offset: number): RenderPoint {
  return {
    x: offset + point.column * cellSize + cellSize / 2,
    y: offset + point.row * cellSize + cellSize / 2,
  };
}

export function buildSvgPathData(
  path: GridPoint[],
  cellSize: number,
  offset: number,
  _mode: PathRenderMode,
): string {
  if (path.length === 0) {
    return "";
  }

  const points = path.map((point) => getCenterPoint(point, cellSize, offset));
  const commands = [`M ${points[0].x} ${points[0].y}`];

  for (let index = 1; index < points.length; index += 1) {
    commands.push(`L ${points[index].x} ${points[index].y}`);
  }

  return commands.join(" ");
}

export function traceCanvasPath(
  context: CanvasRenderingContext2D,
  path: GridPoint[],
  cellSize: number,
  offset: number,
  _mode: PathRenderMode,
): void {
  if (path.length === 0) {
    return;
  }

  const points = path.map((point) => getCenterPoint(point, cellSize, offset));
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);

  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
}
