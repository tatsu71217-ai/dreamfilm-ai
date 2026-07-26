import { planFrame } from "@/services/director/directorEngine";
import { providers } from "@/services/providers/registry";
import { colorGradingEngine } from "@/services/render/engine/colorGradingEngine";
import { lightingEngine } from "@/services/render/engine/lightingEngine";
import { RenderPipeline } from "@/services/render/engine/renderPipeline";
import type { DreamScene } from "@/types/scene";

/**
 * RenderEngine本体。Sceneを直接描画せず、Provider（背景/キャラ/エフェクト/字幕）と
 * 後処理ステージ（照明/色調）をステージ順に組み合わせるだけの合成役。
 * 具体クラスは参照せず、差し替えは services/providers/registry.ts で完結する。
 * 演出の決定はDirectorEngineに一任し、ここではその結果(DirectorCue)を配るだけ。
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
  const progress = tSeconds / duration;

  pipeline.render({
    ctx,
    scene,
    width,
    height,
    tSeconds,
    progress,
    directorCue: planFrame(scene, progress, width, height),
  });
}
