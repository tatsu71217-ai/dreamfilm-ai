/**
 * data/*Repository.ts 各所で重複していた「LocalStorageへJSON配列を読み書きする」定型処理の共通化。
 *
 * 各リポジトリの公開インターフェース・エラーメッセージ文言・フォールバック挙動（読み込み失敗時は
 * 空配列を返す／書き込み失敗時はログを残してthrowする）は一切変更せず、重複していた実装だけを
 * ここへ集約している。
 */

/**
 * 保存済みのJSON配列を読み込む。
 * キーが存在しない・JSONとして壊れている・配列でない場合はすべて空配列を返す。
 */
export function readJsonArray<T>(
  storageKey: string,
  invalidFormatWarning: string,
  readErrorMessage: string,
): T[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(invalidFormatWarning);
      return [];
    }
    return parsed as T[];
  } catch (error) {
    console.error(readErrorMessage, error);
    return [];
  }
}

/**
 * 値をJSONとしてLocalStorageへ書き込む。
 * 失敗時はログを残したうえで、ユーザー向けメッセージを持つErrorを投げる。
 */
export function writeJsonOrThrow<T>(
  storageKey: string,
  value: T,
  writeErrorLog: string,
  thrownErrorMessage: string,
): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (error) {
    console.error(writeErrorLog, error);
    throw new Error(thrownErrorMessage);
  }
}
