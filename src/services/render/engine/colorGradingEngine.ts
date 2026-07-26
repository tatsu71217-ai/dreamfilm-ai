import type { RenderContext, RenderEngine } from "@/services/render/engine/types";

/**
 * EmotionEngineの色調パラメータを画面へ適用する。
 * Canvas 2Dにはピクセル単位の彩度調整APIが無いため、
 * 「彩度を落とす=グレーを重ねる」「ティント=指定色を重ねる」という近似で表現する。
 */
export const colorGradingEngine: RenderEngine = {
  name: "color-grading",
  stage: "foreground",
  render({ ctx, width, height, emotion }: RenderContext) {
    const { saturation, tint, tintStrength } = emotion.colorGrading;

    if (saturation < 1) {
      ctx.fillStyle = "#808080";
      ctx.globalAlpha = (1 - saturation) * 0.35;
      ctx.fillRect(0, 0, width, height);
    }

    if (tintStrength > 0.001) {
      ctx.fillStyle = tint;
      ctx.globalAlpha = tintStrength;
      ctx.fillRect(0, 0, width, height);
    }
  },
};
