/**
 * 16進数カラーコードの共通ユーティリティ。
 *
 * services/scene/sceneSplitter.ts（背景色の調整）と
 * services/providers/local/LocalEffectProvider.ts（エフェクトのグラデーション）で
 * 同じ「#hex文字列をRGBへ分解する」処理が重複していたため、ここへ集約する。
 */
export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/** "#rgb" または "#rrggbb" 形式の文字列をRGB各チャンネル(0〜255)へ分解する */
export function parseHexColor(hex: string): RgbColor {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;

  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
}
