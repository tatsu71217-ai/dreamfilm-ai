/**
 * 指定した文字数で文字列を切り詰め、省略記号を付与する。
 * DreamCardの本文冒頭表示などで使用。
 */
export function truncateText(text: string, maxLength: number): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}…`;
}
