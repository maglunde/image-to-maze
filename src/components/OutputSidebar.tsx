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
          <h2>Visning</h2>
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

        <div className="display-mode-row" role="group" aria-label="Path-tegning">
          <span className="display-mode-label">Path-tegning</span>
          <div className="display-mode-group">
            <button
              type="button"
              className={`display-mode-button ${pathRenderMode === "center" ? "is-active" : ""}`}
              onClick={() => onPathRenderModeChange("center")}
            >
              Rett
            </button>
            <button
              type="button"
              className={`display-mode-button ${pathRenderMode === "snake" ? "is-active" : ""}`}
              onClick={() => onPathRenderModeChange("snake")}
            >
              Slange
            </button>
          </div>
        </div>

        {pathRenderMode === "snake" ? (
          <label>
            <div className="field-head">
              <span>Slangefart</span>
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
              aria-label="Path-farge"
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
              aria-label="Veggfarge"
              value={previewColors.wall}
              onChange={(event) =>
                setPreviewColors((current) => ({
                  ...current,
                  wall: event.target.value,
                }))
              }
            />
            <span>Vegger</span>
          </label>

          <label className="swatch-field">
            <input
              type="color"
              aria-label="Farge for åpen vei"
              value={previewColors.walkable}
              onChange={(event) =>
                setPreviewColors((current) => ({
                  ...current,
                  walkable: event.target.value,
                }))
              }
            />
            <span>Åpen vei</span>
          </label>
        </div>
      </section>

      <section className="panel controls-panel">
        <div className="section-head">
          <h2>Eksport</h2>
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
          Eksporterer dagens visning med valgte farger{showPath && path ? " og path" : ""}.
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
                Kopier
              </button>
            </div>
          </summary>
          <pre className="ascii-output" style={{ "--ascii-path-color": previewColors.path } as CSSProperties}>
            {grid.length === 0
              ? "Ingen ASCII tilgjengelig ennå."
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
          <p className="output-note">`#` vegg, `.` gang, farget `.` sti.</p>
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
                Kopier
              </button>
            </div>
          </summary>
          <pre className="matrix-output">{matrixGrid || "Ingen grid tilgjengelig ennå."}</pre>
          <p className="output-note">Vises som matrise for lesbarhet, kopieres som gyldig 2D-array.</p>
        </details>
      </section>
    </aside>
  );
}
