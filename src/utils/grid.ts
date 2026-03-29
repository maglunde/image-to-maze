import type { Grid } from "../types";

export function formatGridAsAscii(grid: Grid): string {
  return grid.map((row) => row.map((cell) => (cell === 1 ? "#" : ".")).join("")).join("\n");
}

export function formatGridAsMatrix(grid: Grid): string {
  if (grid.length === 0) {
    return "";
  }

  return grid.map((row) => row.join(" ")).join("\n");
}

export function formatGridAsJson(grid: Grid): string {
  return JSON.stringify(grid, null, 2);
}
