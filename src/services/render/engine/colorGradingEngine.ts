import type { RenderUnit } from "@/services/providers/types";
import type { RenderContext } from "@/services/render/engine/types";

/**
 * DirectorEngineが決定した色調(directorCue.colorGrading)を画面へ適用する後処理ステージ。
 * Canvas 2Dにはピクセル単位の彩度調整APIが無いため、
 * 「彩度を落とす=グレーを重ねる」「ティント=指定色を重ねる」という近似で表現する。
 * ColorGrading自体はEmotionEngine/WorldEngineを直接呼び出さない。
 */
export const colorGradingEngine: RenderUnit = {
  id: "color-grading",
  stage: "foreground",
  draw({ ctx, width, height, directorCue }: RenderContext) {
    const { saturation, tint, tintStrength, worldTint, worldTintStrength } = directorCue.colorGrading;

    if (saturation < 1) {
      ctx.fillStyle = "#808080";
      ctx.globalAlpha = Math.min(1, (1 - saturation) * 0.35);
      ctx.fillRect(0, 0, width, height);
    }

    // 情感のティントを優先しつつ、スタイル基調のティントも薄く重ねて世界観を保つ
    if (tintStrength > 0.001) {
      ctx.fillStyle = tint;
      ctx.globalAlpha = tintStrength;
      ctx.fillRect(0, 0, width, height);
    }

    if (worldTintStrength > 0.001) {
      ctx.fillStyle = worldTint;
      ctx.globalAlpha = worldTintStrength;
      ctx.fillRect(0, 0, width, height);
    }
  },
};
