import { readFileSync, writeFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

// The palette, tiles and cast are drawn once, in docs/ui/system.js, where the
// pages use them. The app reads the same data from src/ui/cast.json, which is
// written from that file and never by hand. \`--write\` writes it; without it the
// script only checks that the two still agree.

const OUT = "src/ui/cast.json";
const source = readFileSync("docs/ui/system.js", "utf8");
const start = source.indexOf("/* ═══ pixel sprites and the tile painter ═══ */");
const end = source.indexOf("/* ═══ the words more than one screen says ═══ */");
if (start === -1 || end === -1) {
  console.log("  ✗ docs/ui/system.js no longer marks where the sprites begin and end");
  process.exit(1);
}

const { P, TILES, MONITOR, CHAIR, CAST } = runInNewContext(source.slice(start, end) + ";({ P, TILES, MONITOR, CHAIR, CAST })", {});
const cast = {
  palette: P,
  tiles: { ...TILES, monitor: MONITOR, chair: CHAIR },
  cast: CAST.map((c) => ({
    key: c.key,
    sprite: c.sprite,
    colors: { B: c.B, L: c.L, A: c.A, H: c.H, N: c.N },
    name: { ko: c.ko, en: c.en },
    species: c.species,
    family: c.family,
  })),
};
const json = JSON.stringify(cast, null, 2) + "\n";

if (process.argv.includes("--write")) {
  writeFileSync(OUT, json);
  console.log(`wrote ${OUT} · ${cast.cast.length} species`);
} else {
  let current = "";
  try {
    current = readFileSync(OUT, "utf8");
  } catch {
    // missing counts as stale
  }
  if (current.replace(/\r\n/g, "\n") !== json) {
    console.log(`  ✗ ${OUT} is not what docs/ui/system.js draws — run npm run ui:cast`);
    process.exit(1);
  }
  console.log(`${OUT} matches docs/ui/system.js · ${cast.cast.length} species`);
}
