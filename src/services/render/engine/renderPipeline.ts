import { RENDER_STAGE_ORDER, type RenderContext, type RenderEngine } from "@/services/render/engine/types";

/**
 * 登録されたEngine群をステージ順に実行する合成役。
 * RenderPipeline自身は「何を描くか」を一切知らない（Engineの並び替え・実行のみ）。
 */
export class RenderPipeline {
  private readonly engines: RenderEngine[];

  constructor(engines: RenderEngine[]) {
    this.engines = engines;
  }

  render(context: RenderContext): void {
    for (const stage of RENDER_STAGE_ORDER) {
      for (const engine of this.engines) {
        if (engine.stage !== stage) continue;
        context.ctx.save();
        engine.render(context);
        context.ctx.restore();
      }
    }
  }
}
