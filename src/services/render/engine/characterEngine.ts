import {
  applyCameraTransform,
  computeCameraTransform,
  scaleTransformIntensity,
} from "@/services/render/cameraEngine";
import type { RenderContext, RenderEngine } from "@/services/render/engine/types";

/** キャラクター（シルエット/図形）を描く。カメラの動きをそのまま適用する */
export const characterEngine: RenderEngine = {
  name: "character",
  stage: "midground",
  render({ ctx, scene, width, height, progress, emotion }: RenderContext) {
    const base = computeCameraTransform(scene.cameraMotion, progress, width, height);
    const transform = scaleTransformIntensity(base, emotion.cameraIntensity);
    applyCameraTransform(ctx, transform, width, height);

    for (const character of scene.characters) {
      ctx.fillStyle = character.color;
      const cx = width * character.xRatio;
      const r = height * character.scale * 0.5;
      ctx.beginPath();
      ctx.ellipse(cx, height * scene.background.horizonRatio, r * 0.5, r, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
};
