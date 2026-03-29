# image-to-maze

Client-side React-app for å laste opp eller generere mazes, analysere dem til et grid, finne en løsning, og eksportere resultatet.

## Hva appen gjør

- Laster opp maze-bilder og analyserer dem til et grid der `1 = wall` og `0 = walkable`
- Genererer nye mazes direkte i nettleseren
- Finner path mellom boundary-åpninger
- Viser resultatet som:
  - `Grid Preview`
  - `ASCII`
  - `Grid Matrix`
- Lar deg justere visning med farger, path-visning og animert `Slange`-modus
- Eksporterer som `SVG`, `PNG` og `PDF`

Alt kjører i browseren. Det er ingen backend.

## Lokal kjøring

Krav:

- Node.js
- npm

Installer avhengigheter:

```bash
npm install
```

Start dev-server:

```bash
npm start
```

Bygg produksjonsversjon:

```bash
npm run build
```

Forhåndsvis build lokalt:

```bash
npm run preview
```

## Bruk

### Last opp

Bruk `Last opp` for å analysere et maze-bilde. Når et bilde er lastet opp kan du justere:

- `Tile size`
- `Threshold`
- `Invert`
- `1-celle paths`

Du kan også bruke `Finn beste innstillinger` for automatisk tuning.

### Lag maze

Bruk `Lag maze` for å generere en ny maze med valgt bredde og høyde. Boundary-åpninger kan flyttes i previewen.

## Visning

`Visning`-panelet styrer hvordan løsningen presenteres:

- `Show path`
- `Path-tegning`
  - `Rett`
  - `Slange`
- `Slangefart` når `Slange` er valgt
- farger for path, vegger og åpen vei

## Eksport

Eksport bruker dagens visning og tilgjengelig path:

- `SVG`
- `PNG`
- `PDF`

Eksporten legger også på en åpen padding rundt maze-et.

## Stack

- React
- TypeScript
- Vite
