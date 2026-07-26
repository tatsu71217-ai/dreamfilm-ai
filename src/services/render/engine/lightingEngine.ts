import type { RenderContext, RenderEngine } from "@/services/render/engine/types";

/** EmotionEngineの明暗・寒暖パラメータを、画面全体への光の重ねがけとして表現する */
export const lightingEngine: RenderEngine = {
  name: "lighting",
  stage: "foreground",
  render({ ctx, width, height, emotion }: RenderContext) {
    const { brightness, warmth } = emotion.lighting;

    if (Math.abs(brightness) > 0.001) {
      ctx.fillStyle = brightness > 0 ? "#ffffff" : "#000000";
      ctx.globalAlpha = Math.min(1, Math.abs(brightness)) * 0.5;
      ctx.fillRect(0, 0, width, height);
    }

    if (Math.abs(warmth) > 0.001) {
      ctx.fillStyle = warmth > 0 ? "#ff9933" : "#3388ff";
      ctx.globalAlpha = Math.min(1, Math.abs(warmth)) * 0.18;
      ctx.fillRect(0, 0, width, height);
    }
  },
};
