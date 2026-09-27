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
  vacation:  { color: "var(--faint)" },
};


/* ═══ the words more than one screen says ═══ */
// The menu, the statuses, the areas and the team names are the same words
// wherever they appear. Each page spreads these into its own dictionary and
// adds only what is its own.

const WORDS = {
  ko: {
    nav: { office: "사무실", projects: "프로젝트", people: "직원", company: "회사", settings: "설정" },
    companies: { switch: "회사 바꾸기", create: "새 회사 만들기", import: "기존 회사 가져오기" },
    status: { working: "업무 중", reviewing: "검토 중", available: "대기 중", vacation: "휴가 중" },
    areas: { arch: "아키텍처", types: "타입 안정성", db: "데이터베이스", security: "보안", l10n: "로컬라이제이션", product: "기획", quality: "품질" },
    teams: { backend: "백엔드팀", frontend: "프론트엔드팀", planning: "기획팀", design: "디자인팀" },
    hire: {
      title: "직원 고용", sub: "새 동료가 빈 책상에 앉아요.",
      species: "어떤 친구인가요", name: "이름", nameHint: "짧을수록 좋아요. 나중에 바꿀 수 있어요.",
      role: "역할", team: "팀", noTeam: "팀 없음", cancel: "취소",
      editTitle: "정보 바꾸기", editSub: "외형과 이름, 역할, 팀을 바꿔요.", save: "저장",
      hireAs: (n) => (n ? n + " 고용하기" : "고용하기"),
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
      cancel: "취소", teach: "알려주기", save: "저장",
    },
  },
  en: {
    nav: { office: "Office", projects: "Projects", people: "People", company: "Company", settings: "Settings" },
    companies: { switch: "Switch company", create: "Start a new company", import: "Import an existing company" },
    status: { working: "Working", reviewing: "Reviewing", available: "Free", vacation: "On leave" },
    areas: { arch: "Architecture", types: "Type safety", db: "Database", security: "Security", l10n: "Localization", product: "Product", quality: "Quality" },
    teams: { backend: "Backend", frontend: "Frontend", planning: "Planning", design: "Design" },
    hire: {
      title: "Hire", sub: "Someone new takes a free desk.",
      species: "Who are they?", name: "Name", nameHint: "Shorter is better. You can change it later.",
      role: "Role", team: "Team", noTeam: "No team", cancel: "Cancel",
      editTitle: "Edit details", editSub: "Change how they look, their name, role and team.", save: "Save",
      hireAs: (n) => (n ? "Hire " + n : "Hire"),
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
    task: { ko: "결제 API 에러 응답 구조 변경", en: "Change the payment API error shape" }, done: 41, reviews: 18,
    style: [{ ko: "설명은 짧게, 코드로 보여줘", en: "Keep explanations short; show me code" }, { ko: "테스트를 먼저 써", en: "Write the test first" }, { ko: "PR은 300줄을 넘기지 않아요. 넘으면 쪼개요.", en: "Keep a PR under 300 lines. Split it if it grows." }],
    memories: [
      { area: "db", text: { ko: "복합 인덱스는 컬럼 순서가 중요해요. (a,b)와 (b,a)는 다른 인덱스예요.", en: "Composite indexes care about column order. (a,b) is not (b,a)." }, from: { ko: "결제 조회가 느린 이슈", en: "the slow payment lookup" }, used: 14 },
      { area: "db", text: { ko: "결제 테이블은 월 단위로 파티셔닝돼 있어요. 전체 스캔 쿼리는 쓰지 마세요.", en: "The payments table is partitioned by month. Never write a full scan." }, from: null, used: 9 },
      { area: "arch", text: { ko: "도메인 레이어에서 Date.now()를 쓰지 않아요. 현재 시각은 인자로 받아요.", en: "No Date.now() in the domain layer. The current time arrives as an argument." }, from: { ko: "PR #4102", en: "PR #4102" }, used: 22 },
      { area: "types", text: { ko: "any를 쓰지 않아요. 모르면 unknown으로 두고 좁혀 나가요.", en: "No any. Start from unknown and narrow it down." }, from: null, used: 11 }
    ] },
  { id: "p2", name: "두부", species: "bunny", role: "Frontend Engineer",
    team: "frontend", status: "working", joined: "2026. 4. 15.",
    task: { ko: "로그인 폼 구현", en: "Build the login form" }, done: 33, reviews: 9,
    style: [{ ko: "완성 전에 스크린샷을 남겨", en: "Leave a screenshot before you call it done" }, { ko: "버튼은 항상 pill이에요. 8px 모서리를 쓰지 않아요.", en: "Buttons are always pills. Never an 8px corner." }],
    memories: [
      { area: "l10n", text: { ko: "한글에는 letter-spacing을 걸지 않아요. 자소가 벌어져 보여요.", en: "Never track Hangul. It pulls the jamo of a syllable apart." }, from: { ko: "사이드바 자간이 깨진 이슈", en: "the broken sidebar tracking" }, used: 18 },
      { area: "l10n", text: { ko: "같은 문장도 영문이 한글보다 길어요. 고정 너비를 쓰지 않아요.", en: "The same sentence runs longer in English. Avoid fixed widths." }, from: { ko: "PR #4180", en: "PR #4180" }, used: 6 },
    ] },
  { id: "p3", name: "단풍", species: "deer", role: "Product Manager",
    team: "planning", status: "working", joined: "2026. 2. 20.",
    task: { ko: "API 문서 작성", en: "Write the API docs" }, done: 27, reviews: 22,
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
    team: "frontend", status: "vacation", joined: "2026. 1. 12.",
    back: { ko: "3일 후 복귀", en: "Back in 3 days" }, done: 52, reviews: 14,
    style: [{ ko: "두 번 할 일이면 자동화해", en: "If you will do it twice, automate it" }, { ko: "배포 전에 typecheck · lint · test 세 개를 모두 돌려요.", en: "Run typecheck, lint and test before any deploy." }],
    memories: [
      { area: "security", text: { ko: "비밀값은 .env에 두고 절대 커밋하지 않아요.", en: "Secrets live in .env and are never committed." }, from: null, used: 9 },
    ] },
];

/* ═══ the roster in the sidebar ═══ */
// Presence: whichever screen you are on, you can still see who is in and what
// they are doing. That is the whole job, so it is one implementation and every
// screen shows the same five people with the same status.

function mountRoster(el, onPick) {
  for (const p of STAFF) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "member";
    b.dataset.id = p.id;
    b.innerHTML =
      '<span class="av"><canvas aria-hidden="true" width="22" height="22"></canvas></span>' +
      "<span>" + p.name + "</span>" +
      '<span class="dot ' + p.status + '"></span>';

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
function openHire({ team = null, teams = null, roles = null, edit = null, onSave }) {
  const lang = uiLang();
  const w = WORDS[lang].hire;
  const local = (v) => (v && typeof v === "object" ? v[lang] : v);
  const state = { species: edit ? SPECIES.get(edit.species) : null };

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
    if (e.key === "Escape") close();
  }

  sync();
  name.addEventListener("input", sync);
  scrim.addEventListener("pointerdown", (e) => { if (e.target === scrim) close(); });
  for (const b of scrim.querySelectorAll("[data-close]")) b.addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  $("[data-ok]").addEventListener("click", () => {
    const hired = { name: name.value.trim(), species: state.species.key, role: $("#hireRole").value, team: $("#hireTeam").value || null };
    close();
    onSave(hired);
  });
  (edit ? name : cast.firstElementChild).focus({ preventScroll: true });
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

/* ═══ confirming what cannot be undone ═══ */

function openConfirm({ title, body, cancel, confirm, onConfirm }) {
  const scrim = document.createElement("div");
  scrim.className = "scrim";
  scrim.innerHTML = `<div class="dlg dlg-bad" role="alertdialog" aria-modal="true">
    <span class="d-ic"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.2l6 11H2z"/><path d="M8 6.6v3M8 11.4v.1"/></svg></span>
    <div class="d-body">
      <p class="d-t"></p><p class="d-d"></p>
      <div class="dlg-acts">
        <button class="btn btn-secondary btn-md" type="button" data-close></button>
        <button class="btn btn-danger btn-md" type="button" data-ok></button>
      </div>
    </div>
  </div>`;
  const $ = (sel) => scrim.querySelector(sel);
  $(".d-t").textContent = title;
  $(".d-d").textContent = body;
  $("[data-close]").textContent = cancel;
  $("[data-ok]").textContent = confirm;
  const returnTo = document.activeElement;
  const close = () => { scrim.remove(); document.removeEventListener("keydown", onKey); returnTo?.focus?.({ preventScroll: true }); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.body.append(scrim);
  document.addEventListener("keydown", onKey);
  scrim.addEventListener("pointerdown", (e) => { if (e.target === scrim) close(); });
  $("[data-close]").addEventListener("click", close);
  $("[data-ok]").addEventListener("click", () => { close(); onConfirm(); });
  $("[data-close]").focus();
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
function openTeach({ to = null, area = null, from = null, edit = null, carried = null, areas = null, onSave }) {
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
  text.value = edit ? local(edit.text) : "";

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
    ["화면", "Screens", [["first-run", "첫 실행", "First run"], ["office", "사무실", "Office"], ["projects", "프로젝트", "Projects"], ["employees", "직원", "People"], ["company", "회사", "Company"], ["settings", "설정", "Settings"]]],
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
      nav.append(sep());
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
