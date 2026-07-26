/**
 * 動画の尺・解像度など、動画プロジェクト共通の型・定数定義。
 */

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
