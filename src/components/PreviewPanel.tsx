import { GridPreview } from "./GridPreview";
import type { Grid, GridPoint, PathRenderMode, PreviewColors } from "../types";

type PreviewPanelProps = {
  grid: Grid;
  path: GridPoint[] | null;
  showPath: boolean;
  pathRenderMode: PathRenderMode;
  snakeAnimationProgress: number;
  previewColors: PreviewColors;
  openings: GridPoint[];
  sourceMode: "none" | "image" | "generated";
  onMoveOpening: (openingIndex: number, target: GridPoint) => void;
  previewSize: { width: number; height: number } | null;
  isPreviewBusy: boolean;
  previewStatus: string;
  showSourcePanels: boolean;
  onShowSourcePanelsChange: (value: boolean) => void;
  hasSourceImages: boolean;
  canUseGridAsInput: boolean;
  imageUrl: string;
  processedUrl: string;
  onUseGridAsInput: () => void;
  onUseProcessedAsInput: () => void;
  isProcessing: boolean;
  isPreviewExpanded: boolean;
  onPreviewExpandedChange: (value: boolean) => void;
};

export function PreviewPanel({
  grid,
  path,
  showPath,
  pathRenderMode,
  snakeAnimationProgress,
  previewColors,
  openings,
  sourceMode,
  onMoveOpening,
  previewSize,
  isPreviewBusy,
  previewStatus,
  showSourcePanels,
  onShowSourcePanelsChange,
  hasSourceImages,
  canUseGridAsInput,
  imageUrl,
  processedUrl,
  onUseGridAsInput,
  onUseProcessedAsInput,
  isProcessing,
  isPreviewExpanded,
  onPreviewExpandedChange,
}: PreviewPanelProps) {
  const gridRows = grid.length;
  const gridColumns = grid[0]?.length ?? 0;

  return (
    <section className="content preview-column">
      <section className="panel primary-preview">
        <div className="section-head primary-head">
          <div>
            <h2>Grid Preview</h2>
            <p className="section-meta">
              {gridRows > 0 && gridColumns > 0
                ? `${gridRows} x ${gridColumns} cells`
                : "Last opp et bilde eller generer et maze for å starte."}
            </p>
          </div>
          <div className="action-row">
            <button
              type="button"
              className="ghost-button"
              onClick={() => onPreviewExpandedChange(true)}
              disabled={grid.length === 0}
            >
              Åpne stort
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => onShowSourcePanelsChange(!showSourcePanels)}
              disabled={!hasSourceImages}
            >
              {showSourcePanels ? "Skjul kilder" : "Vis kilder"}
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={onUseGridAsInput}
              disabled={!canUseGridAsInput || isProcessing}
            >
              Bruk som input
            </button>
          </div>
        </div>

        <div className="preview-stage">
          <GridPreview
            grid={grid}
            path={showPath ? path : null}
            pathRenderMode={pathRenderMode}
            animationProgress={snakeAnimationProgress}
            colors={previewColors}
            openings={openings}
            showOpeningHandles={showPath}
            openingsDraggable={sourceMode === "generated"}
            onMoveOpening={onMoveOpening}
            previewWidth={previewSize?.width}
            previewHeight={previewSize?.height}
          />

          {isPreviewBusy ? (
            <div className="preview-processing-overlay">
              <div className="processing-chip">
                <span className="processing-dot" aria-hidden="true" />
                {previewStatus}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {showSourcePanels && hasSourceImages ? (
        <section className="source-strip">
          {imageUrl ? (
            <article className="panel collapsible-panel source-card">
              <div className="section-head">
                <h2>Original</h2>
              </div>
              <img src={imageUrl} alt="Original maze upload" className="preview-image" />
            </article>
          ) : null}

          {processedUrl ? (
            <article className="panel collapsible-panel source-card">
              <div className="section-head">
                <h2>Processed B/W</h2>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={onUseProcessedAsInput}
                  disabled={!processedUrl || isProcessing}
                >
                  Bruk som input
                </button>
              </div>
              <img src={processedUrl} alt="Processed maze" className="preview-image" />
            </article>
          ) : null}
        </section>
      ) : null}

      {isPreviewExpanded && grid.length > 0 ? (
        <div
          className="preview-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Stor grid preview"
          onClick={() => onPreviewExpandedChange(false)}
        >
          <div className="preview-modal-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="section-head preview-modal-head">
              <div>
                <h2>Grid Preview</h2>
                <p className="section-meta">
                  {gridRows > 0 && gridColumns > 0 ? `${gridRows} x ${gridColumns} cells` : ""}
                </p>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => onPreviewExpandedChange(false)}
              >
                Lukk
              </button>
            </div>

            <GridPreview
              grid={grid}
              path={showPath ? path : null}
              pathRenderMode={pathRenderMode}
              animationProgress={snakeAnimationProgress}
              colors={previewColors}
              openings={openings}
              showOpeningHandles={false}
              openingsDraggable={false}
              previewWidth={previewSize?.width}
              previewHeight={previewSize?.height}
              className="is-expanded"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
