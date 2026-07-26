import type { RenderContext, RenderEngine } from "@/services/render/engine/types";

/** 字幕を描く。カメラの動きの影響を受けない最前面オーバーレイ */
export const subtitleEngine: RenderEngine = {
  name: "subtitle",
  stage: "overlay",
  render({ ctx, scene, width, height }: RenderContext) {
    if (!scene.subtitle) return;

    ctx.fillStyle = "#ffffff";
    ctx.font = `${Math.round(height * 0.04)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(scene.subtitle.text, width / 2, height * 0.9);
  },
};
