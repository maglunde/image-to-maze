import { describe, expect, it } from "vitest";
import { buildSvgMarkup } from "../src/utils/export";

describe("buildSvgMarkup", () => {
  it("includes path markup and endpoint markers in exported SVG", () => {
    const svg = buildSvgMarkup(
      [
        [1, 0],
        [1, 0],
      ],
      [
        { row: 0, column: 1 },
        { row: 1, column: 1 },
      ],
      {
        path: "#ff0000",
        wall: "#000000",
        walkable: "#ffffff",
      },
      "center",
    );

    expect(svg).toContain("<svg");
    expect(svg).toContain("<path");
    expect(svg).toContain("<circle");
    expect(svg).toContain('stroke="#ff0000"');
  });
});
