// Whether the last syllable has a final consonant, which picks 이/가, 을/를, 은/는.
export function hasBatchim(word: string): boolean {
  const c = word.charCodeAt(word.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
}

export const withParticle = (word: string, afterFinal: string, afterVowel: string): string =>
  word + (hasBatchim(word) ? afterFinal : afterVowel);
