import type { RenderUnit } from "@/services/providers/types";
import type { RenderContext } from "@/services/render/engine/types";
import { getWorldConfig } from "@/services/world/worldEngine";

/**
 * EmotionEngine（情感）とWorldEngine（スタイルの基調）の色調を合成して画面へ適用する後処理ステージ。
 * Canvas 2Dにはピクセル単位の彩度調整APIが無いため、
 * 「彩度を落とす=グレーを重ねる」「ティント=指定色を重ねる」という近似で表現する。
 */
export const colorGradingEngine: RenderUnit = {
  id: "color-grading",
  stage: "foreground",
  draw({ ctx, scene, width, height, emotion }: RenderContext) {
    const world = getWorldConfig(scene.styleId).baseColorGrading;
    const saturation = Math.max(0, emotion.colorGrading.saturation * world.saturationMultiplier);

    if (saturation < 1) {
      ctx.fillStyle = "#808080";
      ctx.globalAlpha = Math.min(1, (1 - saturation) * 0.35);
      ctx.fillRect(0, 0, width, height);
    }

    // 情感のティントを優先しつつ、スタイル基調のティントも薄く重ねて世界観を保つ
    if (emotion.colorGrading.tintStrength > 0.001) {
      ctx.fillStyle = emotion.colorGrading.tint;
      ctx.globalAlpha = emotion.colorGrading.tintStrength;
      ctx.fillRect(0, 0, width, height);
    }

    const worldTintStrength = Math.max(0, world.tintStrengthBias);
    if (worldTintStrength > 0.001) {
      ctx.fillStyle = world.tint;
      ctx.globalAlpha = worldTintStrength;
      ctx.fillRect(0, 0, width, height);
    }
  },
};
