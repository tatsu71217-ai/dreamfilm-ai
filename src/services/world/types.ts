/**
 * 世界観設定（WorldConfig）の型定義。
 *
 * 実装（データ本体）は ThemeProvider 側が持つ。ここを独立ファイルにしているのは、
 * worldEngine（ファサード）と LocalThemeProvider（実装）が互いを参照しても
 * 実行時の循環importが起きないようにするため。
 */

import type { LightingTone } from "@/services/render/engine/emotionEngine";
import type { BackgroundVariant, CharacterVariant } from "@/types/asset";
import type {
  CameraMotion,
  EffectKind,
  ScenePacing,
  TransitionKind,
} from "@/types/scene";
import type { AudioProfile, StyleId, StylePalette, SubtitleStyle } from "@/types/style";

/** スタイルの基調となる照明。EmotionEngineの値と加算合成する */
export type WorldLightingBias = LightingTone;

/** スタイルの基調となる色調バイアス。EmotionEngineの値と合成する */
export interface WorldColorBias {
  /** 1.0が無補正。EmotionEngineの彩度に乗算する */
  saturationMultiplier: number;
  tint: string;
  /** EmotionEngineのtintStrengthに加算する */
  tintStrengthBias: number;
}

/** スタイル単位で一括制御する世界観設定 */
export interface WorldConfig {
  styleId: StyleId;
  label: string;
  palette: StylePalette;
  pacing: ScenePacing;
  cameraMotions: CameraMotion[];
  transitions: TransitionKind[];
  effects: EffectKind[];
  subtitle: SubtitleStyle;
  audio: AudioProfile;
  backgroundFallback: BackgroundVariant;
  characterDefault: CharacterVariant;
  baseLighting: WorldLightingBias;
  baseColorGrading: WorldColorBias;
}
