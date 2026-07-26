import { applyCameraTransform } from "@/services/director/directorEngine";
import type { CharacterProvider } from "@/services/providers/types";
import type { RenderContext } from "@/services/render/engine/types";

/**
 * キャラクターをシルエット図形として手続き的に描く既定実装。
 * カメラ変換・モーションオフセットはDirectorEngineが決定済み(directorCue)で、
 * ここではそれを使って描くだけ。
 */
export const localCharacterProvider: CharacterProvider = {
  kind: "character",
  id: "local-character",
  stage: "midground",
  draw({ ctx, scene, width, height, directorCue }: RenderContext) {
    applyCameraTransform(ctx, directorCue.cameraTransform, width, height);

    for (const character of scene.characters) {
      const motion = directorCue.motionFor(character);
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
