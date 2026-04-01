import type { Dispatch, SetStateAction } from "react";
import type { AnalysisOptions } from "../types";
import { TILE_SIZE_MAX, TILE_SIZE_MIN } from "../utils/imageProcessing";
import { ImageDropzone } from "./ImageDropzone";

type InputPanelProps = {
  inputTab: "generate" | "upload";
  onInputTabChange: (tab: "generate" | "upload") => void;
  mazeWidth: number;
  mazeHeight: number;
  onMazeWidthChange: (value: number) => void;
  onMazeHeightChange: (value: number) => void;
  onGenerateMaze: () => void;
  imageUrl: string;
  options: AnalysisOptions;
  setOptions: Dispatch<SetStateAction<AnalysisOptions>>;
  onFileSelect: (file: File) => void;
  onAutoTune: () => void;
  isAutoTuning: boolean;
  isProcessing: boolean;
};

export function InputPanel({
  inputTab,
  onInputTabChange,
  mazeWidth,
  mazeHeight,
  onMazeWidthChange,
  onMazeHeightChange,
  onGenerateMaze,
  imageUrl,
  options,
  setOptions,
  onFileSelect,
  onAutoTune,
  isAutoTuning,
  isProcessing,
}: InputPanelProps) {
  return (
    <section className="panel controls-panel input-panel">
      <div className="section-head">
        <h2>Input</h2>
      </div>

      <div className="tab-row input-tab-row" role="tablist" aria-label="Input mode">
        <button
          type="button"
          role="tab"
          aria-selected={inputTab === "generate"}
          className={`tab-button ${inputTab === "generate" ? "is-active" : ""}`}
          aria-controls="input-tab-panel"
          onClick={() => onInputTabChange("generate")}
        >
          Generate maze
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={inputTab === "upload"}
          className={`tab-button ${inputTab === "upload" ? "is-active" : ""}`}
          aria-controls="input-tab-panel"
          onClick={() => onInputTabChange("upload")}
        >
          Upload
        </button>
      </div>

      <div
        id="input-tab-panel"
        role="tabpanel"
        className={`tab-panel ${inputTab === "generate" ? "is-generate" : "is-upload"}`}
      >
        {inputTab === "generate" ? (
          <div className="sidebar-group">
            <label>
              <div className="field-head">
                <span>Width</span>
                <strong>{mazeWidth}</strong>
              </div>
              <input
                type="range"
                min="5"
                max="500"
                step="1"
                value={mazeWidth}
                onChange={(event) => onMazeWidthChange(Number(event.target.value) || 5)}
              />
            </label>

            <label>
              <div className="field-head">
                <span>Height</span>
                <strong>{mazeHeight}</strong>
              </div>
              <input
                type="range"
                min="5"
                max="500"
                step="1"
                value={mazeHeight}
                onChange={(event) => onMazeHeightChange(Number(event.target.value) || 5)}
              />
            </label>

            <button type="button" onClick={onGenerateMaze}>
              Generate maze
            </button>
          </div>
        ) : (
          <div className="sidebar-group">
            <ImageDropzone hasImage={Boolean(imageUrl)} onFileSelect={onFileSelect} />

            {imageUrl ? (
              <>
                <div className="sidebar-divider" aria-hidden="true" />

                <div className="sidebar-group">
                  <p className="sidebar-label">Analysis settings</p>
                  <label>
                    <div className="field-head">
                      <span className="field-label">
                        <span>Tile size</span>
                        <span
                          className="info-tooltip"
                          data-tooltip="How many image pixels are merged into one grid cell. Lower values give more detail, higher values give a coarser grid."
                          aria-label="Tile size info"
                        >
                          i
                        </span>
                      </span>
                      <strong>{options.tileSize}px</strong>
                    </div>
                    <input
                      type="range"
                      min={TILE_SIZE_MIN}
                      max={TILE_SIZE_MAX}
                      value={options.tileSize}
                      onChange={(event) =>
                        setOptions((current) => ({
                          ...current,
                          tileSize: Number(event.target.value),
                        }))
                      }
                    />
                  </label>

                  <label>
                    <div className="field-head">
                      <span className="field-label">
                        <span>Threshold</span>
                        <span
                          className="info-tooltip"
                          data-tooltip="The brightness cutoff used to classify walls versus open paths. Lower values produce fewer walls, higher values produce more."
                          aria-label="Threshold info"
                        >
                          i
                        </span>
                      </span>
                      <strong>{options.threshold}</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={options.threshold}
                      onChange={(event) =>
                        setOptions((current) => ({
                          ...current,
                          threshold: Number(event.target.value),
                        }))
                      }
                    />
                  </label>

                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={options.invert}
                      onChange={(event) =>
                        setOptions((current) => ({
                          ...current,
                          invert: event.target.checked,
                        }))
                      }
                    />
                    <span>Invert</span>
                  </label>

                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={options.normalizePathWidth}
                      onChange={(event) =>
                        setOptions((current) => ({
                          ...current,
                          normalizePathWidth: event.target.checked,
                        }))
                      }
                    />
                    <span>1-cell paths</span>
                  </label>

                  <button
                    type="button"
                    className="ghost-button"
                    onClick={onAutoTune}
                    disabled={!imageUrl || isAutoTuning || isProcessing}
                  >
                    {isAutoTuning ? "Finding best settings..." : "Find best settings"}
                  </button>

                </div>
              </>
            ) : (
              <p className="panel-note">Analysis settings appear after you upload an image.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
