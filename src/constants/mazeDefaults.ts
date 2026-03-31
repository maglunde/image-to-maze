import type { AnalysisOptions, PreviewColors } from "../types";

export const defaultAnalysisOptions: AnalysisOptions = {
  tileSize: 12,
  threshold: 128,
  invert: false,
  normalizePathWidth: true,
};

export const defaultPreviewColors: PreviewColors = {
  path: "#ef4444",
  wall: "#0f172a",
  walkable: "#ecfeff",
};
