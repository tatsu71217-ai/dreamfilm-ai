/**
 * 汎用的な小さい数値ユーティリティ。
 *
 * services/scene/sceneSplitter.ts（シーンへの秒数配分）と
 * services/ai/movieHeuristics.ts（Movie Packageのシーンへの秒数配分）で
 * 同じ「合計値をN個へ均等配分し、端数を前方から1つずつ乗せる」処理が重複していたため、
 * ここへ集約する。
 */

/**
 * `total` を `count` 個へ均等配分する。割り切れない端数は前方の要素から1つずつ乗せるため、
 * 返り値の合計は必ず `total` と一致する。
 */
export function distributeEvenly(total: number, count: number): number[] {
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, index) => (index < remainder ? base + 1 : base));
}
