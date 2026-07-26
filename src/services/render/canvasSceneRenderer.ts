import { backgroundEngine } from "@/services/render/engine/backgroundEngine";
import { characterEngine } from "@/services/render/engine/characterEngine";
import { effectEngine } from "@/services/render/engine/effectEngine";
import { RenderPipeline } from "@/services/render/engine/renderPipeline";
import { subtitleEngine } from "@/services/render/engine/subtitleEngine";
import type { DreamScene } from "@/types/scene";

/**
 * RenderEngine本体。Sceneを直接描画せず、各Engineをステージ順に組み合わせるだけの合成役。
 * 新しい演出はEngineの追加、またはEffectEngineへの登録だけで拡張できる。
 */
const pipeline = new RenderPipeline([backgroundEngine, characterEngine, effectEngine, subtitleEngine]);

/** 1シーンをCanvasへ描画する */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: DreamScene,
  width: number,
  height: number,
  tSeconds: number,
): void {
  const duration = Math.max(0.001, scene.endTime - scene.startTime);
  pipeline.render({ ctx, scene, width, height, tSeconds, progress: tSeconds / duration });
}
