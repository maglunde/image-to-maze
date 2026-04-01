import { Fragment, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import type { Grid, GridPoint, PathRenderMode, PreviewColors } from "../types";

type OutputSidebarProps = {
  showPath: boolean;
  onShowPathChange: (value: boolean) => void;
  pathRenderMode: PathRenderMode;
  onPathRenderModeChange: (mode: PathRenderMode) => void;
  snakeSpeed: number;
  onSnakeSpeedChange: (value: number) => void;
  previewColors: PreviewColors;
  setPreviewColors: Dispatch<SetStateAction<PreviewColors>>;
  grid: Grid;
  isExporting: boolean;
  onExport: (format: "svg" | "png" | "pdf") => Promise<void>;
  path: GridPoint[] | null;
  asciiGrid: string;
  matrixGrid: string;
  pathPoints: Set<string>;
  onCopyAscii: () => void;
  onCopyGridJson: () => void;
};

export function OutputSidebar({
  showPath,
  onShowPathChange,
  pathRenderMode,
  onPathRenderModeChange,
  snakeSpeed,
  onSnakeSpeedChange,
  previewColors,
  setPreviewColors,
  grid,
  isExporting,
  onExport,
  path,
  asciiGrid,
  matrixGrid,
  pathPoints,
  onCopyAscii,
  onCopyGridJson,
}: OutputSidebarProps) {
  return (
    <aside className="output-column">
      <section className="panel controls-panel">
        <div className="section-head">
          <h2>Display</h2>
        </div>

        <button
          type="button"
          className={`toggle-button ${showPath ? "is-active" : ""}`}
          aria-pressed={showPath}
          onClick={() => onShowPathChange(!showPath)}
        >
          <span>Show path</span>
          <span className="toggle-pill" aria-hidden="true">
            <span className="toggle-thumb" />
          </span>
        </button>

        <div className="display-mode-row" role="group" aria-label="Path rendering">
          <span className="display-mode-label">Path rendering</span>
          <div className="display-mode-group">
            <button
              type="button"
              className={`display-mode-button ${pathRenderMode === "center" ? "is-active" : ""}`}
              onClick={() => onPathRenderModeChange("center")}
            >
              Straight
            </button>
            <button
              type="button"
              className={`display-mode-button ${pathRenderMode === "snake" ? "is-active" : ""}`}
              onClick={() => onPathRenderModeChange("snake")}
            >
              Snake
            </button>
          </div>
        </div>

        {pathRenderMode === "snake" ? (
          <label>
            <div className="field-head">
              <span>Snake speed</span>
              <strong>{snakeSpeed}</strong>
            </div>
            <input
              type="range"
              min="1"
              max="1000"
              step="1"
              value={snakeSpeed}
              onChange={(event) => onSnakeSpeedChange(Number(event.target.value))}
            />
          </label>
        ) : null}

        <div className="swatch-grid">
          <label className="swatch-field">
            <input
              type="color"
              aria-label="Path color"
              value={previewColors.path}
              onChange={(event) =>
                setPreviewColors((current) => ({
                  ...current,
                  path: event.target.value,
                }))
              }
            />
            <span>Path</span>
          </label>

          <label className="swatch-field">
            <input
              type="color"
              aria-label="Wall color"
              value={previewColors.wall}
              onChange={(event) =>
                setPreviewColors((current) => ({
                  ...current,
                  wall: event.target.value,
                }))
              }
            />
            <span>Walls</span>
          </label>

          <label className="swatch-field">
            <input
              type="color"
              aria-label="Open path color"
              value={previewColors.walkable}
              onChange={(event) =>
                setPreviewColors((current) => ({
                  ...current,
                  walkable: event.target.value,
                }))
              }
            />
            <span>Open path</span>
          </label>
        </div>
      </section>

      <section className="panel controls-panel">
        <div className="section-head">
          <h2>Export</h2>
        </div>

        <div className="export-grid">
          <button
            type="button"
            className="ghost-button export-button"
            onClick={() => void onExport("svg")}
            disabled={grid.length === 0 || isExporting}
          >
            SVG
          </button>
          <button
            type="button"
            className="ghost-button export-button"
            onClick={() => void onExport("png")}
            disabled={grid.length === 0 || isExporting}
          >
            PNG
          </button>
          <button
            type="button"
            className="ghost-button export-button"
            onClick={() => void onExport("pdf")}
            disabled={grid.length === 0 || isExporting}
          >
            PDF
          </button>
        </div>

        <p className="panel-note">
          Exports the current view with the selected colors{showPath && path ? " and path" : ""}.
        </p>
      </section>

      <section className="results-stack">
        <details className="panel output-panel matrix-panel">
          <summary className="output-header matrix-summary">
            <div className="summary-title">
              <span className="summary-caret" aria-hidden="true" />
              <h2>ASCII</h2>
            </div>
            <div className="summary-actions">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onCopyAscii();
                }}
                disabled={grid.length === 0}
              >
                Copy
              </button>
            </div>
          </summary>
          <pre className="ascii-output" style={{ "--ascii-path-color": previewColors.path } as CSSProperties}>
            {grid.length === 0
              ? "No ASCII available yet."
              : grid.map((row, rowIndex) => (
                  <Fragment key={rowIndex}>
                    {row.map((cell, columnIndex) => {
                      const key = `${rowIndex}:${columnIndex}`;

                      if (cell === 1) {
                        return "#";
                      }

                      if (pathPoints.has(key)) {
                        return (
                          <span key={key} className="ascii-path-dot">
                            .
                          </span>
                        );
                      }

                      return ".";
                    })}
                    {rowIndex < grid.length - 1 ? "\n" : null}
                  </Fragment>
                ))}
          </pre>
          <p className="output-note">`#` wall, `.` path, highlighted `.` solution path.</p>
        </details>

        <details className="panel output-panel matrix-panel">
          <summary className="output-header matrix-summary">
            <div className="summary-title">
              <span className="summary-caret" aria-hidden="true" />
                  <h2>Grid Matrix</h2>
            </div>
            <div className="summary-actions">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onCopyGridJson();
                }}
                disabled={grid.length === 0}
              >
                Copy
              </button>
            </div>
          </summary>
          <pre className="matrix-output">{matrixGrid || "No grid available yet."}</pre>
          <p className="output-note">Shown as a matrix for readability and copied as a valid 2D array.</p>
        </details>
      </section>
    </aside>
  );
}
