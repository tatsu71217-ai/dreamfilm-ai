/**
 * 動画プロジェクト（1本の夢映像の設計図）の型定義。
 *
 * `VideoProject` は「どう描けば動画になるか」が完全に確定した状態であり、
 * これさえあればレンダラーは外部通信なしで映像を再現できる。
 * 保存しておけば再生成・再編集ができる。
 */

import type { AudioAsset } from "@/types/asset";
import type { DreamScene, SubtitleTrack } from "@/types/scene";
import type { AudioProfile, StyleId } from "@/types/style";

/** ユーザーが選択できる動画の尺 */
export type VideoDurationSeconds = 15 | 20 | 30;

export const VIDEO_DURATION_OPTIONS: readonly VideoDurationSeconds[] = [15, 20, 30];

export const DEFAULT_VIDEO_DURATION: VideoDurationSeconds = 15;

/**
 * 尺ごとのシーン数の範囲（指示書「シーン生成ルール」に対応）。
 * - 15秒: 3〜4シーン
 * - 20秒: 4〜5シーン
 * - 30秒: 5〜6シーン
 */
export const SCENE_COUNT_RANGE: Record<
  VideoDurationSeconds,
  { min: number; max: number }
> = {
  15: { min: 3, max: 4 },
  20: { min: 4, max: 5 },
  30: { min: 5, max: 6 },
};

/** 動画の向き。スマホ視聴を前提に縦を既定とする */
export interface VideoResolution {
  width: number;
  height: number;
}

/** 端末負荷を抑えつつ十分に見られる解像度 */
export const DEFAULT_VIDEO_RESOLUTION: VideoResolution = { width: 720, height: 1280 };

export const DEFAULT_VIDEO_FPS = 30;

export interface VideoProject {
  id: string;
  dreamId: string;
  styleId: StyleId;
  durationSeconds: VideoDurationSeconds;
  resolution: VideoResolution;
  fps: number;
  scenes: DreamScene[];
  subtitleTrack: SubtitleTrack;
  /** 手続き生成BGMの設定 */
  audio: AudioProfile;
  /** 効果音（シーン切り替え等） */
  soundEffects: AudioAsset[];
  createdAt: string;
}

/** 動画尺に対して妥当なシーン数か検証する（分割ロジックの自己点検用） */
export function isValidSceneCount(
  sceneCount: number,
  duration: VideoDurationSeconds,
): boolean {
  const range = SCENE_COUNT_RANGE[duration];
  return sceneCount >= range.min && sceneCount <= range.max;
}
