/**
 * RenderEngineアーキテクチャの共通型。
 *
 * 【設計方針】
 * RenderEngine（canvasSceneRenderer）はSceneを直接描画しない。
 * 各責務（背景/カメラ/人物/エフェクト/字幕/…）を独立したProvider/後処理ステージに分離し、
 * RenderEngineはそれらをステージ順に呼び出すだけの合成役（RenderPipeline）に徹する。
 * 新しい演出は既存Providerを変更せず、新しいProviderの追加または
 * EffectProviderへの登録だけで拡張できる（100種類以上の演出を見込んだ設計）。
 *
 * 各Provider/後処理ステージは他のEngine（Camera/Emotion/World/Motion）を
 * 直接呼び出さず、DirectorEngineが決定した `DirectorCue` を読むだけにする。
 */

import type { DirectorCue } from "@/services/director/directorEngine";
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
  /** DirectorEngineがこのフレームぶん決定した演出指示 */
  directorCue: DirectorCue;
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
