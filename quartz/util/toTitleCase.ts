
export function toTitleCase(str : string) {
  const smallWords = new Set([
    "a", "an", "and", "as", "at", "but", "by", "for", "from",
    "in", "into", "nor", "of", "on", "or", "over", "per",
    "the", "to", "via", "with"
  ]);

  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      // Always capitalize the first and last word
      if (index === 0 || index === str.split(/\s+/).length - 1) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }

      // Lowercase "small words"
      if (smallWords.has(word)) {
        return word;
      }

      // Capitalize everything else
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
