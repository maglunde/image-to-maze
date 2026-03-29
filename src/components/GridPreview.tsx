import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Grid, GridPoint } from "../types";

type GridPreviewProps = {
  grid: Grid;
  path?: GridPoint[] | null;
  openings?: GridPoint[];
  openingsDraggable?: boolean;
  onMoveOpening?: (openingIndex: number, target: GridPoint) => void;
  previewWidth?: number;
  previewHeight?: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function GridPreview({
  grid,
  path,
  openings = [],
  openingsDraggable = false,
  onMoveOpening,
  previewWidth,
  previewHeight,
}: GridPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [activeOpeningIndex, setActiveOpeningIndex] = useState<number | null>(null);
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

    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    canvas.style.aspectRatio = `${columns} / ${rows}`;
    context.clearRect(0, 0, pixelWidth, pixelHeight);

    if (sampleScale === 1) {
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          context.fillStyle = grid[row][column] === 0 ? "#ecfeff" : "#0f172a";
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
          const color = value === 0 ? 236 : 15;
          const green = value === 0 ? 254 : 23;
          const blue = value === 0 ? 255 : 42;

          imageData.data[index] = color;
          imageData.data[index + 1] = green;
          imageData.data[index + 2] = blue;
          imageData.data[index + 3] = 255;
        }
      }

      context.putImageData(imageData, 0, 0);
    }

    if (path && path.length > 1) {
      const lineThickness = 2;
      const pointRadius = 2.5;
      context.fillStyle = "#ff5a5f";

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

      for (let index = 1; index < path.length; index += 1) {
        const previous = toPixelPoint(path[index - 1].row, path[index - 1].column);
        const current = toPixelPoint(path[index].row, path[index].column);

        if (previous.y === current.y) {
          const left = Math.min(previous.x, current.x);
          const width = Math.max(lineThickness, Math.abs(current.x - previous.x));
          context.fillRect(left, previous.y - lineThickness / 2, width, lineThickness);
        } else if (previous.x === current.x) {
          const top = Math.min(previous.y, current.y);
          const height = Math.max(lineThickness, Math.abs(current.y - previous.y));
          context.fillRect(previous.x - lineThickness / 2, top, lineThickness, height);
        } else {
          context.fillRect(current.x - lineThickness / 2, current.y - lineThickness / 2, lineThickness, lineThickness);
        }
      }

      const start = path[0];
      const end = path[path.length - 1];
      const startPoint = toPixelPoint(start.row, start.column);
      const endPoint = toPixelPoint(end.row, end.column);

      context.beginPath();
      context.arc(startPoint.x, startPoint.y, pointRadius, 0, Math.PI * 2);
      context.fill();

      context.beginPath();
      context.arc(endPoint.x, endPoint.y, pointRadius, 0, Math.PI * 2);
      context.fill();
    }
  }, [grid, path, hasGrid]);

  const aspectWidth = previewWidth ?? columns;
  const aspectHeight = previewHeight ?? rows;
  const previewStyle = {
    "--preview-ratio": String(aspectWidth / aspectHeight),
  } as CSSProperties;

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
    return <div className="empty-state">Ingen grid tilgjengelig ennå.</div>;
  }

  return (
    <div className="grid-preview-shell">
      <div ref={frameRef} className="grid-preview-frame" style={previewStyle}>
        <canvas ref={canvasRef} className="grid-preview-canvas" />
        {openingsDraggable
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
                  title={index === 0 ? "Dra inngangen" : "Dra utgangen"}
                />
              );
            })
          : null}
      </div>
    </div>
  );
}
