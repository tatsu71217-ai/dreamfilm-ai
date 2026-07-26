/**
 * アプリ全体で使う一意なID文字列を生成する汎用ユーティリティ。
 * crypto.randomUUID が利用できない環境（古いブラウザ等）向けのフォールバックを含む。
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
