import type { DreamScene } from "@/types/scene";

/** 1シーンをCanvasへ描画する（現時点は背景グラデーション＋キャラ図形のみの最小実装） */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: DreamScene,
  width: number,
  height: number,
  tSeconds: number,
): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, scene.background.colorFrom);
  gradient.addColorStop(1, scene.background.colorTo);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const zoom = 1 + 0.05 * (tSeconds / Math.max(0.001, scene.endTime - scene.startTime));
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-width / 2, -height / 2);

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
