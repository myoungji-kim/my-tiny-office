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
  plant: ["wwwwwwwwwwwwwwww","wWWWWWWWWWWWWWWw","wwwwwKKKKwwwwwww","wwwKKnnnnKKwwwww","wwKnNNnnnnNKwwww","wwKnnnnnnnnKwwww","wwKNnnnKnnnNKwww","wwwKnnnKnnnKwwww","wwwwKnnKnnKwwwww","wwwwwKKKKKwwwwww","wwwwKKpppKKwwwww","wwwwKppppppKwwww","wwwwKppppppKwwww","wwwwwKKKKKKwwwww","dddddddddddddddd","wwwwwwwwwwwwwwww"],
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
  ready:     { color: "var(--info)" },
  available: { color: "var(--ok)" },
  vacation:  { color: "var(--faint)" },
};


/* ═══ the sample-page bar ═══ */
// Not part of the design: it only exists so the samples can be walked through.
// It builds itself so the seven pages cannot drift apart again, and it carries
// ?lang= from page to page, or choosing English would undo itself on the next
// click.
(() => {
  const HOME =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">' +
    '<path d="M2 6.5L8 2l6 4.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/></svg>';

  const GROUPS = [
    ["화면", "Screens", [["first-run", "첫 실행", "First run"], ["office", "사무실", "Office"], ["employees", "직원", "People"]]],
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
