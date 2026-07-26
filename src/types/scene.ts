/**
 * 「レンダリング可能なシーン」の型定義。
 *
 * services/ai/types.ts の `DreamMovieScene` は AI が考えた**創作上の**シーン記述
 * （あらすじ・ナレーション・各種Prompt）であり、そのままでは描画できない。
 * ここで定義する `DreamScene` は、それを **タイムライン上で実際に描くための指示**
 * （尺・背景・キャラ・エフェクト・カメラ・字幕）へ変換したものである。
 * 両者は別概念なので型も分けている。
 */

import type {
  BackgroundAsset,
  CharacterAsset,
  EffectAsset,
} from "@/types/asset";

/** カットの速さの傾向 */
export type ScenePacing = "fast" | "normal" | "slow";

/** シーン中のカメラワーク。Canvasの描画変換として実装する */
export type CameraMotion =
  | "still"
  | "zoom-in"
  | "zoom-out"
  | "pan-left"
  | "pan-right"
  | "pan-up"
  | "pan-down"
  /** ゆっくり漂うような複合移動 */
  | "drift"
  /** 小刻みな揺れ（ホラー等） */
  | "shake"
  /** わずかな回転 */
  | "rotate"
  /** 背景と前景で速度差をつけた水平移動 */
  | "parallax";

/** シーン間のつなぎ */
export type TransitionKind =
  | "cut"
  | "fade"
  | "crossfade"
  | "zoom-blur"
  | "slide"
  | "flash";

/** シーンに重ねる映像エフェクト */
export type EffectKind =
  | "particles"
  | "fog"
  | "light-rays"
  | "noise"
  | "vignette"
  | "sparkle"
  | "rain"
  | "bokeh"
  | "halftone"
  | "speed-lines";

/**
 * シーンの情感。夢の感情解析結果から決まり、
 * 背景の色調・カメラ・エフェクトの選択に影響する。
 */
export type SceneMood =
  | "calm"
  | "joyful"
  | "mysterious"
  | "tense"
  | "sad"
  | "uplifting";

/** 字幕1件。表示時間はシーンの尺に収まる */
export interface SubtitleCue {
  text: string;
  /** 動画先頭からの秒数 */
  startTime: number;
  endTime: number;
}

/** 動画全体の字幕トラック */
export interface SubtitleTrack {
  cues: SubtitleCue[];
}

/** レンダリング対象の1シーン */
export interface DreamScene {
  sceneId: string;
  /** 0始まりの並び順 */
  index: number;
  /** 動画先頭からの開始秒 */
  startTime: number;
  /** 動画先頭からの終了秒 */
  endTime: number;
  background: BackgroundAsset;
  characters: CharacterAsset[];
  effects: EffectAsset[];
  cameraMotion: CameraMotion;
  /** このシーンへ入るときのトランジション。先頭シーンは必ず "fade" */
  transitionIn: TransitionKind;
  subtitle: SubtitleCue | null;
  mood: SceneMood;
  /** このシーンの元になった夢の一文。再編集時の手がかりとして保持する */
  sourceText: string;
}

/** シーンの尺（秒） */
export function sceneDuration(scene: DreamScene): number {
  return scene.endTime - scene.startTime;
}
