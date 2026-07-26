import type { RenderContext, RenderEngine } from "@/services/render/engine/types";
import { getWorldConfig } from "@/services/world/worldEngine";

/**
 * EmotionEngine（情感）とWorldEngine（スタイルの基調）の明暗・寒暖を合成し、
 * 画面全体への光の重ねがけとして表現する。
 */
export const lightingEngine: RenderEngine = {
  name: "lighting",
  stage: "foreground",
  render({ ctx, scene, width, height, emotion }: RenderContext) {
    const world = getWorldConfig(scene.styleId).baseLighting;
    const brightness = clamp(-1, 1, emotion.lighting.brightness + world.brightness);
    const warmth = clamp(-1, 1, emotion.lighting.warmth + world.warmth);

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

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}
