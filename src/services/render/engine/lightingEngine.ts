import type { RenderUnit } from "@/services/providers/types";
import type { RenderContext } from "@/services/render/engine/types";

/**
 * DirectorEngineが決定した明暗・寒暖(directorCue.lighting)を、
 * 画面全体への光の重ねがけとして表現する後処理ステージ。
 * Lighting自体はEmotionEngine/WorldEngineを直接呼び出さない。
 */
export const lightingEngine: RenderUnit = {
  id: "lighting",
  stage: "foreground",
  draw({ ctx, width, height, directorCue }: RenderContext) {
    const { brightness, warmth } = directorCue.lighting;

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
