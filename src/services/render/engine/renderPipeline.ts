import type { RenderUnit } from "@/services/providers/types";
import { RENDER_STAGE_ORDER, type RenderContext } from "@/services/render/engine/types";

/**
 * 登録された描画単位（Provider・後処理ステージ）をステージ順に実行する合成役。
 * RenderPipeline自身は「何を描くか」を一切知らず、具体クラスも参照しない。
 */
export class RenderPipeline {
  private readonly units: RenderUnit[];

  constructor(units: RenderUnit[]) {
    this.units = units;
  }

  render(context: RenderContext): void {
    for (const stage of RENDER_STAGE_ORDER) {
      for (const unit of this.units) {
        if (unit.stage !== stage) continue;
        context.ctx.save();
        unit.draw(context);
        context.ctx.restore();
      }
    }
  }
}
