import type { BackgroundProvider } from "@/services/providers/types";
import {
  applyCameraTransform,
  computeCameraTransform,
  scaleForParallaxBackground,
  scaleTransformIntensity,
} from "@/services/render/cameraEngine";
import type { RenderContext } from "@/services/render/engine/types";

/**
 * 背景をCanvasのグラデーションとして手続き的に描く既定実装。
 * カメラの動きは前景より控えめに適用して視差を出す。
 */
export const localBackgroundProvider: BackgroundProvider = {
  kind: "background",
  id: "local-background",
  stage: "background",
  draw({ ctx, scene, width, height, progress, emotion }: RenderContext) {
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
