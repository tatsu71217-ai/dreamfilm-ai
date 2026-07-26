import {
  applyCameraTransform,
  computeCameraTransform,
  scaleTransformIntensity,
} from "@/services/render/cameraEngine";
import type { RenderContext, RenderEngine } from "@/services/render/engine/types";
import { computeMotionOffset } from "@/services/render/engine/motionLibrary";

/** キャラクター（シルエット/図形）を描く。カメラの動きとMotionLibraryのモーションを適用する */
export const characterEngine: RenderEngine = {
  name: "character",
  stage: "midground",
  render({ ctx, scene, width, height, progress, emotion }: RenderContext) {
    const base = computeCameraTransform(scene.cameraMotion, progress, width, height);
    const transform = scaleTransformIntensity(base, emotion.cameraIntensity);
    applyCameraTransform(ctx, transform, width, height);

    for (const character of scene.characters) {
      const motion = computeMotionOffset(character.motion, progress);
      const r = height * character.scale * 0.5;
      const cx = width * character.xRatio + width * motion.x;
      const cy = height * scene.background.horizonRatio + r * motion.y;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(motion.rotation);
      ctx.fillStyle = character.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.5, r * motion.squashY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },
};
