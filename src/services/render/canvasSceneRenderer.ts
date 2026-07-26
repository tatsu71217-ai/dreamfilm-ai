import { providers } from "@/services/providers/registry";
import { colorGradingEngine } from "@/services/render/engine/colorGradingEngine";
import { deriveEmotionProfile } from "@/services/render/engine/emotionEngine";
import { lightingEngine } from "@/services/render/engine/lightingEngine";
import { RenderPipeline } from "@/services/render/engine/renderPipeline";
import type { DreamScene } from "@/types/scene";

/**
 * RenderEngine本体。Sceneを直接描画せず、Provider（背景/キャラ/エフェクト/字幕）と
 * 後処理ステージ（照明/色調）をステージ順に組み合わせるだけの合成役。
 * 具体クラスは参照せず、差し替えは services/providers/registry.ts で完結する。
 */
const pipeline = new RenderPipeline([
  providers.background,
  providers.character,
  providers.effect,
  lightingEngine,
  colorGradingEngine,
  providers.subtitle,
]);

/** 1シーンをCanvasへ描画する */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: DreamScene,
  width: number,
  height: number,
  tSeconds: number,
): void {
  const duration = Math.max(0.001, scene.endTime - scene.startTime);
  pipeline.render({
    ctx,
    scene,
    width,
    height,
    tSeconds,
    progress: tSeconds / duration,
    emotion: deriveEmotionProfile(scene.mood),
  });
}
