# image-to-maze

A client-side React app for uploading or generating mazes, analyzing them into a grid, finding a solution, and exporting the result.

## What the app does

- Uploads maze images and analyzes them into a grid where `1 = wall` and `0 = walkable`
- Generates new mazes directly in the browser
- Finds a path between boundary openings
- Shows the result as:
  - `Grid Preview`
  - `ASCII`
  - `Grid Matrix`
- Lets you adjust the display with colors, path visibility, and animated `Snake` mode
- Exports as `SVG`, `PNG`, and `PDF`

Everything runs in the browser. There is no backend.

## Local development

Requirements:

- Node.js
- npm

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm start
```

Build the production version:

```bash
npm run build
```

Preview the build locally:

```bash
npm run preview
```

## Usage

### Upload

Use `Upload` to analyze a maze image. After an image is uploaded you can adjust:

- `Tile size`
- `Threshold`
- `Invert`
- `1-cell paths`

You can also use `Find best settings` for automatic tuning.

### Generate maze

Use `Generate maze` to create a new maze with the selected width and height. Boundary openings can be moved in the preview.

## Display

The `Display` panel controls how the solution is presented:

- `Show path`
- `Path rendering`
  - `Straight`
  - `Snake`
- `Snake speed` when `Snake` is selected
- colors for the path, walls, and open path

## Export

Export uses the current view and available path:

- `SVG`
- `PNG`
- `PDF`

The export also adds open padding around the maze.

## Stack

- React
- TypeScript
- Vite
