/**
 * RenderEngineアーキテクチャの共通型。
 *
 * 【設計方針】
 * RenderEngine（canvasSceneRenderer）はSceneを直接描画しない。
 * 各責務（背景/カメラ/人物/エフェクト/字幕/…）を独立した「Engine」に分離し、
 * RenderEngineはそれらをステージ順に呼び出すだけの合成役（RenderPipeline）に徹する。
 * 新しい演出は既存Engineを変更せず、新しいEngineの追加または
 * EffectEngineへの登録だけで拡張できる（100種類以上の演出を見込んだ設計）。
 */

import type { DreamScene } from "@/types/scene";

/** 1フレームぶんの描画に必要な情報 */
export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  scene: DreamScene;
  width: number;
  height: number;
  /** シーン開始からの経過秒 */
  tSeconds: number;
  /** シーン内での経過割合 0〜1 */
  progress: number;
}

/**
 * 描画順のステージ。
 * 後ろのステージほど手前に描かれる（background → midground → foreground → overlay）。
 */
export type RenderStage = "background" | "midground" | "foreground" | "overlay";

export const RENDER_STAGE_ORDER: readonly RenderStage[] = [
  "background",
  "midground",
  "foreground",
  "overlay",
];

/** 1つの描画責務を表すEngineの共通インターフェース */
export interface RenderEngine {
  readonly name: string;
  readonly stage: RenderStage;
  render(context: RenderContext): void;
}
