import { useEffect, useRef, type CSSProperties } from "react";
import type { Grid, GridPoint } from "../types";

type GridPreviewProps = {
  grid: Grid;
  path?: GridPoint[] | null;
  previewWidth?: number;
  previewHeight?: number;
};

export function GridPreview({ grid, path, previewWidth, previewHeight }: GridPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || grid.length === 0 || grid[0].length === 0) {
      return;
    }

    const rows = grid.length;
    const columns = grid[0].length;
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
          context.fillStyle = grid[row][column] === 1 ? "#ecfeff" : "#0f172a";
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
          const color = value === 1 ? 236 : 15;
          const green = value === 1 ? 254 : 23;
          const blue = value === 1 ? 255 : 42;

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
  }, [grid, path]);

  if (grid.length === 0) {
    return <div className="empty-state">Ingen grid tilgjengelig ennå.</div>;
  }

  const columns = grid[0].length;
  const rows = grid.length;
  const aspectWidth = previewWidth ?? columns;
  const aspectHeight = previewHeight ?? rows;
  const previewStyle = {
    "--preview-ratio": String(aspectWidth / aspectHeight),
  } as CSSProperties;

  return (
    <div className="grid-preview-shell">
      <div className="grid-preview-frame" style={previewStyle}>
        <canvas ref={canvasRef} className="grid-preview-canvas" />
      </div>
    </div>
  );
}
