import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Grid, GridPoint, PathRenderMode, PreviewColors } from "../types";

type GridPreviewProps = {
  grid: Grid;
  path?: GridPoint[] | null;
  pathRenderMode?: PathRenderMode;
  animationProgress?: number;
  colors: PreviewColors;
  openings?: GridPoint[];
  showOpeningHandles?: boolean;
  openingsDraggable?: boolean;
  onMoveOpening?: (openingIndex: number, target: GridPoint) => void;
  previewWidth?: number;
  previewHeight?: number;
  className?: string;
};

function hexToRgb(color: string): { red: number; green: number; blue: number } {
  const normalized = color.replace("#", "");

  if (normalized.length !== 6) {
    return { red: 0, green: 0, blue: 0 };
  }

  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getInterpolatedPoint(path: GridPoint[], progress: number, cellSize: number): { x: number; y: number } {
  const clampedProgress = clamp(progress, 0, path.length - 1);
  const startIndex = Math.floor(clampedProgress);
  const endIndex = Math.min(path.length - 1, Math.ceil(clampedProgress));
  const mix = clampedProgress - startIndex;
  const start = path[startIndex];
  const end = path[endIndex];
  const startX = start.column * cellSize + cellSize / 2;
  const startY = start.row * cellSize + cellSize / 2;
  const endX = end.column * cellSize + cellSize / 2;
  const endY = end.row * cellSize + cellSize / 2;

  return {
    x: startX + (endX - startX) * mix,
    y: startY + (endY - startY) * mix,
  };
}

function drawCrispSegment(
  context: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  thickness: number,
): void {
  const roundedThickness = Math.max(2, Math.round(thickness));

  if (from.x === to.x) {
    const left = Math.round(from.x - roundedThickness / 2);
    const top = Math.round(Math.min(from.y, to.y) - roundedThickness / 2);
    const height = Math.max(roundedThickness, Math.round(Math.abs(to.y - from.y) + roundedThickness));
    context.fillRect(left, top, roundedThickness, height);
    return;
  }

  if (from.y === to.y) {
    const left = Math.round(Math.min(from.x, to.x) - roundedThickness / 2);
    const top = Math.round(from.y - roundedThickness / 2);
    const width = Math.max(roundedThickness, Math.round(Math.abs(to.x - from.x) + roundedThickness));
    context.fillRect(left, top, width, roundedThickness);
    return;
  }

  context.fillRect(
    Math.round(to.x - roundedThickness / 2),
    Math.round(to.y - roundedThickness / 2),
    roundedThickness,
    roundedThickness,
  );
}

function drawCrispPathSegment(
  context: CanvasRenderingContext2D,
  path: GridPoint[],
  startProgress: number,
  endProgress: number,
  cellSize: number,
  thickness: number,
): void {
  const safeStart = clamp(startProgress, 0, path.length - 1);
  const safeEnd = clamp(endProgress, 0, path.length - 1);

  if (safeEnd <= safeStart) {
    return;
  }

  let previous = getInterpolatedPoint(path, safeStart, cellSize);

  for (let index = Math.ceil(safeStart); index <= Math.floor(safeEnd); index += 1) {
    const point = path[Math.min(index, path.length - 1)];
    const current = {
      x: point.column * cellSize + cellSize / 2,
      y: point.row * cellSize + cellSize / 2,
    };
    drawCrispSegment(context, previous, current, thickness);
    previous = current;
  }

  const endPoint = getInterpolatedPoint(path, safeEnd, cellSize);
  drawCrispSegment(context, previous, endPoint, thickness);
}

export function GridPreview({
  grid,
  path,
  pathRenderMode = "center",
  animationProgress = 0,
  colors,
  openings = [],
  showOpeningHandles = true,
  openingsDraggable = false,
  onMoveOpening,
  previewWidth,
  previewHeight,
  className,
}: GridPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [activeOpeningIndex, setActiveOpeningIndex] = useState<number | null>(null);
  const [isBoundaryHover, setIsBoundaryHover] = useState(false);
  const hasGrid = grid.length > 0 && (grid[0]?.length ?? 0) > 0;
  const columns = hasGrid ? grid[0].length : 1;
  const rows = hasGrid ? grid.length : 1;

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !hasGrid) {
      return;
    }
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const maxPreviewWidth = 1200;
    const maxPreviewHeight = 1200;
    const sampleScale = Math.max(1, Math.ceil(Math.max(columns / maxPreviewWidth, rows / maxPreviewHeight)));
    const maxCellSize = Math.floor(
      Math.min(maxPreviewWidth / Math.max(columns, 1), maxPreviewHeight / Math.max(rows, 1)),
    );
    const expandedCellSizeBase = sampleScale === 1 ? Math.min(8, Math.max(1, maxCellSize)) : 1;
    const expandedCellSize =
      expandedCellSizeBase > 1 && expandedCellSizeBase % 2 === 1
        ? expandedCellSizeBase - 1
        : expandedCellSizeBase;
    const renderCellSize = Math.max(1, expandedCellSize);
    const pixelWidth =
      sampleScale === 1 ? columns * renderCellSize : Math.max(1, Math.floor(columns / sampleScale));
    const pixelHeight =
      sampleScale === 1 ? rows * renderCellSize : Math.max(1, Math.floor(rows / sampleScale));
    const wallColor = hexToRgb(colors.wall);
    const walkableColor = hexToRgb(colors.walkable);

    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    canvas.style.aspectRatio = `${columns} / ${rows}`;
    context.clearRect(0, 0, pixelWidth, pixelHeight);

    if (sampleScale === 1) {
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          context.fillStyle = grid[row][column] === 0 ? colors.walkable : colors.wall;
          context.fillRect(
            column * renderCellSize,
            row * renderCellSize,
            renderCellSize,
            renderCellSize,
          );
        }
      }
    } else {
      const imageData = context.createImageData(pixelWidth, pixelHeight);

      for (let y = 0; y < pixelHeight; y += 1) {
        const sourceRow = Math.min(rows - 1, y * sampleScale);

        for (let x = 0; x < pixelWidth; x += 1) {
          const sourceColumn = Math.min(columns - 1, x * sampleScale);
          const value = grid[sourceRow][sourceColumn];
          const index = (y * pixelWidth + x) * 4;
          const currentColor = value === 0 ? walkableColor : wallColor;

          imageData.data[index] = currentColor.red;
          imageData.data[index + 1] = currentColor.green;
          imageData.data[index + 2] = currentColor.blue;
          imageData.data[index + 3] = 255;
        }
      }

      context.putImageData(imageData, 0, 0);
    }

    if (path && path.length > 1) {
      const lineThickness = Math.max(2, renderCellSize * 0.35);
      context.fillStyle = colors.path;

      const toPixelPoint = (row: number, column: number) => {
        if (sampleScale === 1) {
          return {
            x: column * renderCellSize + renderCellSize / 2,
            y: row * renderCellSize + renderCellSize / 2,
          };
        }

        return {
          x: Math.min(pixelWidth - 1, Math.floor(column / sampleScale)),
          y: Math.min(pixelHeight - 1, Math.floor(row / sampleScale)),
        };
      };

      if (pathRenderMode === "snake" && sampleScale === 1) {
        const pauseLength = Math.max(10, Math.min(path.length * 0.2, 24));
        const cycleLength = path.length + pauseLength;
        const revealProgress = Math.min(path.length - 1, animationProgress % cycleLength);

        if (revealProgress > 0) {
          drawCrispPathSegment(context, path, 0, revealProgress, renderCellSize, lineThickness);
        }
      } else if (sampleScale === 1) {
        drawCrispPathSegment(context, path, 0, path.length - 1, renderCellSize, lineThickness);
      } else {
        context.strokeStyle = colors.path;
        context.lineWidth = Math.max(2, Math.round(lineThickness));
        context.lineCap = "butt";
        context.lineJoin = "miter";
        context.beginPath();

        path.forEach((point, index) => {
          const current = toPixelPoint(point.row, point.column);

          if (index === 0) {
            context.moveTo(current.x, current.y);
          } else {
            context.lineTo(current.x, current.y);
          }
        });

        context.stroke();
      }
    }
  }, [animationProgress, colors.path, colors.walkable, colors.wall, grid, hasGrid, path, pathRenderMode]);

  const aspectWidth = previewWidth ?? columns;
  const aspectHeight = previewHeight ?? rows;
  const previewStyle = {
    "--preview-ratio": String(aspectWidth / aspectHeight),
  } as CSSProperties;

  const isBoundaryBandTarget = (clientX: number, clientY: number): boolean => {
    const frame = frameRef.current;

    if (!frame) {
      return false;
    }

    const rect = frame.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const y = clamp(clientY - rect.top, 0, rect.height);
    const cellWidth = rect.width / Math.max(columns, 1);
    const cellHeight = rect.height / Math.max(rows, 1);
    const edgeBand = Math.max(12, Math.min(24, Math.max(cellWidth, cellHeight) * 1.25));

    return (
      x <= edgeBand ||
      x >= rect.width - edgeBand ||
      y <= edgeBand ||
      y >= rect.height - edgeBand
    );
  };

  const getBoundaryTarget = (clientX: number, clientY: number): GridPoint | null => {
    const frame = frameRef.current;

    if (!frame) {
      return null;
    }

    const rect = frame.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const y = clamp(clientY - rect.top, 0, rect.height);
    const row = clamp(Math.round((y / rect.height) * rows - 0.5), 0, rows - 1);
    const column = clamp(Math.round((x / rect.width) * columns - 0.5), 0, columns - 1);
    const candidates = [
      { row: 0, column },
      { row: rows - 1, column },
      { row, column: 0 },
      { row, column: columns - 1 },
    ];

    return candidates.reduce((best, candidate) => {
      const candidateX = ((candidate.column + 0.5) / columns) * rect.width;
      const candidateY = ((candidate.row + 0.5) / rows) * rect.height;
      const bestX = ((best.column + 0.5) / columns) * rect.width;
      const bestY = ((best.row + 0.5) / rows) * rect.height;
      const candidateDistance = (candidateX - x) ** 2 + (candidateY - y) ** 2;
      const bestDistance = (bestX - x) ** 2 + (bestY - y) ** 2;
      return candidateDistance < bestDistance ? candidate : best;
    });
  };

  const getNearestOpeningIndex = (target: GridPoint): number | null => {
    if (openings.length < 2) {
      return null;
    }

    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < openings.length; index += 1) {
      const opening = openings[index];
      const distance =
        (opening.row - target.row) * (opening.row - target.row) +
        (opening.column - target.column) * (opening.column - target.column);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }

    return bestIndex;
  };

  useEffect(() => {
    if (activeOpeningIndex === null || !openingsDraggable || !onMoveOpening) {
      return;
    }

    const handlePointerUp = (event: PointerEvent) => {
      const target = getBoundaryTarget(event.clientX, event.clientY);

      if (target) {
        onMoveOpening(activeOpeningIndex, target);
      }

      setActiveOpeningIndex(null);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const target = getBoundaryTarget(event.clientX, event.clientY);

      if (target) {
        onMoveOpening(activeOpeningIndex, target);
      }
    };

    const handlePointerCancel = () => {
      setActiveOpeningIndex(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [activeOpeningIndex, onMoveOpening, openingsDraggable, rows, columns]);

  if (!hasGrid) {
    return <div className="empty-state">No grid available yet.</div>;
  }

  return (
    <div
      className={className ? `grid-preview-shell ${className}` : "grid-preview-shell"}
      style={{ background: colors.walkable }}
    >
      <div
        ref={frameRef}
        className={`grid-preview-frame ${isBoundaryHover ? "is-boundary-hover" : ""}`}
        style={previewStyle}
        onPointerMove={(event) => {
          if (!openingsDraggable) {
            if (isBoundaryHover) {
              setIsBoundaryHover(false);
            }
            return;
          }

          const nextBoundaryHover = isBoundaryBandTarget(event.clientX, event.clientY);

          if (nextBoundaryHover !== isBoundaryHover) {
            setIsBoundaryHover(nextBoundaryHover);
          }
        }}
        onPointerLeave={() => {
          if (isBoundaryHover) {
            setIsBoundaryHover(false);
          }
        }}
        onPointerDown={(event) => {
          if (!openingsDraggable || !onMoveOpening) {
            return;
          }

          const targetElement = event.target as HTMLElement;

          if (targetElement.closest(".opening-handle")) {
            return;
          }

          if (!isBoundaryBandTarget(event.clientX, event.clientY)) {
            return;
          }

          const target = getBoundaryTarget(event.clientX, event.clientY);

          if (!target) {
            return;
          }

          const nearestOpeningIndex = getNearestOpeningIndex(target);

          if (nearestOpeningIndex !== null) {
            onMoveOpening(nearestOpeningIndex, target);
          }
        }}
      >
        <canvas ref={canvasRef} className="grid-preview-canvas" />
        {openingsDraggable && showOpeningHandles
          ? openings.slice(0, 2).map((opening, index) => {
              const markerStyle = {
                left: `${((opening.column + 0.5) / columns) * 100}%`,
                top: `${((opening.row + 0.5) / rows) * 100}%`,
              };

              return (
                <button
                  key={`${opening.row}-${opening.column}-${index}`}
                  type="button"
                  className={`opening-handle ${activeOpeningIndex === index ? "is-dragging" : ""}`}
                  style={markerStyle}
                  onPointerDown={() => setActiveOpeningIndex(index)}
                  title={index === 0 ? "Drag entrance" : "Drag exit"}
                />
              );
            })
          : null}
      </div>
    </div>
  );
}
