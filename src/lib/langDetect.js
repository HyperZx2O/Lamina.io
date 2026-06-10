// src/lib/langDetect.js
// Detect language of a given text based on Bangla Unicode block frequency.
// Returns "bn" for Bangla and "en" for English (default).

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
