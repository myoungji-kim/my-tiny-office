import data from "./cast.json";

// Written from docs/ui/system.js by `npm run ui:cast`; never edit cast.json by hand.
export type Rows = readonly string[];

export interface CastMember {
  readonly key: string;
  readonly sprite: Rows;
  readonly colors: Readonly<Record<"B" | "L" | "A" | "H" | "N", string>>;
  readonly name: { readonly ko: string; readonly en: string };
  readonly species: { readonly ko: string; readonly en: string };
  readonly family: { readonly ko: string; readonly en: string };
}

export const PALETTE: Readonly<Record<string, string | null>> = data.palette;
export const TILES: Readonly<Record<string, Rows>> = data.tiles;
export const CAST: readonly CastMember[] = data.cast;
export const castMember = (key: string): CastMember | undefined => CAST.find((c) => c.key === key);

export const skin = (c: CastMember): Record<string, string> => ({ ...c.colors, O: "#ffffff" });

// A palette entry may name a design token, which a canvas cannot read itself.
export type ColorResolver = (color: string) => string;

// Draws 16x16 rows of palette letters; runs of one colour are one rectangle.
export function paint(
  ctx: CanvasRenderingContext2D,
  rows: Rows,
  scale: number,
  ox: number,
  oy: number,
  extra: Readonly<Record<string, string>> | undefined,
  resolve: ColorResolver,
): void {
  const pal = extra === undefined ? PALETTE : { ...PALETTE, ...extra };
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      const color = pal[ch];
      if (color) {
        ctx.fillStyle = resolve(color);
        ctx.fillRect(ox + x * scale, oy + y * scale, run * scale, scale);
      }
      x += run;
    }
  }
}

export function tokenResolver(element: Element): ColorResolver {
  const style = getComputedStyle(element);
  return (color) => {
    const token = /^var\((--[\w-]+)\)$/.exec(color)?.[1];
    return token === undefined ? color : style.getPropertyValue(token).trim() || "transparent";
  };
}
