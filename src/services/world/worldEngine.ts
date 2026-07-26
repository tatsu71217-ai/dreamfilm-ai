/**
 * WorldEngine: スタイル単位で「世界観」を統括するファサード。
 *
 * これまで background/character の既定値は assetLibrary.ts、camera/effects/audio/
 * subtitleの傾向は types/style.ts の StylePreset に分かれて置かれていた。
 * WorldEngineはこれらを1つの `WorldConfig` へ束ね、他のEngineが
 * 「スタイルIDだけ渡せば、そのスタイルの世界観に沿った設定一式が得られる」
 * 単一の入口を持てるようにする（Background/Character/Camera/Lighting/Color/
 * Effects/Audioの一括制御）。
 *
 * Lighting/ColorGradingはこれまでEmotionEngine（情感）だけで決まっており、
 * 同じ「穏やか」な感情でもホラー風と美しい風で見た目の差が付かない問題があった。
 * WorldConfigに「スタイルの基調」(baseLighting/baseColorGrading)を追加し、
 * LightingEngine/ColorGradingEngineでEmotionEngineの値と合成することで、
 * スタイルの世界観が常に画面に反映されるようにしている。
 */

import {
  buildEffectAssets,
  getBackgroundFallback,
  getCharacterDefault,
  pickCharacterMotion,
  pickSceneSoundEffect,
} from "@/services/assets/assetLibrary";
import type { LightingTone } from "@/services/render/engine/emotionEngine";
import type { AudioAsset, BackgroundVariant, CharacterVariant } from "@/types/asset";
import type { MotionId } from "@/types/motion";
import type {
  CameraMotion,
  EffectKind,
  ScenePacing,
  SceneMood,
  TransitionKind,
} from "@/types/scene";
import { getStylePreset, type AudioProfile, type StyleId, type StylePalette, type SubtitleStyle } from "@/types/style";

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

/**
 * スタイルの世界観としての基調照明。
 * 「同じ気分でも、ホラー風は常に暗め・美しい風は常に明るめ」という土台を作る。
 */
const BASE_LIGHTING: Record<StyleId, WorldLightingBias> = {
  anime: { brightness: 0.05, warmth: 0.05 },
  real: { brightness: 0, warmth: 0 },
  horror: { brightness: -0.2, warmth: -0.1 },
  cute: { brightness: 0.12, warmth: 0.08 },
  beautiful: { brightness: 0.1, warmth: 0.1 },
  manga: { brightness: 0, warmth: -0.05 },
  mascot: { brightness: 0.08, warmth: 0.05 },
  fantasy: { brightness: -0.05, warmth: 0.02 },
};

const BASE_COLOR_GRADING: Record<StyleId, WorldColorBias> = {
  anime: { saturationMultiplier: 1.1, tint: "#4fa8e8", tintStrengthBias: 0.02 },
  real: { saturationMultiplier: 0.95, tint: "#888888", tintStrengthBias: 0 },
  horror: { saturationMultiplier: 0.8, tint: "#2a1b22", tintStrengthBias: 0.08 },
  cute: { saturationMultiplier: 1.15, tint: "#ff8fc5", tintStrengthBias: 0.03 },
  beautiful: { saturationMultiplier: 1.05, tint: "#ffe9b0", tintStrengthBias: 0.05 },
  manga: { saturationMultiplier: 0.7, tint: "#000000", tintStrengthBias: 0.05 },
  mascot: { saturationMultiplier: 1.1, tint: "#ff9b42", tintStrengthBias: 0.02 },
  fantasy: { saturationMultiplier: 1.1, tint: "#8a5fd1", tintStrengthBias: 0.08 },
};

/** スタイルIDから、そのスタイルの世界観設定一式を取得する（WorldEngineの唯一の入口） */
export function getWorldConfig(styleId: StyleId): WorldConfig {
  const style = getStylePreset(styleId);
  return {
    styleId: style.id,
    label: style.label,
    palette: style.palette,
    pacing: style.pacing,
    cameraMotions: style.cameraMotions,
    transitions: style.transitions,
    effects: style.effects,
    subtitle: style.subtitle,
    audio: style.audio,
    backgroundFallback: getBackgroundFallback(style.id),
    characterDefault: getCharacterDefault(style.id),
    baseLighting: BASE_LIGHTING[style.id],
    baseColorGrading: BASE_COLOR_GRADING[style.id],
  };
}

/** WorldConfig越しにキャラクターのモーションを決める（assetLibraryへの委譲） */
export function getCharacterMotion(styleId: StyleId, mood: SceneMood): MotionId {
  return pickCharacterMotion(getWorldConfig(styleId).characterDefault, mood);
}

/** WorldConfig越しにシーン切り替えSEを決める（assetLibraryへの委譲） */
export function getSceneSoundEffect(
  styleId: StyleId,
  mood: SceneMood,
  sceneIndex: number,
  atTime: number,
): AudioAsset {
  return pickSceneSoundEffect(styleId, mood, sceneIndex, atTime);
}

/** WorldConfig越しにエフェクトアセットを組み立てる（assetLibraryへの委譲） */
export function getEffectAssets(styleId: StyleId, mood: SceneMood) {
  return buildEffectAssets(styleId, mood);
}
