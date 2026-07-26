import {
  applyCameraTransform,
  computeCameraTransform,
  scaleForParallaxBackground,
  scaleTransformIntensity,
} from "@/services/render/cameraEngine";
import type { RenderContext, RenderEngine } from "@/services/render/engine/types";

/** 背景グラデーションを描く。カメラの動きは前景より控えめに適用する（視差） */
export const backgroundEngine: RenderEngine = {
  name: "background",
  stage: "background",
  render({ ctx, scene, width, height, progress, emotion }: RenderContext) {
    const base = computeCameraTransform(scene.cameraMotion, progress, width, height);
    const transform = scaleTransformIntensity(base, emotion.cameraIntensity);
    applyCameraTransform(ctx, scaleForParallaxBackground(transform), width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, scene.background.colorFrom);
    gradient.addColorStop(1, scene.background.colorTo);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  },
};
