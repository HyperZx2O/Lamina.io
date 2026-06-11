// src/lib/langDetect.js
// Detect language of a given text based on Bangla Unicode block frequency.
// Returns "bn" for Bangla and "en" for English (default).
// Also exposes detectBanglish() which distinguishes English from Banglish
// (Bengali phonetically written in Latin letters, e.g. "amar naam rahim").

/**
 * Count characters that fall within the Bangla Unicode range U+0980–U+09FF.
 * @param {string} text
 * @returns {number} count of Bangla characters
 */
function countBanglaChars(text) {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x0980 && code <= 0x09ff) {
      count++;
    }
  }
  return count;
}

/**
 * Detect language based on proportion of Bangla characters.
 * If more than 20% of the characters are Bangla, return "bn" else "en".
 * Empty or whitespace‑only strings default to English.
 * @param {string} text
 * @returns {'bn'|'en'}
 */
export function detectLanguage(text) {
  if (!text) return 'en';
  const total = text.length;
  if (total === 0) return 'en';
  const banglaCount = countBanglaChars(text);
  const ratio = banglaCount / total;
  return ratio > 0.2 ? 'bn' : 'en';
}

/**
 * Small Banglish (Roman-letter Bengali) wordlist used to distinguish
 * "amar naam rahim" (Banglish) from "my name is rahim" (English).
 * The list is intentionally common, short, and recognisable.
 */
const BANGLISH_HINTS = [
  'amar', 'amader', 'tumara', 'tomar', 'tomader', 'apnar', 'apnader',
  'tumi', 'tumi', 'apni', 'amra', 'tomra', 'apnara', 'ora', 'o',
  'naam', 'nam', 'namar', 'boyos', 'boyosh', 'basha', 'basa', 'griha',
  'bari', 'ghor', 'sokal', 'bikal', 'dupur', 'raat', 'din', 'bochor',
  'mas', 'soptah', 'hafta', 'aj', 'aaj', 'kal', 'oggi', 'ekhon', 'ekhon',
  'ekhoni', 'pore', 'age', 'pichhone', 'ekhane', 'okhane', 'khane',
  'khub', 'khubi', 'onek', 'ektu', 'beshi', 'kom', 'olpo', 'boro', 'choto',
  'bhalo', 'bhalo', 'valo', 'kharap', 'khub', 'shundor', 'shundor',
  'sundor', 'sohoj', 'kothin', 'sop', 'kemon', 'kibhabe', 'keno', 'keno',
  'ki', 'ke', 'kake', 'kar', 'kar', 'kothay', 'kothao', 'kokhono', 'kokhono',
  'kono', 'kichu', 'kichhu', 'kichu', 'aro', 'ar', 'ebong', 'o', 'ba',
  'na', 'na', 'chai', 'chai', 'pabo', 'paben', 'pabe', 'jabe', 'jabo',
  'jachhe', 'jachchen', 'jachhilo', 'gelo', 'giyechilo', 'achi', 'achho',
  'achen', 'achilo', 'holo', 'hocche', 'hobe', 'korbo', 'korben', 'kore',
  'koren', 'kora', 'korechi', 'korechilam', 'bolte', 'bolo', 'bolen',
  'bolchi', 'bollam', 'shikhi', 'shikhbo', 'shikhle', 'porle', 'pore',
  'porar', 'pore', 'school', 'skul', 'class', 'klas', 'bhai', 'vai', 'bon',
  'bua', 'chacha', 'dada', 'dadi', 'nana', 'nani', 'baba', 'maa', 'mama',
  'apu', 'apu', 'vai', 'bon', 'bhai', 'bondhu', 'bondhura', 'priyo',
  'sathi', 'sathi', 'friend', 'school', 'kaj', 'kaaj', 'office', 'bazar',
  'dokan', 'doctor', 'daktar', 'bhai', 'amake', 'tomake', 'apnake', 'mujhhe',
  'mujhke', 'tujhhe', 'tujhke', 'tor', 'amar', 'tomar', 'apnar', 'jonne',
  'jonno', 'karone', 'kar', 'jonno', 'kar', 'kotha', 'kotha', 'kothata',
  'kothao', 'bangladeshi', 'desh', 'rajdhani', 'sopno', 'swapno', 'sokal',
  'duita', 'ekta', 'tin', 'tin', 'char', 'panch', 'choy', 'saat', 'at',
  'nol', 'dash', 'ek', 'dui', 'teen', 'char', 'paanch', 'chhoy', 'shaat',
  'aat', 'noy', 'dosh',
  'rahim', 'karim', 'jamal', 'kamal', 'abul', 'firoz', 'salim', 'habib',
  'hasina', 'khaleda', 'sheikh', 'mujib', 'fazlul', 'haq', 'huq', 'iqbal',
];

/**
 * Detect whether the text is English, Bangla, or Banglish.
 *  - Bangla   → has a non-trivial proportion of Bangla Unicode (U+0980–U+09FF)
 *  - Banglish → no Bangla script AND contains a recognisable Banglish token
 *  - English  → everything else (Latin script without Banglish markers)
 * Whitespace, digits, and punctuation are ignored.
 * @param {string} text
 * @returns {'en'|'bn'|'banglish'}
 */
export function detectBanglish(text) {
  if (!text) return 'en';
  const stripped = text.trim();
  if (!stripped) return 'en';
  if (countBanglaChars(stripped) > 0) return 'bn';
  const lower = stripped.toLowerCase();
  // Tokenise on non-letter boundaries.
  const tokens = lower.split(/[^a-z']+/).filter(Boolean);
  if (tokens.length === 0) return 'en';
  for (const t of tokens) {
    if (BANGLISH_HINTS.includes(t)) return 'banglish';
  }
  return 'en';
}

/**
 * If the text contains characters from a script other than English (Latin)
 * or Bangla, return the name of the detected language. Otherwise return null.
 * @param {string} text
 * @returns {string|null}
 */
export function findNonAllowedLanguage(text) {
  if (!text) return null;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (
      (code >= 0x0020 && code <= 0x007f) ||   // Basic Latin (printable ASCII)
      (code >= 0x0080 && code <= 0x00ff) ||   // Latin-1 Supplement
      (code >= 0x0100 && code <= 0x024f) ||   // Latin Extended A / B
      (code >= 0x0980 && code <= 0x09ff) ||   // Bangla
      code === 0x000a ||                       // newline
      code === 0x000d                          // carriage return
    ) continue;

    if (code >= 0x0900 && code <= 0x097f) return 'Hindi';
    if (code >= 0x0600 && code <= 0x06ff) return 'Arabic/Urdu';
    if (code >= 0x0750 && code <= 0x077f) return 'Urdu';
    if (code >= 0x0400 && code <= 0x04ff) return 'Russian';
    if (code >= 0x0370 && code <= 0x03ff) return 'Greek';
    if (code >= 0x0e00 && code <= 0x0e7f) return 'Thai';
    if (code >= 0x0b80 && code <= 0x0bff) return 'Tamil';
    if (code >= 0x0c00 && code <= 0x0c7f) return 'Telugu';
    if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)) return 'Chinese';
    if (code >= 0x3040 && code <= 0x309f) return 'Japanese';
    if (code >= 0x30a0 && code <= 0x30ff) return 'Japanese';
    if (code >= 0xac00 && code <= 0xd7af) return 'Korean';
    if (code >= 0x0a80 && code <= 0x0aff) return 'Gujarati';
    if (code >= 0x0b00 && code <= 0x0b7f) return 'Odia';
    if (code >= 0x0d00 && code <= 0x0d7f) return 'Malayalam';
    if (code >= 0x0c80 && code <= 0x0cff) return 'Kannada';
    if (code >= 0x0f00 && code <= 0x0fff) return 'Tibetan';
    if (code >= 0x1780 && code <= 0x17ff) return 'Khmer';
    if (code >= 0x1a00 && code <= 0x1a1f) return 'Burmese';
    return 'unknown';
  }
  return null;
}
