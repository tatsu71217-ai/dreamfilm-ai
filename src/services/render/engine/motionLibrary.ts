/**
 * MotionLibrary: 人物・動物・オブジェクトいずれのキャラクターにも使える
 * プリセット方式のモーション集。CharacterEngineがキャラクターごとの
 * MotionId から、ある時点でのオフセット（位置・回転・縦横比の伸縮）を得るために使う。
 *
 * 画像アセットを持たない設計方針（services/scene/sceneSplitter.ts と同じ）のため、
 * モーションも「単純な図形をどう動かすか」という手続き的なパラメータで表現する。
 */

import type { MotionId } from "@/types/motion";

/** ある時点でのキャラクター描画オフセット。単位は「キャラクターの高さ」に対する比率 */
export interface MotionOffset {
  /** 横方向の移動量（キャラクター高さ比） */
  x: number;
  /** 縦方向の移動量（キャラクター高さ比。負が上方向） */
  y: number;
  /** ラジアン */
  rotation: number;
  /** 縦方向の伸縮倍率（歩行の上下動やジャンプの溜め・伸びに使う） */
  squashY: number;
}

/** progress はシーン内経過割合 0〜1 */
type MotionFn = (progress: number) => MotionOffset;

const IDENTITY: MotionOffset = { x: 0, y: 0, rotation: 0, squashY: 1 };

const registry = new Map<MotionId, MotionFn>();

registry.set("idle", () => IDENTITY);

registry.set("walk", (progress) => {
  const phase = progress * Math.PI * 2 * 3;
  return { x: 0, y: -Math.abs(Math.sin(phase)) * 0.03, rotation: Math.sin(phase) * 0.03, squashY: 1 };
});

registry.set("run", (progress) => {
  const phase = progress * Math.PI * 2 * 5;
  return { x: 0, y: -Math.abs(Math.sin(phase)) * 0.06, rotation: Math.sin(phase) * 0.05, squashY: 1 };
});

registry.set("jump", (progress) => {
  // シーン内で「しゃがみ→跳躍→着地」を1回だけ行う
  const arc = Math.sin(progress * Math.PI);
  const crouch = progress < 0.08 ? (0.08 - progress) / 0.08 : 0;
  return { x: 0, y: -arc * 0.18, rotation: 0, squashY: 1 - crouch * 0.15 + arc * 0.1 };
});

registry.set("turn", (progress) => {
  const phase = progress * Math.PI * 2;
  return { x: Math.sin(phase) * 0.05, y: 0, rotation: Math.sin(phase) * 0.5, squashY: 1 };
});

registry.set("float", (progress) => {
  const phase = progress * Math.PI * 2 * 2;
  return { x: Math.sin(phase * 0.5) * 0.02, y: Math.sin(phase) * 0.05, rotation: 0, squashY: 1 };
});

registry.set("fly", (progress) => {
  const phase = progress * Math.PI * 2 * 4;
  return {
    x: progress * 0.3 - 0.15,
    y: Math.sin(phase) * 0.06 - 0.05,
    rotation: Math.sin(phase) * 0.04,
    squashY: 1 - Math.abs(Math.sin(phase)) * 0.08,
  };
});

registry.set("swim", (progress) => {
  const phase = progress * Math.PI * 2 * 3;
  return { x: Math.sin(phase * 0.5) * 0.08, y: Math.sin(phase) * 0.025, rotation: Math.sin(phase) * 0.08, squashY: 1 };
});

/** シーン内経過割合(0〜1)から、指定モーションのオフセットを求める */
export function computeMotionOffset(motion: MotionId | undefined, progress: number): MotionOffset {
  if (!motion) return IDENTITY;
  const fn = registry.get(motion);
  return fn ? fn(Math.max(0, Math.min(1, progress))) : IDENTITY;
}
