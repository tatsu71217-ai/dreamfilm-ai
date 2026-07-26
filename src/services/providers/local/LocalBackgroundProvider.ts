import { applyCameraTransform } from "@/services/director/directorEngine";
import type { BackgroundProvider } from "@/services/providers/types";
import type { RenderContext } from "@/services/render/engine/types";

/**
 * 背景をCanvasのグラデーションとして手続き的に描く既定実装。
 * どのカメラ変換を使うかはDirectorEngineが決定済み(directorCue)で、
 * ここではそれをCanvasへ適用して塗るだけ。
 */
export const localBackgroundProvider: BackgroundProvider = {
  kind: "background",
  id: "local-background",
  stage: "background",
  draw({ ctx, scene, width, height, directorCue }: RenderContext) {
    applyCameraTransform(ctx, directorCue.backgroundCameraTransform, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, scene.background.colorFrom);
    gradient.addColorStop(1, scene.background.colorTo);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  },
};
