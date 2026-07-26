import {
  applyCameraTransform,
  computeCameraTransform,
  scaleForParallaxBackground,
} from "@/services/render/cameraEngine";
import type { DreamScene } from "@/types/scene";

/** 1シーンをCanvasへ描画する */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: DreamScene,
  width: number,
  height: number,
  tSeconds: number,
): void {
  const duration = Math.max(0.001, scene.endTime - scene.startTime);
  const progress = tSeconds / duration;
  const cameraTransform = computeCameraTransform(scene.cameraMotion, progress, width, height);

  // 背景レイヤー（視差のため前景より控えめに動かす）
  ctx.save();
  applyCameraTransform(ctx, scaleForParallaxBackground(cameraTransform), width, height);
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, scene.background.colorFrom);
  gradient.addColorStop(1, scene.background.colorTo);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 前景レイヤー（キャラクター）
  ctx.save();
  applyCameraTransform(ctx, cameraTransform, width, height);

  for (const character of scene.characters) {
    ctx.fillStyle = character.color;
    const cx = width * character.xRatio;
    const r = height * character.scale * 0.5;
    ctx.beginPath();
    ctx.ellipse(cx, height * scene.background.horizonRatio, r * 0.5, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  if (scene.subtitle && tSeconds >= 0) {
    ctx.fillStyle = "#ffffff";
    ctx.font = `${Math.round(height * 0.04)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(scene.subtitle.text, width / 2, height * 0.9);
  }
}
