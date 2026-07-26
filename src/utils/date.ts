const LONG_DATE_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * 「2026年7月23日(木)」のような長い日付表記を返す。主にHome画面のヘッダーで使用。
 */
export function formatDateLongJP(date: Date | string): string {
  const target = typeof date === "string" ? new Date(date) : date;
  return LONG_DATE_FORMATTER.format(target);
}

/**
 * 「2026/07/23」のような短い日付表記を返す。カード等の限られたスペースで使用。
 */
export function formatDateShortJP(date: Date | string): string {
  const target = typeof date === "string" ? new Date(date) : date;
  return SHORT_DATE_FORMATTER.format(target);
}
