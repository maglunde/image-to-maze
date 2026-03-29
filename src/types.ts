export type Grid = number[][];

export type GridPoint = {
  row: number;
  column: number;
};

export type AnalysisOptions = {
  tileSize: number;
  threshold: number;
  invert: boolean;
  normalizePathWidth: boolean;
};

export type AnalysisResult = {
  width: number;
  height: number;
  processedDataUrl: string;
  grid: Grid;
};
