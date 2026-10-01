// Digits are read as Korean numbers: 영, 일, 삼, 육, 칠, 팔 end in a final consonant.
const DIGIT_FINAL = new Set("013678");
// An acronym is read letter by letter: 엘, 엠, 엔, 알 end in one.
const LETTER_FINAL = new Set("LMNR");

// Whether the last syllable has a final consonant, which picks 이/가, 을/를, 은/는.
// Names and task titles are often English, so an English ending is read the
// way Korean speakers say it: team 팀, plan 플랜, greeting 그리팅, chat 챗 end in
// one; test 테스트, check 체크, Docker 도커, Mocha 모카 do not.
export function hasBatchim(word: string): boolean {
  const w = word.trimEnd().replace(/[\s.,!?'"`’”)\]]+$/u, "");
  const c = w.charCodeAt(w.length - 1);
  if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 !== 0;
  const last = w.at(-1) ?? "";
  if (/[0-9]/.test(last)) return DIGIT_FINAL.has(last);
  if (/(^|[^A-Za-z])[A-Z]$|[A-Z]{2}$/.test(w)) return LETTER_FINAL.has(last);
  const lower = w.toLowerCase();
  return /(ng|[mnl])$/.test(lower) || /[aeiou][kpt]$/.test(lower);
}

export const withParticle = (word: string, afterFinal: string, afterVowel: string): string =>
  word + (hasBatchim(word) ? afterFinal : afterVowel);
