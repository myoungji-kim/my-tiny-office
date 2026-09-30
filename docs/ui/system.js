/* Tiny Office — the parts every sample page shares.
   Loaded from <head> as a plain script, so a page's own code at the end of
   <body> can use these, and so opening a page from disk still works. */

/* ═══ pixel sprites and the tile painter ═══ */
// Sprites are 16x16 strings over the palette below. A character's own colours
// arrive as `extra` and win, so the palette only has to cover the room.

const P = {
  ".": null, K: "#2f2a3d", E: "#2f2a3d",
  w: "#c9a06a", W: "#d8b17c", d: "var(--floor)",
  a: "#e9dcc4", A: "#f4ead7", b: "#c2b195",
  g: "#8ec3e8", G: "#bcdcf2",
  s: "#c9964f", S: "#dcae6c", t: "#9c6f3a",
  m: "#454b63", M: "#6f9fd8", o: "#99a3b8",
  c: "#5d6480", C: "#767ea0",
  p: "#b5674a", n: "#4f8f55", N: "#6fae6e",
  f: "#8a6240", r: "#d8574f", u: "#5b8de0", v: "#e0a93c",
  q: "#d9d2c3", Q: "#e8e2d5", x: "#b8ae9b",
};


const TILES = {
  floor: ["wwwwwwwwwwwwwwww","wWWWWWWWWWWWWWWw","wwwwwwwwwwwwwwww","dddddddddddddddd","wwwwwwwwwwwwwwww","wWWWWWWWWWWWWWWw","wwwwwwwwwwwwwwww","wwwwwwwwwwwwwwww","dddddddddddddddd","wwwwwwwwwwwwwwww","wWWWWWWWWWWWWWWw","wwwwwwwwwwwwwwww","wwwwwwwwwwwwwwww","dddddddddddddddd","wwwwwwwwwwwwwwww","wWWWWWWWWWWWWWWw"],
  wall: ["KKKKKKKKKKKKKKKK","AAAAAAAAAAAAAAAA","aaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaa","bbbbbbbbbbbbbbbb","KKKKKKKKKKKKKKKK","wwwwwwwwwwwwwwww","wwwwwwwwwwwwwwww","dddddddddddddddd","wwwwwwwwwwwwwwww"],
  window: ["KKKKKKKKKKKKKKKK","AAAAAAAAAAAAAAAA","aKKKKKKKKKKKKKKa","aKGGGGGGGGGGGGKa","aKGgggggggggggKa","aKGgggggggggggKa","aKGgggggggggggKa","aKKKKKKKKKKKKKKa","aKGgggggggggggKa","aKGgggggggggggKa","aKKKKKKKKKKKKKKa","KKKKKKKKKKKKKKKK","wwwwwwwwwwwwwwww","wwwwwwwwwwwwwwww","dddddddddddddddd","wwwwwwwwwwwwwwww"],
  shelf: ["KKKKKKKKKKKKKKKK","AAAAAAAAAAAAAAAA","aKKKKKKKKKKKKKKa","aKfffffffffffKKa","aKfrrfuuvvfrrfKa","aKfrrfuuvvfrrfKa","aKfffffffffffKKa","aKfuuvvfrrfuufKa","aKfuuvvfrrfuufKa","aKfffffffffffKKa","bKKKKKKKKKKKKKKb","KKKKKKKKKKKKKKKK","wwwwwwwwwwwwwwww","wwwwwwwwwwwwwwww","dddddddddddddddd","wwwwwwwwwwwwwwww"],
  board: ["KKKKKKKKKKKKKKKK","AAAAAAAAAAAAAAAA","aKKKKKKKKKKKKKKa","aKAAAAAAAAAAAAKa","aKAoooooooAAAAKa","aKAAAAAAAAAAAAKa","aKAooooooooooAKa","aKAAAAAAAAAAAAKa","aKAooooooAAAAAKa","aKAAAAAAAAAAAAKa","aKKKKKKKKKKKKKKa","KKKKKKKKKKKKKKKK","wwwwwwwwwwwwwwww","wwwwwwwwwwwwwwww","dddddddddddddddd","wwwwwwwwwwwwwwww"],
  deskL: ["wwwwwwwwwwwwwwww","wWWWWWWWWWWWWWWw","wwwwwwwwwwwwwwww","dddddddddddddddd","wwKKKKKKKKKKKKKK","wKSSSSSSSSSSSSSS","wKSsssssssssssss","wKSsssssssssssss","wKSsssssssssssss","wKtttttttttttttt","wKKKKKKKKKKKKKKK","wwwwwwwwwwwwwwww","wwKKwwwwwwwwwwww","wwKKwwwwwwwwwwww","dddddddddddddddd","wwwwwwwwwwwwwwww"],
  deskR: ["wwwwwwwwwwwwwwww","wWWWWWWWWWWWWWWw","wwwwwwwwwwwwwwww","dddddddddddddddd","KKKKKKKKKKKKKKww","SSSSSSSSSSSSSSKw","ssssssssssssssKw","ssssssssssssssKw","ssssssssssssssKw","ttttttttttttttKw","KKKKKKKKKKKKKKKw","wwwwwwwwwwwwwwww","wwwwwwwwwwwwKKww","wwwwwwwwwwwwKKww","dddddddddddddddd","wwwwwwwwwwwwwwww"],
  deskM: ["wwwwwwwwwwwwwwww","wWWWWWWWWWWWWWWw","wwwwwwwwwwwwwwww","dddddddddddddddd","KKKKKKKKKKKKKKKK","SSSSSSSSSSSSSSSS","ssssssssssssssss","ssssssssssssssss","ssssssssssssssss","tttttttttttttttt","KKKKKKKKKKKKKKKK","wwwwwwwwwwwwwwww","wwwwwwwwwwwwwwww","wwwwwwwwwwwwwwww","dddddddddddddddd","wwwwwwwwwwwwwwww"],
  plant: ["wwwwwwwwwwwwwwww","wWWWWWWWWWWWWWWw","wwwwwKKKKwwwwwww","wwwKKnnnnKKwwwww","wwKnNNnnnnNKwwww","wwKnnnnnnnnKwwww","wwKNnnnKnnnNKwww","wwwKnnnKnnnKwwww","wwwwKnnKnnKwwwww","wwwwwKKKKKwwwwww","wwwwKKpppKKwwwww","wwwwKppppppKwwww","wwwwKppppppKwwww","wwwwwKKKKKKwwwww","dddddddddddddddd","wwwwwwwwwwwwwwww"],
  sofaBackL: ["wwwwwwwwwwwwwwww","wWWWWWWWWWWWWWWw","wwwwwwwwwwwwwwww","dddddddddddddddd","wwwwwwwwwwwwwwww","wWWWWWWWWWWWWWWw","wwwwwwwwwwwwwwww","wwwwwwwwwwwwwwww","wwKKKKKKKKKKKKKK","wwKCCCCCCCCCCCCC","wwKCCCCCCCCCCCCC","wwKCCCCCCCCCCCCC","wwKCCCCCCCCCCCCC","wwKCCCCCCCCCCCCC","wwKCCCCCCCCCCCCC","wwKCCCCCCCCCCCCC"],
  sofaBackR: ["wwwwwwwwwwwwwwww","wWWWWWWWWWWWWWWw","wwwwwwwwwwwwwwww","dddddddddddddddd","wwwwwwwwwwwwwwww","wWWWWWWWWWWWWWWw","wwwwwwwwwwwwwwww","wwwwwwwwwwwwwwww","KKKKKKKKKKKKKKww","CCCCCCCCCCCCCKww","CCCCCCCCCCCCCKww","CCCCCCCCCCCCCKww","CCCCCCCCCCCCCKww","CCCCCCCCCCCCCKww","CCCCCCCCCCCCCKww","CCCCCCCCCCCCCKww"],
  sofaL: ["wwKKKKKKKKKKKKKK","wwKCCKcccccccccc","wwKCCKcccccccccc","wwKCCKcccccccccc","wwKCCKcccccccccc","wwKKKKKKKKKKKKKK","wwwKKwwwwwwwwwww","wwwKKwwwwwwwwwww","dddddddddddddddd","wwwwwwwwwwwwwwww","wWWWWWWWWWWWWWWw","wwwwwwwwwwwwwwww","wwwwwwwwwwwwwwww","dddddddddddddddd","wwwwwwwwwwwwwwww","wWWWWWWWWWWWWWWw"],
  sofaR: ["KKKKKKKKKKKKKKww","ccccccccccKCCKww","ccccccccccKCCKww","ccccccccccKCCKww","ccccccccccKCCKww","KKKKKKKKKKKKKKww","wwwwwwwwwwwKKwww","wwwwwwwwwwwKKwww","dddddddddddddddd","wwwwwwwwwwwwwwww","wWWWWWWWWWWWWWWw","wwwwwwwwwwwwwwww","wwwwwwwwwwwwwwww","dddddddddddddddd","wwwwwwwwwwwwwwww","wWWWWWWWWWWWWWWw"],
  table: ["wwwwwwwwwwwwwwww","wWWWWWWWWWWWWWWw","wwwwwwwwwwwwwwww","dddddddddddddddd","wwwwwwwwwwwwwwww","wwwKKKKKKKKKKwww","wwKSSSSSSSSSSKww","wwKSssssssssSKww","wwKKKKKKKKKKKKww","wwwwwwKttKwwwwww","wwwwwwKttKwwwwww","wwwwwKKttKKwwwww","wwwwKttttttKwwww","wwwwKKKKKKKKwwww","dddddddddddddddd","wwwwwwwwwwwwwwww"],
  // outside the door: the plaza where Claude Code sessions wait to be hired
  pave: ["qqqqqqqxqqqqqqqx","qQQQQQqxqQQQQQqx","qQqqqqqxqQqqqqqx","qqqqqqqxqqqqqqqx","xxxxxxxxxxxxxxxx","qqqxqqqqqqqxqqqq","QQqxqQQQQQqxqQQQ","qqqxqQqqqqqxqQqq","qqqxqqqqqqqxqqqq","xxxxxxxxxxxxxxxx","qqqqqqqxqqqqqqqx","qQQQQQqxqQQQQQqx","qQqqqqqxqQqqqqqx","qqqqqqqxqqqqqqqx","xxxxxxxxxxxxxxxx","qqqxqqqqqqqxqqqq"],
  grass: ["nnnnnnnnnnnnnnnn","nnNnnnnnnnnNnnnn","nnnnnnnNnnnnnnnn","nnnnnnnnnnnnnNnn","nNnnnnnnnnnnnnnn","nnnnnNnnnnnnnnnn","nnnnnnnnnnNnnnnn","nnnNnnnnnnnnnnnn","nnnnnnnnnnnnnnNn","nnnnnnnnNnnnnnnn","nNnnnnnnnnnnnnnn","nnnnnnNnnnnnnnnn","nnnnnnnnnnnnNnnn","nnnNnnnnnnnnnnnn","nnnnnnnnnNnnnnnn","nnnnnnnnnnnnnnnn"],
  tree: ["nnnnnKKKKKKnnnnn","nnnKKNNNNNNKKnnn","nnKNNNnNNNNNNKnn","nKNNnNNNNNnNNNKn","nKNNNNNNNNNNNNKn","nKNnNNNNnNNNNNKn","nKNNNNNNNNNNnNKn","nnKNNNnNNNNNNKnn","nnnKKNNNNNNKKnnn","nnnnnKKffKKnnnnn","nnnnnnKffKnnnnnn","nnnnnnKffKnnnnnn","nnnnnnKffKnnnnnn","nnnnnKKffKKnnnnn","nnnnnnnnnnnnnnnn","nnnnnnnnnnnnnnnn"],
  lamp: ["qqqqqKKKKKKqqqqx","qQQQKvvvvvvKQQqx","qQqqKvvvvvvKqqqx","qqqqqKKKKKKqqqqx","xxxxxxxKKxxxxxxx","qqqxqqqKKqqxqqqq","QQqxqQQKKQqxqQQQ","qqqxqQqKKqqxqQqq","qqqxqqqKKqqxqqqq","xxxxxxxKKxxxxxxx","qqqqqqqKKqqqqqqx","qQQQQQqKKQQQQQqx","qQqqqqKKKKqqqqqx","qqqqqKKKKKKqqqqx","xxxxxxxxxxxxxxxx","qqqxqqqqqqqxqqqq"],
  bench: ["qqqqqqqxqqqqqqqx","qQQQQQqxqQQQQQqx","qKKKKKKKKKKKKKKx","qKSSSSSSSSSSSSKx","qKttttttttttttKx","qKKKKKKKKKKKKKKq","KSSSSSSSSSSSSSSK","KssssssssssssssK","KttttttttttttttK","KKKKKKKKKKKKKKKK","qKKqqqqqqqqqqKKx","qKKQQQqxqQQQQKKx","qKKqqqqxqQqqqKKx","qqqqqqqxqqqqqqqx","xxxxxxxxxxxxxxxx","qqqxqqqqqqqxqqqq"],
  facade: ["aaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaa","bbbbbbbbbbbbbbbb","bbbbbbbbbbbbbbbb","KKKKKKKKKKKKKKKK","qqqqqqqxqqqqqqqx","qQQQQQqxqQQQQQqx","qQqqqqqxqQqqqqqx","qqqqqqqxqqqqqqqx"],
  facadeWindow: ["aaaaaaaaaaaaaaaa","aKKKKKKKKKKKKKKa","aKGGGGGGGGGGGGKa","aKGgggggggggggKa","aKGgggggggggggKa","aKKKKKKKKKKKKKKa","aKGgggggggggggKa","aKGgggggggggggKa","aKKKKKKKKKKKKKKa","bbbbbbbbbbbbbbbb","bbbbbbbbbbbbbbbb","KKKKKKKKKKKKKKKK","qqqqqqqxqqqqqqqx","qQQQQQqxqQQQQQqx","qQqqqqqxqQqqqqqx","qqqqqqqxqqqqqqqx"],
  door: ["aaKKKKKKKKKKKKaa","aaKffffffffffKaa","aaKfKKKKKKKKfKaa","aaKfKGGGGGGKfKaa","aaKfKGggggGKfKaa","aaKfKKKKKKKKfKaa","aaKffffffffffKaa","aaKfttttttttfKaa","aaKffffffffvfKaa","bbKfttttttttfKbb","bbKffffffffffKbb","KKKKKKKKKKKKKKKK","qqqqqqqxqqqqqqqx","qQQQQQqxqQQQQQqx","qQqqqqqxqQqqqqqx","qqqqqqqxqqqqqqqx"],
  coffee: ["KKKKKKKKKKKKKKKK","AAAAAAAAAAAAAAAA","aaaaaaaaaaaaaaaa","aaaKKKKKKKKKKaaa","aaaKmmmmmmmmKaaa","aaaKmMMMMMMmKaaa","aaaKmMMMMMMmKaaa","aaaKmmmmmmmmKaaa","aaaKmmrrrrmmKaaa","aaaKmmmmmmmmKaaa","aaaKKKKKKKKKKaaa","KKffffffffffffKK","KffffffffffffffK","KKKKKKKKKKKKKKKK","dddddddddddddddd","wwwwwwwwwwwwwwww"],
};


const MONITOR = ["................","..KKKKKKKKKKKK..","..KmmmmmmmmmmK..","..KmMMMMMMMMmK..","..KmMMMMMMMMmK..","..KmMMMMMMMMmK..","..KmMMMMMMMMmK..","..KmMMMMMMMMmK..","..KmmmmmmmmmmK..","..KKKKKKKKKKKK..",".....KmmmmK.....",".....KmmmmK.....","...KKKKKKKKKK...","...KmmmmmmmmK...","....KKKKKKKK....","................"];


const CHAIR = ["................","................","....KKKKKKKK....","...KCCCCCCCCK...","...KcccccccCK...","...KcccccccCK...","...KcccccccCK...","....KKKKKKKK....","................","..KKKKKKKKKKKK..","..KCcccccccccK..","..KKKKKKKKKKKK..",".......KK.......",".......KK.......","....KKKKKKKK....","................"];


const CAT = [
  "...KK......KK...",
  "..KBBK....KBBK..",
  "..KBBBKKKKBBBK..",
  "..KBBBBBBBBBBK..",
  "..KBBBBBBBBBBK..",
  "..KHBEBEEBEBHK..",
  "..KBBBBBBBBBBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const FOX = [
  "..KK........KK..",
  "..KAK......KAK..",
  "..KAAKKKKKKAAK..",
  "..KBBBBBBBBBBK..",
  "..KBBBBBBBBBBK..",
  "..KHLEBEEBELHK..",
  "..KBLLLLLLLLBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const SQUIRREL = [
  "....K......K....",
  "...KAK....KAK...",
  "..KBAKKKKKKABK..",
  "..KBBBBBBBBBBK..",
  "..KBBBBBBBBBBK..",
  "..KHLEBEEBELHK..",
  "..KBLLLLLLLLBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const BUNNY = [
  "...KKK....KKK...",
  "...KAK....KAK...",
  "...KAK....KAK...",
  "..KBBKKKKKKBBK..",
  "..KBBBBBBBBBBK..",
  "..KHBEBEEBEBHK..",
  "..KBBBBBBBBBBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const DOG = [
  "...KKKKKKKKKK...",
  "..KAABBBBBBAAK..",
  "..KAABBBBBBAAK..",
  "..KAAEBEEBEAAK..",
  "..KAABBBBBBAAK..",
  "..KAABBNNBBAAK..",
  "..KHBBBBBBBBHK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const BEAR = [
  "..KKKK....KKKK..",
  "..KAAK....KAAK..",
  "..KBBKKKKKKBBK..",
  "..KBBBBBBBBBBK..",
  "..KBBBBBBBBBBK..",
  "..KHBEBEEBEBHK..",
  "..KBBBBBBBBBBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const PANDA = [
  "..KKKK....KKKK..",
  "..KAAK....KAAK..",
  "..KBBKKKKKKBBK..",
  "..KBBBBBBBBBBK..",
  "..KBAABBBBAABK..",
  "..KHAEBEEBEAHK..",
  "..KBBBBNNBBBBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const MOUSE = [
  ".KKK........KKK.",
  ".KAAK......KAAK.",
  "..KAAKKKKKKAAK..",
  "..KBBBBBBBBBBK..",
  "..KBBBBBBBBBBK..",
  "..KHBEBEEBEBHK..",
  "..KBBBBNNBBBBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const HAMSTER = [
  "................",
  "..KK........KK..",
  "..KAKKKKKKKKAK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KHBBEBEEBEBBHK.",
  "..KBBBBNNBBBBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const HEDGEHOG = [
  "...K.K.KK.K.K...",
  "..KAKAKAAKAKAK..",
  "..KAAAAAAAAAAK..",
  "..KBBBBBBBBBBK..",
  "..KBBBBBBBBBBK..",
  "..KHBEBEEBEBHK..",
  "..KBBBBNNBBBBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const KOALA = [
  "................",
  ".KK..........KK.",
  "KAAK........KAAK",
  "KAAKKKKKKKKKKAAK",
  ".KKBBBBBBBBBBKK.",
  "..KHBEBEEBEBHK..",
  "..KBBBNNNNBBBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const PIG = [
  "................",
  "..KK........KK..",
  "..KAKKKKKKKKAK..",
  "..KBBBBBBBBBBK..",
  "..KHBEBBBBEBHK..",
  "..KBBNNNNNNBBK..",
  "..KBBNNNNNNBBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const SHEEP = [
  "..KK.KKKKKK.KK..",
  ".KAAKAAAAAAKAAK.",
  ".KAAAAAAAAAAAAK.",
  ".KAAAAAAAAAAAAK.",
  "..KBBBBBBBBBBK..",
  "..KHBEBEEBEBHK..",
  "..KBBBBBBBBBBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const COW = [
  "KK............KK",
  ".KAK........KAK.",
  "..KAKKKKKKKKAK..",
  "..KBBBBBBBBBBK..",
  "..KNNNBBBBBBBK..",
  "..KHBEBEEBEBHK..",
  "..KBBBBBBBBBBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const DEER = [
  "...K.K....K.K...",
  "...KKK....KKK...",
  "....KKKKKKKK....",
  "..KBBBBBBBBBBK..",
  "..KBBBBBBBBBBK..",
  "..KHBEBEEBEBHK..",
  "..KBBBBNNBBBBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const FROG = [
  "...KKK....KKK...",
  "..KOOOK..KOOOK..",
  "..KOEOK..KOEOK..",
  "..KBBKKKKKKBBK..",
  "..KBBBBBBBBBBK..",
  "..KHHBBEEBBHHK..",
  "..KBBBBBBBBBBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const DUCK = [
  "................",
  "................",
  "...KKKKKKKKKK...",
  "..KBBBBBBBBBBK..",
  "..KHBEBBBBEBHK..",
  "..KBBNNNNNNBBK..",
  "..KBKNNNNNNKBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const CHICK = [
  "................",
  ".......KK.......",
  "......KAAK......",
  "...KKKKKKKKKK...",
  "..KBBBBBBBBBBK..",
  "..KHBEBNNBEBHK..",
  "..KBBBBBBBBBBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const PENGUIN = [
  "................",
  "................",
  "...KKKKKKKKKK...",
  "..KBBBBBBBBBBK..",
  "..KBLLLLLLLLBK..",
  "..KHLELNNLELHK..",
  "..KBLLLLLLLLBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const OWL = [
  "..KK........KK..",
  "..KAKKKKKKKKAK..",
  "..KBBBBBBBBBBK..",
  "..KBOOBBBBOOBK..",
  "..KBOEBBBBEOBK..",
  "..KHOOBNNBOOHK..",
  "..KBBBBBBBBBBK..",
  "..KBBBBBBBBBBK..",
  ".KBBBBBBBBBBBBK.",
  ".KBBBBLLLLBBBBK.",
  ".KBBBBLLLLBBBBK.",
  "..KBBBLLLLBBBK..",
  "..KBBBBLLBBBBK..",
  "...KBBBBBBBBK...",
  "....KKKKKKKK....",
  "................",
];


const CAST = [
  { key: "cat", sprite: CAT, ko: "모카", en: "Mocha", species: { ko: "고양이", en: "Cat" }, family: { ko: "뾰족 귀", en: "Pointed ears" },
    B: "#f3e0c8", L: "#fdf3e2", A: "#e3bfa0", H: "#f4a7b0", N: "#e3bfa0" },
  { key: "fox", sprite: FOX, ko: "여우", en: "Fennec", species: { ko: "여우", en: "Fox" }, family: { ko: "뾰족 귀", en: "Pointed ears" },
    B: "#e89055", L: "#fdf2e6", A: "#a85f34", H: "#f4a7b0", N: "#a85f34" },
  { key: "squirrel", sprite: SQUIRREL, ko: "도토", en: "Acorn", species: { ko: "다람쥐", en: "Squirrel" }, family: { ko: "뾰족 귀", en: "Pointed ears" },
    B: "#c97f4a", L: "#f7e6cf", A: "#a8663a", H: "#f4a7b0", N: "#a8663a" },
  { key: "bunny", sprite: BUNNY, ko: "두부", en: "Tofu", species: { ko: "토끼", en: "Rabbit" }, family: { ko: "긴 귀", en: "Long ears" },
    B: "#fbfafb", L: "#fff1f4", A: "#f6c6d0", H: "#f4a7b0", N: "#f6c6d0" },
  { key: "dog", sprite: DOG, ko: "콩이", en: "Bean", species: { ko: "강아지", en: "Dog" }, family: { ko: "처진 귀", en: "Floppy ears" },
    B: "#d9b083", L: "#f3e2c9", A: "#a87f55", H: "#f4a7b0", N: "#6b4c33" },
  { key: "bear", sprite: BEAR, ko: "코코", en: "Coco", species: { ko: "곰", en: "Bear" }, family: { ko: "둥근 귀", en: "Round ears" },
    B: "#b79070", L: "#d2ad8c", A: "#96704f", H: "#e2929c", N: "#96704f" },
  { key: "panda", sprite: PANDA, ko: "반달", en: "Moon", species: { ko: "판다", en: "Panda" }, family: { ko: "둥근 귀", en: "Round ears" },
    B: "#fafafb", L: "#ffffff", A: "#3f3a44", H: "#f4a7b0", N: "#3f3a44" },
  { key: "mouse", sprite: MOUSE, ko: "치즈", en: "Cheese", species: { ko: "생쥐", en: "Mouse" }, family: { ko: "둥근 귀", en: "Round ears" },
    B: "#b9b4bd", L: "#d8d4dc", A: "#f2c0cb", H: "#f4a7b0", N: "#f2c0cb" },
  { key: "hamster", sprite: HAMSTER, ko: "밤톨", en: "Nut", species: { ko: "햄스터", en: "Hamster" }, family: { ko: "둥근 귀", en: "Round ears" },
    B: "#f0cf9a", L: "#fdf0d8", A: "#d9a86a", H: "#f4a7b0", N: "#d9a86a" },
  { key: "koala", sprite: KOALA, ko: "유칼", en: "Euca", species: { ko: "코알라", en: "Koala" }, family: { ko: "둥근 귀", en: "Round ears" },
    B: "#a8adb8", L: "#ccd0d8", A: "#8b909c", H: "#f4a7b0", N: "#5d6470" },
  { key: "chick", sprite: CHICK, ko: "삐약", en: "Pip", species: { ko: "병아리", en: "Chick" }, family: { ko: "머리 장식", en: "Crest" },
    B: "#f9da80", L: "#fdecb2", A: "#eda93c", H: "#f4a7b0", N: "#eda93c" },
  { key: "owl", sprite: OWL, ko: "야간", en: "Nox", species: { ko: "부엉이", en: "Owl" }, family: { ko: "머리 장식", en: "Crest" },
    B: "#a3845f", L: "#c9ac86", A: "#7d6244", H: "#f4a7b0", N: "#f0a63c" },
  { key: "sheep", sprite: SHEEP, ko: "구름", en: "Cloud", species: { ko: "양", en: "Sheep" }, family: { ko: "머리 장식", en: "Crest" },
    B: "#e6d6bf", L: "#fff8ee", A: "#fdfbf6", H: "#f4a7b0", N: "#c9bda8" },
  { key: "hedgehog", sprite: HEDGEHOG, ko: "가시", en: "Quill", species: { ko: "고슴도치", en: "Hedgehog" }, family: { ko: "머리 장식", en: "Crest" },
    B: "#e6d3b8", L: "#f6ecdc", A: "#8a6a4a", H: "#f4a7b0", N: "#8a6a4a" },
  { key: "duck", sprite: DUCK, ko: "꽥꽥", en: "Quack", species: { ko: "오리", en: "Duck" }, family: { ko: "부리·코", en: "Beak or snout" },
    B: "#fbfbfc", L: "#ffffff", A: "#f0a63c", H: "#f4a7b0", N: "#f0a63c" },
  { key: "penguin", sprite: PENGUIN, ko: "별", en: "Star", species: { ko: "펭귄", en: "Penguin" }, family: { ko: "부리·코", en: "Beak or snout" },
    B: "#61708f", L: "#fafbfd", A: "#495470", H: "#f4a7b0", N: "#f0a63c" },
  { key: "pig", sprite: PIG, ko: "분홍", en: "Rosy", species: { ko: "돼지", en: "Pig" }, family: { ko: "부리·코", en: "Beak or snout" },
    B: "#f4b8c0", L: "#fbd9de", A: "#e295a2", H: "#e87f90", N: "#e08e9c" },
  { key: "cow", sprite: COW, ko: "얼룩", en: "Patch", species: { ko: "소", en: "Cow" }, family: { ko: "뿔", en: "Horns" },
    B: "#fafafb", L: "#ffffff", A: "#e8dfc8", H: "#f4a7b0", N: "#3f3a44" },
  { key: "deer", sprite: DEER, ko: "단풍", en: "Maple", species: { ko: "사슴", en: "Deer" }, family: { ko: "뿔", en: "Horns" },
    B: "#cfa274", L: "#ecd7ba", A: "#8a6b49", H: "#f4a7b0", N: "#8a6b49" },
  { key: "frog", sprite: FROG, ko: "완두", en: "Pea", species: { ko: "개구리", en: "Frog" }, family: { ko: "솟은 눈", en: "Raised eyes" },
    B: "#a6d988", L: "#c4e8aa", A: "#7ab863", H: "#f2a0b8", N: "#7ab863" },
];


const skin = (c) => ({ B: c.B, L: c.L, O: "#ffffff", A: c.A, H: c.H, N: c.N });


function paint(ctx, rows, scale, ox, oy, extra) {
  const pal = extra ? { ...P, ...extra } : P;
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      const color = pal[ch];
      if (color) { ctx.fillStyle = color; ctx.fillRect(ox + x * scale, oy + y * scale, run * scale, scale); }
      x += run;
    }
  }
}


const SPECIES = new Map(CAST.map((c) => [c.key, c]));


const STATUS = {
  working:   { color: "var(--warn)" },
  reviewing: { color: "var(--info)" },
  available: { color: "var(--ok)" },
  leave:     { color: "var(--faint)" },
};


/* ═══ the words more than one screen says ═══ */
// The menu, the statuses, the areas and the team names are the same words
// wherever they appear. Each page spreads these into its own dictionary and
// adds only what is its own.

const WORDS = {
  ko: {
    nav: { office: "사무실", projects: "프로젝트", people: "직원", company: "회사", settings: "설정", outside: "회사 밖", plaza: "광장" },
    companies: { switch: "회사 바꾸기", create: "새 회사 만들기", import: "기존 회사 가져오기" },
    agentLost: "에이전트 연결이 끊겼어요", copied: "복사했어요",
    runtime: {
      off: "Claude Code 로그인이 풀렸어요",
      offWhy: "하던 업무와 기억은 그대로예요. 터미널에서 claude auth login을 실행한 뒤 다시 확인해 주세요. 그때까지 새 업무는 시작하지 않아요.",
      recheck: "다시 확인", cannotStart: "Claude Code가 멈춰서 지금은 새 업무를 시작할 수 없어요.",
    },
    status: { working: "업무 중", reviewing: "검토 중", available: "대기 중", leave: "휴가 중" },
    areas: { arch: "아키텍처", types: "타입 안정성", db: "데이터베이스", security: "보안", l10n: "로컬라이제이션", product: "기획", quality: "품질" },
    teams: { backend: "백엔드팀", frontend: "프론트엔드팀", planning: "기획팀", design: "디자인팀" },
    hire: {
      title: "직원 고용", sub: "새 동료가 자기 책상과 함께 들어와요.",
      species: "어떤 친구인가요", name: "이름", nameHint: "짧을수록 좋아요. 나중에 바꿀 수 있어요.",
      role: "역할", team: "팀", noTeam: "팀 없음", cancel: "취소",
      editTitle: "정보 바꾸기", editSub: "외형과 이름, 역할, 팀을 바꿔요.", save: "저장",
      hireAs: (n) => (n ? n + " 고용하기" : "고용하기"),
      career: "경력", careerNone: "신입으로 들어와요.", careerAdd: "지난 세션에서 가져오기",
      careerChange: "바꾸기", careerDrop: "빼기", careerRead: "경력 정리하기", careerUnread: "아직 정리하지 않았어요.",
      careerLine: (c) => c.project + " · " + c.span, careerCarries: (m, s) => "기억 " + m + "개와 일하는 방식 " + s + "개를 들고 와요.",
    },
    career: {
      title: "경력 가져오기",
      sub: "이 컴퓨터에서 한 Claude Code 세션을 골라요. 대화는 읽기만 하고, 세션은 그대로 둬요.",
      folder: "폴더", sessions: "지난 세션",
      turns: (n, span) => span + " · 메시지 " + n + "개",
      live: "지금 터미널에서 쓰고 있어서 가져올 수 없어요",
      none: "이 폴더에는 가져올 만한 세션이 없어요.",
      read: "경력 정리하기",
      cost: "Claude가 대화를 한 번 읽어요. 길면 최근 부분 위주로 읽어요.",
      readSub: "이 대화를 한 번 읽어 알게 된 것과 일하는 방식을 추려요. 세션은 그대로 둬요.",
      reading: "대화를 읽는 중이에요", readingWhy: "알게 된 것과 일하는 방식을 추리고 있어요.",
      known: "이미 아는 내용",
      knows: "분야 지식", style: "일하는 방식", area: "분야", keep: "가져가기",
      dropped: (n) => "비밀번호나 토큰처럼 보이는 " + n + "줄은 뺐어요.",
      skipped: "대화가 길어서 앞부분은 건너뛰고 최근 부분을 읽었어요.",
      pick: "가져갈 것만 남겨요. 문장은 고칠 수 있어요.",
      back: "뒤로", cancel: "취소",
      take: (n) => (n ? n + "개 가져오기" : "가져오기"),
      from: (folder) => folder + " 세션",
      needClaude: "Claude Code가 준비되면 정리할 수 있어요.",
      failTitle: "경력을 정리하지 못했어요",
      failWhy: "Claude Code가 대화를 끝까지 읽지 못했어요. 다시 시도하거나, 경력 없이 고용할 수 있어요.",
      retry: "다시 시도", without: "경력 없이 고용",
      emptyTitle: "가져올 만한 게 없었어요",
      emptyWhy: "이 대화에는 다른 업무에도 쓸 만한 지식이나 일하는 방식이 보이지 않았어요.",
      other: "다른 세션 고르기", asNew: "신입으로 고용",
    },
    teach: {
      titleTo: (name) => name + "에게 알려주기",
      titleCompany: "회사 전체에 알려주기",
      titlePick: (area) => withParticle(area, "을", "를") + " 누구에게 알려줄까요",
      titleEdit: "기억 고치기",
      subTo: "업무마다 이 기억을 함께 들고 가요.",
      subCompany: "모든 직원이 함께 알게 돼요.",
      subPick: "고른 사람의 전문 분야가 돼요.",
      who: "받는 사람", area: "분야", text: "내용",
      placeholder: "예: 결제 테이블은 월 단위로 파티셔닝돼 있어요.",
      hint: "한두 문장이 좋아요.",
      areaHint: "찾는 분야가 없나요?", areaHintLink: "회사 › 분야·역할에서 추가하기",
      source: (x) => "출처: " + x,
      inArea: (n) => "이 분야 기억 " + n,
      gainArea: (name, area) => withParticle(area, "이", "가") + " " + name + "의 전문 분야가 돼요",
      carried: (a, b) => "업무마다 들고 가는 기억 " + a + "자 → " + b + "자",
      onLeave: "휴가 중이에요. 돌아와서 맡는 업무부터 이 기억을 들고 가요.",
      cancel: "취소", teach: "알려주기", save: "저장",
    },
  },
  en: {
    nav: { office: "Office", projects: "Projects", people: "People", company: "Company", settings: "Settings", outside: "Outside the company", plaza: "Plaza" },
    companies: { switch: "Switch company", create: "Start a new company", import: "Import an existing company" },
    agentLost: "The agent disconnected", copied: "Copied",
    runtime: {
      off: "Claude Code signed out",
      offWhy: "Tasks in progress and everything remembered are untouched. Run claude auth login in a terminal, then check again. Nothing new starts until then.",
      recheck: "Check again", cannotStart: "Claude Code has stopped, so nothing new can start right now.",
    },
    status: { working: "Working", reviewing: "Reviewing", available: "Free", leave: "On leave" },
    areas: { arch: "Architecture", types: "Type safety", db: "Database", security: "Security", l10n: "Localization", product: "Product", quality: "Quality" },
    teams: { backend: "Backend", frontend: "Frontend", planning: "Planning", design: "Design" },
    hire: {
      title: "Hire", sub: "Someone new joins, with a desk of their own.",
      species: "Who are they?", name: "Name", nameHint: "Shorter is better. You can change it later.",
      role: "Role", team: "Team", noTeam: "No team", cancel: "Cancel",
      editTitle: "Edit details", editSub: "Change how they look, their name, role and team.", save: "Save",
      hireAs: (n) => (n ? "Hire " + n : "Hire"),
      career: "Experience", careerNone: "They join new.", careerAdd: "Bring it from a past session",
      careerChange: "Change", careerDrop: "Remove", careerRead: "Sum up the experience", careerUnread: "Not summed up yet.",
      careerLine: (c) => c.project + " · " + c.span, careerCarries: (m, s) => "They bring " + m + (m === 1 ? " memory" : " memories") + " and " + s + (s === 1 ? " way of working." : " ways of working."),
    },
    career: {
      title: "Bring in experience",
      sub: "Pick a Claude Code session held on this computer. The conversation is only read; the session stays as it is.",
      folder: "Folder", sessions: "Past sessions",
      turns: (n, span) => span + " · " + n + " messages",
      live: "In use in a terminal right now, so it cannot be brought in",
      none: "No session in this folder is worth bringing in.",
      read: "Sum up the experience",
      cost: "Claude reads the conversation once. A long one is read from its most recent part.",
      readSub: "The conversation is read once to pick out what they learned and how they work. The session stays as it is.",
      reading: "Reading the conversation", readingWhy: "Picking out what they learned and how they work.",
      known: "Already known",
      knows: "What they know", style: "How they work", area: "Area", keep: "Bring this",
      dropped: (n) => n + (n === 1 ? " line that looked like a password or token was left out." : " lines that looked like passwords or tokens were left out."),
      skipped: "The conversation was long, so its beginning was skipped and the recent part was read.",
      pick: "Keep only what they should bring. You can reword any line.",
      back: "Back", cancel: "Cancel",
      take: (n) => (n ? "Bring " + n : "Bring them"),
      from: (folder) => "a " + folder + " session",
      needClaude: "This can be summed up once Claude Code is ready.",
      failTitle: "The experience could not be summed up",
      failWhy: "Claude Code did not get through the conversation. Try again, or hire them without it.",
      retry: "Try again", without: "Hire without it",
      emptyTitle: "Nothing worth bringing",
      emptyWhy: "This conversation holds no knowledge or way of working that would help with other work.",
      other: "Pick another session", asNew: "Hire them new",
    },
    teach: {
      titleTo: (name) => "Teach " + name,
      titleCompany: "Tell the whole company",
      titlePick: (area) => "Who should learn " + area + "?",
      titleEdit: "Edit this memory",
      subTo: "They carry this into every task.",
      subCompany: "Everyone will know it.",
      subPick: "It becomes their area.",
      who: "Who", area: "Area", text: "What to remember",
      placeholder: "e.g. The payments table is partitioned by month.",
      hint: "A sentence or two is best.",
      areaHint: "Not the right area?", areaHintLink: "Add one in Company › Areas & roles",
      source: (x) => "Came from " + x,
      inArea: (n) => n + " here",
      gainArea: (name, area) => area + " becomes one of " + name + "'s areas",
      carried: (a, b) => "Carried into every task " + a + " → " + b + " chars",
      onLeave: "They are on leave. They carry this from the first task after they are back.",
      cancel: "Cancel", teach: "Teach", save: "Save",
    },
  },
};


/* ═══ the sample company ═══ */
// One company across the samples: the people screen and the project board
// describe the same five, and review seats are derived from what each of them
// has been taught, not stored separately.

const STAFF = [
  { id: "p1", name: "모카", species: "cat", role: "Backend Engineer",
    team: "backend", status: "working", joined: "2026. 3. 2.",
    task: { ko: "결제 내역 페이지네이션", en: "Paginate the payment history" }, agentLost: true, done: 41, reviews: 18,
    style: [{ ko: "설명은 짧게, 코드로 보여줘", en: "Keep explanations short; show me code" }, { ko: "테스트를 먼저 써", en: "Write the test first" }, { ko: "PR은 300줄을 넘기지 않아요. 넘으면 쪼개요.", en: "Keep a PR under 300 lines. Split it if it grows." }],
    memories: [
      { area: "db", text: { ko: "복합 인덱스는 컬럼 순서가 중요해요. (a,b)와 (b,a)는 다른 인덱스예요.", en: "Composite indexes care about column order. (a,b) is not (b,a)." }, from: { ko: "결제 조회가 느린 이슈", en: "the slow payment lookup" }, used: 14 },
      { area: "db", text: { ko: "결제 테이블은 월 단위로 파티셔닝돼 있어요. 전체 스캔 쿼리는 쓰지 마세요.", en: "The payments table is partitioned by month. Never write a full scan." }, from: null, used: 9 },
      { area: "arch", text: { ko: "도메인 레이어에서 Date.now()를 쓰지 않아요. 현재 시각은 인자로 받아요.", en: "No Date.now() in the domain layer. The current time arrives as an argument." }, from: { ko: "PR #4102", en: "PR #4102" }, used: 22 },
      { area: "types", text: { ko: "any를 쓰지 않아요. 모르면 unknown으로 두고 좁혀 나가요.", en: "No any. Start from unknown and narrow it down." }, from: null, used: 11 }
    ] },
  { id: "p2", name: "두부", species: "bunny", role: "Frontend Engineer",
    team: "frontend", status: "working", joined: "2026. 4. 15.",
    task: { ko: "주문 상태 타입 좁히기", en: "Narrow the order status type" }, done: 33, reviews: 9,
    style: [{ ko: "완성 전에 스크린샷을 남겨", en: "Leave a screenshot before you call it done" }, { ko: "버튼은 항상 pill이에요. 8px 모서리를 쓰지 않아요.", en: "Buttons are always pills. Never an 8px corner." }],
    memories: [
      { area: "l10n", text: { ko: "한글에는 letter-spacing을 걸지 않아요. 자소가 벌어져 보여요.", en: "Never track Hangul. It pulls the jamo of a syllable apart." }, from: { ko: "사이드바 자간이 깨진 이슈", en: "the broken sidebar tracking" }, used: 18 },
      { area: "l10n", text: { ko: "같은 문장도 영문이 한글보다 길어요. 고정 너비를 쓰지 않아요.", en: "The same sentence runs longer in English. Avoid fixed widths." }, from: { ko: "PR #4180", en: "PR #4180" }, used: 6 },
    ] },
  { id: "p3", name: "단풍", species: "deer", role: "Product Manager",
    team: "planning", status: "working", joined: "2026. 2. 20.",
    task: { ko: "결제 웹훅 서명 검증", en: "Verify the payment webhook signature" }, done: 27, reviews: 22,
    style: [{ ko: "막히면 30분 안에 물어봐", en: "Ask within 30 minutes of getting stuck" }, { ko: "금요일 오후에는 배포하지 않아요.", en: "No deploys on a Friday afternoon." }],
    memories: [
      { area: "product", text: { ko: "업무는 30분 이내로 쪼개요. 넘으면 사실 두 개예요.", en: "Keep a task under 30 minutes. Longer means it is really two." }, from: null, used: 15 },
      { area: "product", text: { ko: "PR 설명에는 무엇을 했는지가 아니라 왜 했는지를 적어요.", en: "A PR description says why, not what." }, from: null, used: 8 },
    ] },
  { id: "p4", name: "삐약", species: "chick", role: "DBA",
    team: "backend", status: "reviewing", joined: "2026. 5. 8.",
    review: { ko: "결제 웹훅 서명 검증", en: "Verify the payment webhook signature" }, done: 19, reviews: 6,
    style: [{ ko: "마이그레이션은 두 번 확인해", en: "Check migrations twice" }],
    memories: [
      { area: "db", text: { ko: "마이그레이션은 항상 되돌릴 수 있게 써요.", en: "Always write a migration you can roll back." }, from: { ko: "스키마 롤백이 안 된 사고", en: "the rollback that would not roll back" }, used: 11 },
      { area: "db", text: { ko: "시각은 epoch ms INTEGER로 저장해요. 문자열 날짜를 쓰지 않아요.", en: "Store time as epoch ms INTEGER. Never a date string." }, from: null, used: 5 },
      { area: "db", text: { ko: "NULL과 undefined를 오갈 때는 CHECK 제약을 같이 걸어요.", en: "Mapping NULL to undefined needs a CHECK constraint beside it." }, from: { ko: "결제 상태가 뒤집힌 버그", en: "the flipped payment status" }, used: 8 },
      { area: "db", text: { ko: "외래 키에는 항상 인덱스를 같이 만들어요. 삭제가 느려져요.", en: "Index every foreign key, or deletes crawl." }, from: null, used: 6 },
      { area: "db", text: { ko: "트랜잭션 안에서 외부 API를 호출하지 않아요.", en: "Never call an external API inside a transaction." }, from: { ko: "결제 타임아웃 장애", en: "the payment timeout outage" }, used: 13 },
      { area: "db", text: { ko: "집계 쿼리는 읽기 전용 커넥션으로 보내요.", en: "Send aggregate queries to the read-only connection." }, from: null, used: 3 },
      { area: "security", text: { ko: "쿼리에 사용자 입력을 문자열로 이어 붙이지 않아요.", en: "Never concatenate user input into a query." }, from: null, used: 0 },
    ] },
  { id: "p5", name: "완두", species: "frog", role: "DevOps Engineer",
    team: "frontend", status: "leave", joined: "2026. 1. 12.",
    leaveSince: { ko: "9월 23일부터", en: "Since Sep 23" }, done: 52, reviews: 14,
    style: [{ ko: "두 번 할 일이면 자동화해", en: "If you will do it twice, automate it" }, { ko: "배포 전에 typecheck · lint · test 세 개를 모두 돌려요.", en: "Run typecheck, lint and test before any deploy." }],
    memories: [
      { area: "security", text: { ko: "비밀값은 .env에 두고 절대 커밋하지 않아요.", en: "Secrets live in .env and are never committed." }, from: null, used: 9 },
    ] },
];

/* ═══ the roster in the sidebar ═══ */
// Presence: whichever screen you are on, you can still see who is in and what
// they are doing. That is the whole job, so it is one implementation and every
// screen shows the same five people with the same status.

const PLUG = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v3.6M10 2v3.6M4.4 5.6h7.2v2.6a3.6 3.6 0 0 1-7.2 0z"/><path d="M8 11.8V14"/></svg>';

// The mark for an agent that stopped; `inline` puts it in a line of text.
function agentMark(inline = false) {
  const label = WORDS[uiLang()].agentLost;
  return `<span class="agent-mark${inline ? " inline" : ""}" role="img" aria-label="${label}" title="${label}">${PLUG}</span>`;
}

function mountRoster(el, onPick) {
  for (const p of STAFF) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "member";
    b.dataset.id = p.id;
    b.innerHTML =
      '<span class="av"><canvas aria-hidden="true" width="22" height="22"></canvas></span>' +
      "<span>" + p.name + "</span>" +
      '<span class="m-state">' + (p.agentLost ? agentMark(true) : "") + '<span class="dot ' + p.status + '"></span></span>';

    const c = b.querySelector("canvas");
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const sp = SPECIES.get(p.species);
    paint(ctx, sp.sprite, 1, 3, 3, skin(sp));

    if (onPick) b.addEventListener("click", (e) => onPick(p, b, e.detail === 0));
    el.appendChild(b);
  }
}

/* ═══ a row's ⋯ menu ═══ */
// One small menu for anything listed in rows: a memory, a rule, an area.
// An item with `confirm` asks once more in place before it runs, for what
// cannot be undone.

let menuPop = null;
let menuAnchor = null;

function closeRowMenu() {
  if (!menuPop) return;
  menuPop.removeAttribute("data-open");
  menuAnchor?.setAttribute("aria-expanded", "false");
  menuAnchor = null;
}

const KEEP_ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>';

// One line of what an employee may ("yes"), may not ("no") or stops to ask ("ask").
const SCOPE_ICON = {
  yes: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.4 8.4l3 3 6.2-6.6"/></svg>',
  no: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="5.6"/><path d="M4 12L12 4"/></svg>',
  ask: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 4v8M10 4v8"/></svg>',
};
const scopeRow = (kind, html) => `<div class="scope-row ${kind}">${SCOPE_ICON[kind]}<span>${html}</span></div>`;

function openRowMenu(anchor, items, { keep = "Keep it" } = {}) {
  if (menuAnchor === anchor) return closeRowMenu();
  closeRowMenu();
  if (!menuPop) {
    menuPop = document.createElement("div");
    menuPop.className = "pop";
    menuPop.setAttribute("role", "menu");
    menuPop.style.width = "232px";
    document.body.append(menuPop);
    document.addEventListener("pointerdown", (e) => {
      if (menuAnchor && !menuPop.contains(e.target) && !menuAnchor.contains(e.target)) closeRowMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !menuAnchor) return;
      const back = menuAnchor;
      closeRowMenu();
      back.focus({ preventScroll: true });
    });
    window.addEventListener("scroll", closeRowMenu, { passive: true });
  }

  const row = (item, run) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mrow" + (item.bad ? " mrow-bad" : "");
    b.innerHTML = (item.icon ?? "") + item.label;
    b.addEventListener("click", run);
    return b;
  };
  const acts = document.createElement("div");
  acts.className = "p-acts";
  acts.style.padding = "0";
  for (const item of items) {
    acts.append(row(item, () => {
      if (!item.confirm) {
        closeRowMenu();
        item.run();
        return;
      }
      const why = document.createElement("p");
      why.className = "p-why";
      why.textContent = item.confirm;
      acts.replaceChildren(why, row(item, () => { closeRowMenu(); item.run(); }), row({ label: keep, icon: KEEP_ICON }, closeRowMenu));
      acts.querySelector(".mrow").focus({ preventScroll: true });
    }));
  }
  menuPop.replaceChildren(acts);
  menuAnchor = anchor;
  anchor.setAttribute("aria-expanded", "true");
  menuPop.setAttribute("data-open", "");
  const r = anchor.getBoundingClientRect();
  const w = menuPop.offsetWidth, edge = 12;
  menuPop.style.left = Math.round(Math.min(Math.max(edge, r.right - w), innerWidth - w - edge)) + "px";
  menuPop.style.top = Math.round(Math.min(r.bottom + 6, innerHeight - menuPop.offsetHeight - edge)) + "px";
}

/* ═══ hiring ═══ */
// Every "hire" after the first opens this dialog; first-run keeps its own
// steps. With `edit` it corrects who someone already is. Like teaching, it
// stores nothing itself: the person goes to onSave.

const ROLES = ["Backend Engineer", "Frontend Engineer", "Product Manager", "DBA", "DevOps Engineer", "QA Engineer"];

function spriteCanvas(species, px) {
  const c = document.createElement("canvas");
  c.width = c.height = px;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  const sp = SPECIES.get(species);
  const scale = Math.max(1, Math.floor(px / 16));
  const pad = Math.floor((px - 16 * scale) / 2);
  paint(g, sp.sprite, scale, pad, pad, skin(sp));
  return c;
}

// `teams` is the company's list as [{ key, label }] when the caller holds it.
// `roles` likewise, as titles.
// `career`, when given, opens where past experience is brought in and calls back with it.
// `from`, a candidate from the plaza, arrives with their look and their session.
function openHire({ team = null, teams = null, roles = null, edit = null, career = null, from = null, onSave }) {
  const lang = uiLang();
  const w = WORDS[lang].hire;
  const local = (v) => (v && typeof v === "object" ? v[lang] : v);
  const state = { species: edit ? SPECIES.get(edit.species) : from ? SPECIES.get(from.species) : null, career: null };

  const scrim = document.createElement("div");
  scrim.className = "scrim";
  scrim.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
    <div class="m-hd">
      <span class="m-av" data-av></span>
      <span style="flex:1;min-width:0"><span class="m-t">${edit ? w.editTitle : w.title}</span><span class="m-s">${edit ? w.editSub : w.sub}</span></span>
      <button class="ibtn" type="button" data-close aria-label="${w.cancel}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg></button>
    </div>
    <div class="m-sec">
      <span class="label">${w.species}</span>
      <div class="species" data-cast></div>
      <div class="picked" data-picked></div>
      <div class="field">
        <label class="label" for="hireName">${w.name}</label>
        <input class="input" id="hireName" maxlength="12" autocomplete="off" />
        <span class="hint">${w.nameHint}</span>
      </div>
      <div class="field">
        <label class="label" for="hireRole">${w.role}</label>
        <span class="select-wrap"><select class="select" id="hireRole"></select><svg viewBox="0 0 11 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1.5l4.5 4.5L10 1.5"/></svg></span>
      </div>
      <div class="field">
        <label class="label" for="hireTeam">${w.team}</label>
        <span class="select-wrap"><select class="select" id="hireTeam"></select><svg viewBox="0 0 11 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1.5l4.5 4.5L10 1.5"/></svg></span>
      </div>
      ${career && !edit ? `<div class="field"><span class="label">${w.career}</span><div class="career" data-career></div></div>` : ""}
    </div>
    <div class="m-foot">
      <button class="btn btn-secondary btn-md" type="button" data-close>${w.cancel}</button>
      <button class="btn btn-primary btn-md" type="button" data-ok disabled></button>
    </div>
  </div>`;
  document.body.append(scrim);
  const $ = (sel) => scrim.querySelector(sel);
  const name = $("#hireName");
  const returnTo = document.activeElement;

  const roleList = roles ?? ROLES;
  // Someone may hold a title the list no longer has; it stays theirs to keep.
  for (const r of edit && !roleList.includes(edit.role) ? [edit.role, ...roleList] : roleList) $("#hireRole").append(new Option(r, r));
  if (edit) $("#hireRole").value = edit.role;
  // A team is optional: a tiny office may not have one yet.
  $("#hireTeam").append(new Option(w.noTeam, ""));
  for (const x of teams ?? Object.entries(WORDS[lang].teams).map(([key, label]) => ({ key, label }))) $("#hireTeam").append(new Option(x.label, x.key));
  if (team || edit?.team) $("#hireTeam").value = edit ? edit.team ?? "" : team;

  const cast = $("[data-cast]");
  for (const c of CAST) {
    const b = document.createElement("button");
    b.className = "sp";
    b.type = "button";
    b.setAttribute("aria-pressed", String(state.species === c));
    b.setAttribute("aria-label", local(c.species));
    b.append(spriteCanvas(c.key, 34));
    b.addEventListener("click", () => {
      state.species = c;
      for (const x of cast.children) x.setAttribute("aria-pressed", String(x === b));
      $("[data-picked]").innerHTML = `<b>${local(c.species)}</b><span>${local(c.family)}</span>`;
      $("[data-av]").replaceChildren(spriteCanvas(c.key, 32));
      name.placeholder = local(c);
      sync();
    });
    cast.append(b);
  }
  if (edit) {
    name.value = edit.name;
    $("[data-picked]").innerHTML = `<b>${local(state.species.species)}</b><span>${local(state.species.family)}</span>`;
    $("[data-av]").replaceChildren(spriteCanvas(edit.species, 32));
  }

  function renderCareer() {
    const box = $("[data-career]");
    if (!box) return;
    const c = state.career;
    const pending = !c && from;
    box.innerHTML = pending
      ? `<span class="career-tx"><b>${w.careerLine({ project: folderName(from.folder), span: local(from.span) })}</b><span>${RUNTIME.off ? WORDS[lang].career.needClaude : w.careerUnread}</span></span>
         <button class="btn btn-secondary btn-sm" type="button" data-career-read${RUNTIME.off ? " disabled" : ""}>${w.careerRead}</button>`
      : c
      ? `<span class="career-tx"><b>${w.careerLine(c)}</b><span>${w.careerCarries(c.memories.length, c.style.length)}</span></span>
         <button class="btn btn-secondary btn-sm" type="button" data-career-add>${w.careerChange}</button>
         <button class="btn btn-secondary btn-sm" type="button" data-career-drop>${w.careerDrop}</button>`
      : `<span class="career-tx"><span>${w.careerNone}</span></span>
         <button class="btn btn-secondary btn-sm" type="button" data-career-add>${w.careerAdd}</button>`;
    const took = (picked) => {
      state.career = picked;
      renderCareer();
    };
    box.querySelector("[data-career-add]")?.addEventListener("click", () => career(took));
    box.querySelector("[data-career-read]")?.addEventListener("click", () => career(took, from));
    box.querySelector("[data-career-drop]")?.addEventListener("click", () => {
      state.career = null;
      renderCareer();
    });
  }
  renderCareer();

  // A nickname the user did not write is not their employee, so the button
  // waits for both.
  function sync() {
    const n = name.value.trim();
    $("[data-ok]").textContent = edit ? w.save : w.hireAs(n);
    $("[data-ok]").disabled = !(state.species && n);
  }

  function close() {
    scrim.remove();
    document.removeEventListener("keydown", onKey);
    returnTo?.focus?.({ preventScroll: true });
  }
  function onKey(e) {
    // a window opened over this one closes first
    if (e.key === "Escape" && scrim === [...document.querySelectorAll(".scrim")].at(-1)) close();
  }

  sync();
  name.addEventListener("input", sync);
  scrim.addEventListener("pointerdown", (e) => { if (e.target === scrim) close(); });
  for (const b of scrim.querySelectorAll("[data-close]")) b.addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  $("[data-ok]").addEventListener("click", () => {
    const hired = { name: name.value.trim(), species: state.species.key, role: $("#hireRole").value, team: $("#hireTeam").value || null, career: state.career };
    close();
    onSave(hired);
  });
  if (state.species) {
    for (const x of cast.children) x.setAttribute("aria-pressed", String(x.getAttribute("aria-label") === local(state.species.species)));
    $("[data-picked]").innerHTML = `<b>${local(state.species.species)}</b><span>${local(state.species.family)}</span>`;
    $("[data-av]").replaceChildren(spriteCanvas(state.species.key, 32));
    name.placeholder = local(state.species);
    sync();
  }
  (edit || from ? name : cast.firstElementChild).focus({ preventScroll: true });
}

/* ═══ the plaza's candidates ═══ */
// Claude Code sessions held on this computer, as the app lists them: the
// app's own runs, short or old ones, hired and sent-away ones are left out.
// `last` is how long ago the session was last written to; one written to in
// the last five minutes is in use in a terminal. `failsOnce` and `empty` show
// a reading that fails the first time, and one that finds nothing.

const CANDIDATES = [
  { id: "s1", folder: "~/Projects/tinysoft", first: { ko: "결제 재시도 로직을 정리하자", en: "Let's sort out the payment retry logic" }, span: { ko: "9월 12일 – 9월 24일", en: "Sep 12 – Sep 24" }, turns: 214, last: { ko: "2일 전", en: "2 days ago" }, long: true },
  { id: "s2", folder: "~/Projects/tinysoft", first: { ko: "웹훅 서명 검증이 가끔 실패해", en: "The webhook signature check fails now and then" }, span: { ko: "9월 26일", en: "Sep 26" }, turns: 38, last: { ko: "방금", en: "just now" }, live: true },
  { id: "s3", folder: "~/Projects/settle", first: { ko: "정산 배치가 느린 이유 찾아줘", en: "Find out why the settlement batch is slow" }, span: { ko: "8월 30일 – 9월 2일", en: "Aug 30 – Sep 2" }, turns: 61, last: { ko: "3주 전", en: "3 weeks ago" } },
  { id: "s4", folder: "~/Projects/orders", first: { ko: "주문 상태 타입을 좁혀 보자", en: "Let's narrow the order status type" }, span: { ko: "9월 20일", en: "Sep 20" }, turns: 27, last: { ko: "6일 전", en: "6 days ago" } },
  { id: "s5", folder: "~/blog", first: { ko: "블로그에 다크 모드 넣어줘", en: "Add a dark mode to the blog" }, span: { ko: "9월 23일 – 9월 24일", en: "Sep 23 – Sep 24" }, turns: 44, last: { ko: "2일 전", en: "2 days ago" } },
  { id: "s6", folder: "~/Projects/infra", first: { ko: "테라폼 모듈을 환경별로 쪼개자", en: "Split the Terraform modules by environment" }, span: { ko: "9월 15일 – 9월 22일", en: "Sep 15 – Sep 22" }, turns: 132, last: { ko: "4일 전", en: "4 days ago" }, long: true },
  { id: "s7", folder: "~/Projects/app-mobile", first: { ko: "푸시 알림 딥링크가 안 열려", en: "Push notification deep links don't open" }, span: { ko: "9월 21일", en: "Sep 21" }, turns: 88, last: { ko: "5일 전", en: "5 days ago" } },
  { id: "s8", folder: "~/dotfiles", first: { ko: "zsh 설정 좀 정리해줘", en: "Tidy up my zsh config" }, span: { ko: "9월 19일", en: "Sep 19" }, turns: 19, last: { ko: "1주 전", en: "1 week ago" }, empty: true },
  { id: "s9", folder: "~/Projects/design-system", first: { ko: "버튼 variant를 정리하자", en: "Let's clean up the button variants" }, span: { ko: "9월 8일 – 9월 12일", en: "Sep 8 – Sep 12" }, turns: 53, last: { ko: "2주 전", en: "2 weeks ago" }, failsOnce: true },
  { id: "s10", folder: "~/Projects/tinysoft", first: { ko: "환불 API가 멱등한지 확인해줘", en: "Check the refund API is idempotent" }, span: { ko: "9월 18일", en: "Sep 18" }, turns: 36, last: { ko: "8일 전", en: "8 days ago" } },
  { id: "s11", folder: "~/Projects/admin", first: { ko: "관리자 권한 체크를 미들웨어로 옮기자", en: "Move the admin permission check into middleware" }, span: { ko: "9월 10일 – 9월 11일", en: "Sep 10 – Sep 11" }, turns: 71, last: { ko: "2주 전", en: "2 weeks ago" } },
].map((c, i) => ({ ...c, species: CAST[(i * 7 + 3) % CAST.length].key }));

const folderName = (folder) => folder.split("/").filter(Boolean).at(-1);

// What reading a session sums up: the sample answers every session the same way.
const SUMMED = {
  knows: [
    { area: "db", text: { ko: "결제 재시도는 멱등키로 묶어요. 같은 키는 한 번만 처리돼요.", en: "Payment retries share an idempotency key; one key is handled once." } },
    { area: "arch", text: { ko: "PG사 응답은 어댑터에서만 해석하고, 도메인에는 결과만 넘겨요.", en: "Only the adapter reads the gateway's reply; the domain gets the outcome." } },
    { area: "security", text: { ko: "웹훅은 서명을 먼저 검증하고, 실패하면 본문을 읽지 않아요.", en: "A webhook's signature is checked first; the body is not read if it fails." } },
    { area: "quality", text: { ko: "재시도 테스트는 시계를 주입해서 돌려요.", en: "Retry tests run with an injected clock." } },
    { area: "arch", text: { ko: "도메인 레이어에서 Date.now()를 쓰지 않아요.", en: "No Date.now() in the domain layer." }, known: true },
  ],
  style: [
    { ko: "바꾸기 전에 관련 테스트부터 돌려 봐요", en: "Run the related tests before changing anything" },
    { ko: "커밋은 작게, 이유를 적어서", en: "Small commits, each saying why" },
  ],
  dropped: 2,
};

/* ═══ bringing experience in ═══ */
// Pick a session, one read-only Claude run sums it up, and the user keeps what
// the hire brings. `session` given, it starts at reading.

function openCareer(done, session = null, hired = new Set()) {
  const lang = uiLang();
  const w = WORDS[lang].career;
  const local = (v) => (v && typeof v === "object" ? v[lang] : v);
  const areas = WORDS[lang].areas;
  const X = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>';
  const ALERT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.2l6 11H2z"/><path d="M8 6.6v3M8 11.4v.1"/></svg>';
  const CHEVRON = '<svg viewBox="0 0 11 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1.5l4.5 4.5L10 1.5"/></svg>';
  const pool = CANDIDATES.filter((c) => !hired.has(c.id));
  const folders = [...new Set(pool.map((c) => c.folder))];

  const scrim = document.createElement("div");
  scrim.className = "scrim";
  scrim.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${w.title}"></div>`;
  document.body.append(scrim);
  const modal = scrim.firstElementChild;
  // what a session summed up to, kept so going back and forth does not read it again
  const state = { folder: session?.folder ?? folders[0], session, knows: [], style: [], read: new Map() };
  const returnTo = document.activeElement;
  const close = () => {
    scrim.remove();
    document.removeEventListener("keydown", onKey);
    returnTo?.focus?.({ preventScroll: true });
  };
  const focusFirst = () => modal.querySelector("select, button.sess:not(:disabled), textarea, [data-forward], [data-take], [data-close]")?.focus({ preventScroll: true });
  const onKey = (e) => e.key === "Escape" && scrim === [...document.querySelectorAll(".scrim")].at(-1) && close();
  document.addEventListener("keydown", onKey);
  scrim.addEventListener("pointerdown", (e) => e.target === scrim && close());
  const head = (sub = w.readSub) => `<div class="m-hd"><span style="flex:1;min-width:0"><span class="m-t">${w.title}</span><span class="m-s">${sub}</span></span>
    <button class="ibtn" type="button" data-close aria-label="${w.cancel}">${X}</button></div>`;
  // the session being read, so it is never a mystery which one it is
  const which = () =>
    `<div class="sess" aria-disabled="true" style="cursor:default"><span class="sess-tx"><b>${local(state.session.first)}</b><span>${state.session.folder} · ${w.turns(state.session.turns, local(state.session.span))}</span></span></div>`;
  const bind = () => modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));

  function pick() {
    const list = pool.filter((c) => c.folder === state.folder);
    modal.innerHTML = `${head(w.sub)}
      <div class="m-sec">
        <div class="field" style="margin-top:0">
          <label class="label" for="careerFolder">${w.folder}</label>
          <span class="select-wrap"><select class="select" id="careerFolder">${folders.map((f) => `<option value="${f}"${f === state.folder ? " selected" : ""}>${f}</option>`).join("")}</select>${CHEVRON}</span>
        </div>
        <div class="field">
          <span class="label">${w.sessions}</span>
          ${
            list.length
              ? `<div class="sessions" role="radiogroup" aria-label="${w.sessions}">${list
                  .map(
                    (x) => `<button class="sess" type="button" role="radio" data-sess="${x.id}" aria-checked="${state.session?.id === x.id}"${x.live ? " disabled" : ""}>
                      <span class="sess-tx"><b>${local(x.first)}</b><span>${x.live ? w.live : w.turns(x.turns, local(x.span))}</span></span></button>`,
                  )
                  .join("")}</div>`
              : `<p class="hint">${w.none}</p>`
          }
          <span class="hint">${RUNTIME.off ? w.needClaude : w.cost}</span>
        </div>
      </div>
      <div class="m-foot">
        <button class="btn btn-secondary btn-md" type="button" data-close>${w.cancel}</button>
        <button class="btn btn-primary btn-md" type="button" data-read${state.session && !RUNTIME.off ? "" : " disabled"}>${w.read}</button>
      </div>`;
    bind();
    modal.querySelector("#careerFolder").addEventListener("change", (e) => {
      state.folder = e.target.value;
      state.session = null;
      pick();
    });
    modal.querySelectorAll("[data-sess]").forEach((b) =>
      b.addEventListener("click", () => {
        state.session = list.find((x) => x.id === b.dataset.sess);
        pick();
      }),
    );
    modal.querySelector("[data-read]").addEventListener("click", read);
    focusFirst();
  }

  // The sample stands in for the one Claude run that reads the session.
  function read() {
    const done = state.read.get(state.session.id);
    if (done) return Object.assign(state, done), review();
    modal.innerHTML = `${head()}
      <div class="m-sec">${which()}<div class="reading" role="status"><b>${w.reading}</b><span>${w.readingWhy}</span></div><p class="hint" style="margin:0">${w.cost}</p></div>
      <div class="m-foot"><button class="btn btn-secondary btn-md" type="button" data-close>${w.cancel}</button></div>`;
    bind();
    focusFirst();
    setTimeout(() => {
      if (!scrim.isConnected) return;
      if (state.session.failsOnce && !state.tried) {
        state.tried = true;
        return failed();
      }
      if (state.session.empty) return nothing();
      state.knows = SUMMED.knows.map((m) => ({ area: m.area, text: local(m.text), on: !m.known, known: Boolean(m.known) }));
      state.style = SUMMED.style.map((x) => ({ text: local(x), on: true }));
      state.read.set(state.session.id, { knows: state.knows, style: state.style });
      review();
    }, 1200);
  }

  // Either way the hire goes on; it only brings nothing.
  function ended(kind, title, why, back, forward) {
    modal.innerHTML = `${head()}
      <div class="m-sec">${which()}<div class="notice ${kind}" style="margin-top:10px"><span class="n-ic">${ALERT}</span><span class="n-tx"><b>${title}</b><span>${why}</span></span></div></div>
      <div class="m-foot">
        <button class="btn btn-secondary btn-md" type="button" data-back>${back.label}</button>
        <button class="btn btn-primary btn-md" type="button" data-forward>${forward.label}</button>
      </div>`;
    bind();
    modal.querySelector("[data-back]").addEventListener("click", back.run);
    modal.querySelector("[data-forward]").addEventListener("click", forward.run);
    focusFirst();
  }
  const withoutIt = () => {
    close();
    done(null);
  };
  const failed = () => ended("notice-bad", w.failTitle, w.failWhy, { label: w.without, run: withoutIt }, { label: w.retry, run: read });
  const nothing = () =>
    ended("notice-warn", w.emptyTitle, w.emptyWhy, { label: w.other, run: () => ((state.session = null), pick()) }, { label: w.asNew, run: withoutIt });

  function review() {
    const kept = () => state.knows.filter((m) => m.on && m.text.trim()).length + state.style.filter((x) => x.on && x.text.trim()).length;
    const areaSelect = (m, i) =>
      `<span class="select-wrap"><select class="select" data-area="${i}" aria-label="${w.area}">${Object.keys(areas).map((a) => `<option value="${a}"${a === m.area ? " selected" : ""}>${areas[a]}</option>`).join("")}</select>${CHEVRON}</span>`;
    const row = (kind, x, i, extra = "") =>
      `<div class="cand"${x.on ? "" : " data-off"}><input type="checkbox" data-on="${kind}:${i}" aria-label="${w.keep}: ${x.text.replace(/"/g, "&quot;")}"${x.on ? " checked" : ""} />
        <span class="cand-body">${extra}${x.known ? `<span class="hint" style="margin:0">${w.known}</span>` : ""}<textarea class="textarea" rows="2" data-text="${kind}:${i}" maxlength="200" aria-label="${kind === "knows" ? w.knows : w.style}">${x.text.replace(/</g, "&lt;")}</textarea></span></div>`;
    const warned = [SUMMED.dropped ? w.dropped(SUMMED.dropped) : "", state.session.long ? w.skipped : ""].filter(Boolean);
    modal.innerHTML = `${head()}
      <div class="m-sec">
        ${which()}
        ${warned.length ? `<div class="notice notice-warn" style="margin:10px 0 14px"><span class="n-ic">${ALERT}</span>
          <span class="n-tx"><b>${warned[0]}</b>${warned[1] ? `<span>${warned[1]}</span>` : ""}</span></div>` : ""}
        <p class="hint" style="margin:0 0 4px">${w.pick}</p>
        <div class="cand-group"><span class="label">${w.knows}</span>${state.knows.map((m, i) => row("knows", m, i, areaSelect(m, i))).join("")}</div>
        <div class="cand-group"><span class="label">${w.style}</span>${state.style.map((x, i) => row("style", x, i)).join("")}</div>
      </div>
      <div class="m-foot">
        <button class="btn btn-secondary btn-md" type="button" data-back>${w.back}</button>
        <button class="btn btn-primary btn-md" type="button" data-take>${kept() ? w.take(kept()) : w.asNew}</button>
      </div>`;
    bind();
    const item = (key) => {
      const [kind, i] = key.split(":");
      return state[kind][Number(i)];
    };
    const sync = () => {
      const b = modal.querySelector("[data-take]");
      b.textContent = kept() ? w.take(kept()) : w.asNew;
    };
    modal.querySelectorAll("[data-on]").forEach((c) =>
      c.addEventListener("change", () => {
        item(c.dataset.on).on = c.checked;
        c.closest(".cand").toggleAttribute("data-off", !c.checked);
        sync();
      }),
    );
    modal.querySelectorAll("[data-text]").forEach((input) => input.addEventListener("input", () => ((item(input.dataset.text).text = input.value), sync())));
    modal.querySelectorAll("[data-area]").forEach((sel) => sel.addEventListener("change", () => (state.knows[Number(sel.dataset.area)].area = sel.value)));
    modal.querySelector("[data-back]").addEventListener("click", pick);
    modal.querySelector("[data-take]").addEventListener("click", () => {
      if (kept() === 0) return withoutIt();
      const from = w.from(folderName(state.session.folder));
      close();
      done({
        session: state.session.id,
        project: folderName(state.session.folder),
        span: local(state.session.span),
        memories: state.knows.filter((m) => m.on && m.text.trim()).map((m) => ({ area: m.area, text: m.text.trim(), from, used: 0 })),
        style: state.style.filter((x) => x.on && x.text.trim()).map((x) => ({ text: x.text.trim(), from })),
      });
    });
  }

  if (session) read();
  else pick();
}

/* ═══ a readiness check ═══ */
// One row of a checklist: ok, bad or waiting, and when it is bad, the command
// the user runs outside the app to fix it.

function checkRow(c, copyLabel) {
  const ic = {
    ok: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.2 8.4l3.2 3.2L12.8 4.8"/></svg>',
    bad: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>',
    wait: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 8h8"/></svg>',
  }[c.icon];
  return `
    <div class="check">
      <span class="c-ic ${c.icon}">${ic}</span>
      <span class="c-tx"><b>${c.title}</b>${c.detail ? `<span>${c.detail}</span>` : ""}</span>
      ${c.value ? `<span class="c-val">${c.value}</span>` : ""}
    </div>
    ${
      c.cmd
        ? `<div class="cmd"><pre>${c.cmd.map((l) => `<span class="p">$</span> ${l}`).join("\n")}</pre><button class="copy" type="button">${copyLabel}</button></div>`
        : ""
    }`;
}

/* ═══ moving things out before a delete ═══ */
// Deleting a row that still holds something asks where it goes first.

function openMoveDialog({ title, sub, label, options, cancel, confirm, onConfirm }) {
  const scrim = document.createElement("div");
  scrim.className = "scrim";
  scrim.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
    <div class="m-hd"><span style="flex:1;min-width:0"><span class="m-t"></span><span class="m-s"></span></span></div>
    <div class="m-sec">
      <label class="label" for="moveTo"></label>
      <span class="select-wrap"><select class="select" id="moveTo"></select><svg viewBox="0 0 11 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1.5l4.5 4.5L10 1.5"/></svg></span>
    </div>
    <div class="m-foot">
      <button class="btn btn-secondary btn-md" type="button" data-close></button>
      <button class="btn btn-danger btn-md" type="button" data-ok></button>
    </div>
  </div>`;
  const $ = (sel) => scrim.querySelector(sel);
  $(".m-t").textContent = title;
  $(".m-s").textContent = sub;
  $(".label").textContent = label;
  $("[data-close]").textContent = cancel;
  $("[data-ok]").textContent = confirm;
  for (const o of options) $("#moveTo").append(new Option(o.label, o.value));
  const close = () => { scrim.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.body.append(scrim);
  document.addEventListener("keydown", onKey);
  scrim.addEventListener("pointerdown", (e) => { if (e.target === scrim) close(); });
  $("[data-close]").addEventListener("click", close);
  $("[data-ok]").addEventListener("click", () => { const v = $("#moveTo").value; close(); onConfirm(v); });
  $("[data-close]").focus();
}

/* ═══ teaching ═══ */
// Every place that says "teach" opens this one dialog; where it was opened
// from decides only what is already filled in. `to` is someone from STAFF,
// "company", or null to let the user choose. `areas` is the company's list
// as [{ key, label }] when the caller holds it. The dialog stores
// nothing itself: it hands the memory to onSave.

/* ═══ how wide the app is ═══ */
// Normal, wide or the whole window: the user's choice, kept in this browser
// and applied on every page before it draws.
const APP_WIDTHS = { normal: "1400px", wide: "1760px", full: "100%" };
const WIDTH_KEY = "mto.appWidth";

function appWidth() {
  try {
    const saved = localStorage.getItem(WIDTH_KEY);
    return saved in APP_WIDTHS ? saved : "normal";
  } catch {
    return "normal";
  }
}

function setAppWidth(key) {
  document.documentElement.style.setProperty("--app-width", APP_WIDTHS[key]);
  try { localStorage.setItem(WIDTH_KEY, key); } catch {}
}

document.documentElement.style.setProperty("--app-width", APP_WIDTHS[appWidth()]);

function uiLang() {
  return new URLSearchParams(location.search).get("lang") === "en" ? "en" : "ko";
}

// Whether the last syllable has a final consonant, which picks 이/가, 을/를, 은/는.
function hasBatchim(word) {
  const c = word.charCodeAt(word.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
}

function withParticle(word, afterFinal, afterVowel) {
  return word + (hasBatchim(word) ? afterFinal : afterVowel);
}

// `from` is the task it was opened from, if any; that is where the memory came
// from. Anywhere else it was told directly.
function openTeach({ to = null, area = null, from = null, edit = null, carried = null, areas = null, text: startWith = null, onSave }) {
  const lang = uiLang();
  const w = WORDS[lang].teach;
  const list = areas ?? Object.entries(WORDS[lang].areas).map(([key, label]) => ({ key, label }));
  const areaName = (a) => list.find((x) => x.key === a)?.label ?? "";
  const local = (v) => (v && typeof v === "object" ? v[lang] : v ?? "");
  const MAX = 200;

  const state = { to, area: edit ? edit.area : area };
  const scrim = document.createElement("div");
  scrim.className = "scrim";
  scrim.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
    <div class="m-hd">
      <span class="m-av" data-av></span>
      <span style="flex:1;min-width:0"><span class="m-t" data-title></span><span class="m-s" data-sub></span></span>
      <button class="ibtn" type="button" data-close aria-label="${w.cancel}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg></button>
    </div>
    <div class="m-sec" data-who hidden><span class="k">${w.who}</span><div data-picks></div></div>
    <div class="m-sec">
      <div data-areafield>
        <span class="k">${w.area}</span><div class="opts" role="radiogroup" aria-label="${w.area}" data-areas></div>
        ${areas ? "" : `<p class="hint">${w.areaHint} <a href="company.html${lang === "en" ? "?lang=en" : ""}#lists">${w.areaHintLink}</a></p>`}
      </div>
      <div class="field">
        <label class="label" for="teachText">${w.text}</label>
        <textarea class="textarea" id="teachText" rows="3" maxlength="${MAX}" placeholder="${w.placeholder}"></textarea>
        <span class="field-foot"><span class="hint">${w.hint}</span><span class="count" data-count></span></span>
      </div>
      <label class="source" data-source hidden><input type="checkbox" id="teachFrom" checked /><span></span></label>
    </div>
    <div class="m-sec" data-effect></div>
    <div class="m-foot">
      <button class="btn btn-secondary btn-md" type="button" data-close>${w.cancel}</button>
      <button class="btn btn-primary btn-md" type="button" data-ok>${edit ? w.save : w.teach}</button>
    </div>
  </div>`;
  document.body.append(scrim);
  const $ = (sel) => scrim.querySelector(sel);
  const text = $("#teachText");
  const source = edit ? edit.from : from;
  const keepSource = $("#teachFrom");
  if (source) {
    $("[data-source]").hidden = false;
    $("[data-source] span").textContent = w.source(local(source));
  }
  const returnTo = document.activeElement;
  text.value = edit ? local(edit.text) : local(startWith);

  const isCompany = () => state.to === "company";
  const person = () => (state.to && !isCompany() ? state.to : null);
  const liveChars = (p) =>
    p.memories.filter((m) => m !== edit).reduce((n, m) => n + local(m.text).length, 0);

  function paintAvatar() {
    const box = $("[data-av]");
    box.replaceChildren();
    const p = person();
    if (!p) {
      box.innerHTML = '<svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M2 6.5L8 2l6 4.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/></svg>';
      return;
    }
    box.append(spriteCanvas(p.species, 32));
  }

  function paintHead() {
    const p = person();
    $("[data-title]").textContent = edit
      ? w.titleEdit
      : isCompany() ? w.titleCompany : to === null ? w.titlePick(areaName(state.area)) : w.titleTo(p.name);
    $("[data-sub]").textContent = isCompany() ? w.subCompany : to === null && !edit ? w.subPick : w.subTo;
    paintAvatar();
  }

  function paintPicks() {
    const sec = $("[data-who]");
    sec.hidden = to !== null || !!edit;
    if (sec.hidden) return;
    const box = $("[data-picks]");
    box.innerHTML = STAFF.map((p) => {
      const n = p.memories.filter((m) => m.area === state.area).length;
      return `<button class="pick" type="button" role="radio" data-pick="${p.id}" aria-checked="${state.to === p}">
        <span class="radio"></span><span class="pick-t">${p.name}</span>
        <span class="pick-m">${p.role}</span><span class="pick-m">${w.inArea(n)}</span>
      </button>`;
    }).join("");
    for (const b of box.querySelectorAll("[data-pick]")) {
      b.addEventListener("click", () => {
        state.to = STAFF.find((p) => p.id === b.dataset.pick);
        for (const x of box.querySelectorAll("[data-pick]")) x.setAttribute("aria-checked", String(x === b));
        paintHead();
        paintEffect();
      });
    }
  }

  function paintAreas() {
    $("[data-areafield]").hidden = isCompany();
    const box = $("[data-areas]");
    box.innerHTML = list
      .map((a) => `<button class="opt" type="button" role="radio" data-area="${a.key}" aria-checked="${state.area === a.key}"></button>`)
      .join("");
    // A label the user wrote is text, never markup.
    box.querySelectorAll("[data-area]").forEach((b, i) => { b.textContent = list[i].label; });
    for (const b of box.querySelectorAll("[data-area]")) {
      b.addEventListener("click", () => {
        state.area = b.dataset.area;
        for (const x of box.querySelectorAll("[data-area]")) x.setAttribute("aria-checked", String(x === b));
        paintEffect();
      });
    }
  }

  function paintEffect() {
    const len = text.value.trim().length;
    $("[data-count]").textContent = text.value.length + "/" + MAX;
    const lines = [];
    const p = person();
    // A first memory in an area is what makes it theirs.
    if (p && state.area) {
      const knows = p.memories.some((m) => m !== edit && m.area === state.area);
      if (!knows) {
        lines.push(`<span class="gain"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.4l3.2 3.2L13 4.8"/></svg>${w.gainArea(p.name, areaName(state.area))}</span>`);
      }
    }
    if (p?.status === "leave") lines.push(`<span class="hint">${w.onLeave}</span>`);
    const before = p ? liveChars(p) : isCompany() ? carried : null;
    if (before !== null) lines.push(`<span class="hint">${w.carried(before, before + len)}</span>`);
    const box = $("[data-effect]");
    box.innerHTML = lines.join("");
    box.hidden = !lines.length;
    $("[data-ok]").disabled = !len || !state.to || (!isCompany() && !state.area);
  }

  function close() {
    scrim.remove();
    document.removeEventListener("keydown", onKey);
    returnTo?.focus?.({ preventScroll: true });
  }
  function onKey(e) {
    if (e.key === "Escape") close();
  }

  paintHead();
  paintPicks();
  paintAreas();
  paintEffect();

  text.addEventListener("input", paintEffect);
  scrim.addEventListener("pointerdown", (e) => { if (e.target === scrim) close(); });
  for (const b of scrim.querySelectorAll("[data-close]")) b.addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  $("[data-ok]").addEventListener("click", () => {
    const memory = { area: isCompany() ? null : state.area, text: text.value.trim(), from: source && keepSource.checked ? source : null };
    const target = state.to;
    close();
    onSave({ to: target, memory });
  });
  (to === null && !edit ? $("[data-pick]") : text).focus({ preventScroll: true });
}

/* ═══ the company's Claude Code, on every screen ═══ */
// When it stops for the whole company, every screen says so in one line above
// its content and nothing new starts. The sample keeps that state for the
// browsing session, so moving between screens does not undo it; ?claude=off
// turns it on from a link.
const RUNTIME_KEY = "mto.claude";
const RUNTIME = {
  off: (() => {
    const asked = new URLSearchParams(location.search).get("claude") === "off";
    try {
      if (asked) sessionStorage.setItem(RUNTIME_KEY, "off");
      return sessionStorage.getItem(RUNTIME_KEY) === "off";
    } catch {
      return asked;
    }
  })(),
};

function setRuntimeOff(off) {
  RUNTIME.off = off;
  try {
    if (off) sessionStorage.setItem(RUNTIME_KEY, "off");
    else sessionStorage.removeItem(RUNTIME_KEY);
  } catch {}
}

function runtimeBack() {
  setRuntimeOff(false);
  document.getElementById("runtimeLine")?.remove();
  const u = new URL(location.href);
  u.searchParams.delete("claude");
  history.replaceState(null, "", u);
  document.querySelector("#devbar [data-state]")?.setAttribute("aria-pressed", "false");
  document.dispatchEvent(new Event("runtimeback"));
}

(() => {
  const mount = () => {
    const body = document.querySelector(".app .body");
    if (!RUNTIME.off || !body) return;
    const w = WORDS[uiLang()].runtime;
    const line = document.createElement("div");
    line.id = "runtimeLine";
    line.className = "notice notice-stop";
    line.innerHTML = `<span class="n-ic">${PLUG}</span><span class="n-tx"><b>${w.off}</b><span>${w.offWhy}</span></span>
      <span class="n-acts"><button class="btn btn-secondary btn-sm" type="button">${w.recheck}</button></span>`;
    line.querySelector("button").addEventListener("click", runtimeBack);
    body.prepend(line);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();

/* ═══ copying a command ═══ */
// Whichever screen shows a command, its copy button takes the command without
// the prompt, one line each.
document.addEventListener("click", (e) => {
  const b = e.target.closest(".cmd .copy");
  if (!b) return;
  const text = b.parentElement.querySelector("pre").textContent.split("\n").map((l) => l.replace(/^\$\s*/, "")).join("\n");
  navigator.clipboard?.writeText(text).catch(() => {});
  b.textContent = WORDS[uiLang()].copied;
});

/* ═══ switching company ═══ */
// Every company on this computer is a file of its own. The names are the
// user's, so they are never translated.
const COMPANIES = [{ name: "My Tiny Office", open: true }, { name: "사이드 프로젝트 랩" }, { name: "동아리 앱" }];

(() => {
  const CHEVRON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5L8 10l3.5-3.5"/></svg>';
  const CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.4 8.4l3 3 6.2-6.6"/></svg>';
  const PLUS = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 3.5v9M3.5 8h9"/></svg>';
  const DOWN = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.5v8M4.6 7.4L8 10.8l3.4-3.4M3 13.5h10"/></svg>';
  // An empty slot keeps the other names in line with the open one.
  const BLANK = '<svg viewBox="0 0 16 16"></svg>';

  const mount = () => {
    const lang = uiLang();
    const w = WORDS[lang].companies;
    const suffix = lang === "en" ? "?lang=en" : "";
    for (const b of document.querySelectorAll(".side-switch")) {
      b.innerHTML = CHEVRON;
      b.setAttribute("aria-label", w.switch);
      b.addEventListener("click", () => openRowMenu(b, [
        ...COMPANIES.map((c) => ({ label: c.name, icon: c.open ? CHECK : BLANK, run: () => {} })),
        { label: w.create, icon: PLUS, run: () => { location.href = "first-run.html" + suffix + "#new"; } },
        { label: w.import, icon: DOWN, run: () => { location.href = "first-run.html" + suffix + "#import"; } },
      ]));
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();

/* ═══ the sample-page bar ═══ */
// Not part of the design: it only exists so the samples can be walked through.
// It builds itself so the pages cannot drift apart again, and it carries
// ?lang= from page to page, or choosing English would undo itself on the next
// click.
(() => {
  const HOME =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">' +
    '<path d="M2 6.5L8 2l6 4.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/></svg>';

  const GROUPS = [
    ["화면", "Screens", [["first-run", "첫 실행", "First run"], ["office", "사무실", "Office"], ["projects", "프로젝트", "Projects"], ["employees", "직원", "People"], ["company", "회사", "Company"], ["settings", "설정", "Settings"], ["plaza", "광장", "Plaza"]]],
    ["문서", "Reference", [["connect", "연결", "Connect"], ["components", "컴포넌트", "Components"], ["characters", "캐릭터", "Cast"]]],
  ];

  const here = (location.pathname.split("/").pop() || "index.html").replace(".html", "");
  const lang = new URLSearchParams(location.search).get("lang") === "en" ? "en" : "ko";

  const mount = () => {
    const nav = document.createElement("nav");
    nav.className = "devbar";
    nav.id = "devbar";
    nav.setAttribute("aria-label", lang === "en" ? "Sample pages" : "샘플 페이지");

    const sep = () => {
      const s = document.createElement("span");
      s.className = "sep";
      return s;
    };

    const home = document.createElement("a");
    home.className = "home";
    home.href = "index.html";
    home.innerHTML = HOME;
    home.setAttribute("aria-label", "Design System");
    if (here === "index") home.setAttribute("aria-current", "page");
    nav.append(home, sep());

    // The screens that show the company's Claude Code state. The switch sits
    // with them, and only where it changes something; reference pages have none.
    const STATEFUL = ["office", "projects", "employees", "company", "settings"];

    for (const [ko, en, items] of GROUPS) {
      const label = document.createElement("span");
      label.className = "grouplabel";
      label.textContent = lang === "en" ? en : ko;
      nav.append(label);
      for (const [key, kko, ken] of items) {
        const a = document.createElement("a");
        a.href = key + ".html";
        a.textContent = lang === "en" ? ken : kko;
        if (here === key) a.setAttribute("aria-current", "page");
        nav.append(a);
      }
      if (items.some(([key]) => key === "office") && STATEFUL.includes(here)) nav.append(runtimeSwitch());
      nav.append(sep());
    }

    function runtimeSwitch() {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.state = "claude";
      b.className = "toggle";
      b.textContent = lang === "en" ? "Claude Code signed out" : "Claude Code 로그아웃";
      b.setAttribute("aria-pressed", String(RUNTIME.off));
      b.addEventListener("click", () => {
        setRuntimeOff(!RUNTIME.off);
        const u = new URL(location.href);
        u.searchParams.delete("claude");
        location.href = u.toString();
      });
      return b;
    }

    const box = document.createElement("span");
    box.className = "lang";
    box.id = "lang";
    for (const [code, text] of [["ko", "한국어"], ["en", "English"]]) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.lang = code;
      b.textContent = text;
      b.setAttribute("aria-pressed", String(code === lang));
      b.addEventListener("click", () => {
        const u = new URL(location.href);
        u.searchParams.set("lang", code);
        location.href = u.toString();
      });
      box.append(b);
    }
    nav.append(box);
    document.body.append(nav);

    if (lang === "en") {
      // Anything that points at another page carries the language, including
      // the link to the page you are on and the index's preview frames.
      for (const el of document.querySelectorAll('a[href$=".html"], iframe[src$=".html"]')) {
        const attr = el.tagName === "IFRAME" ? "src" : "href";
        // keep it relative: reading .href would absolutise it
        const value = el.getAttribute(attr);
        if (!value.includes("?")) el.setAttribute(attr, value + "?lang=en");
      }
    }
  };

  document.documentElement.lang = lang;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
