export function estimateReadingTimeSeconds(text: string, wordsPerMinute = 150): number {
  if (!text.trim()) return 0;
  const wordCount = text.trim().split(/\s+/).length;
  return Math.ceil((wordCount / wordsPerMinute) * 60);
}

export function truncateStoryText(text: string, maxLength = 100): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}
