import type { SubtitleProvider } from "@/services/providers/types";
import type { RenderContext } from "@/services/render/engine/types";

/** 字幕を描く既定実装。カメラの動きの影響を受けない最前面オーバーレイ */
export const localSubtitleProvider: SubtitleProvider = {
  kind: "subtitle",
  id: "local-subtitle",
  stage: "overlay",
  draw({ ctx, scene, width, height }: RenderContext) {
    if (!scene.subtitle) return;

    ctx.fillStyle = "#ffffff";
    ctx.font = `${Math.round(height * 0.04)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(scene.subtitle.text, width / 2, height * 0.9);
  },
};
