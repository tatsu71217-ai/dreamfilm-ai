/**
 * EmotionEngine: シーンの情感(SceneMood)を解析し、他Engine向けの演出パラメータへ変換する。
 * このEngine自体は何も描画しない。CameraEngine/EffectEngine/SubtitleEngine/AudioEngine/
 * LightingEngine/ColorGradingEngineが、ここで算出した値を読んで演出の強弱を調整する。
 */

import type { SceneMood } from "@/types/scene";

/** 照明の傾向。0が無補正で、符号で明暗/寒暖を表す */
export interface LightingTone {
  /** -1(暗い)〜1(明るい) */
  brightness: number;
  /** -1(寒色)〜1(暖色) */
  warmth: number;
}

/** 色調補正の傾向（Canvas 2Dでの簡易近似のためのパラメータ） */
export interface ColorGrading {
  /** 1.0が無補正。1未満で彩度を落とす */
  saturation: number;
  /** ティントとして重ねる色 */
  tint: string;
  /** ティントの強さ 0〜1 */
  tintStrength: number;
}

export interface EmotionProfile {
  mood: SceneMood;
  /** CameraEngineの揺れ・移動量に掛ける倍率 */
  cameraIntensity: number;
  /** EffectEngineの各エフェクト強度に掛ける倍率 */
  effectIntensity: number;
  /** SubtitleEngineの強調度（フォントの太さ・縁取りの強さに反映） 0〜1 */
  subtitleEmphasis: number;
  lighting: LightingTone;
  colorGrading: ColorGrading;
  /** AudioEngineのテンポに掛ける倍率 */
  audioTempoMultiplier: number;
  /** AudioEngineの音量に掛ける倍率 */
  audioGainMultiplier: number;
}

const EMOTION_PROFILES: Record<SceneMood, Omit<EmotionProfile, "mood">> = {
  calm: {
    cameraIntensity: 0.8,
    effectIntensity: 0.8,
    subtitleEmphasis: 0.4,
    lighting: { brightness: 0.05, warmth: 0.05 },
    colorGrading: { saturation: 1.0, tint: "#88aacc", tintStrength: 0.05 },
    audioTempoMultiplier: 1.0,
    audioGainMultiplier: 1.0,
  },
  joyful: {
    cameraIntensity: 1.1,
    effectIntensity: 1.0,
    subtitleEmphasis: 0.6,
    lighting: { brightness: 0.15, warmth: 0.2 },
    colorGrading: { saturation: 1.15, tint: "#ffdd88", tintStrength: 0.12 },
    audioTempoMultiplier: 1.1,
    audioGainMultiplier: 1.05,
  },
  mysterious: {
    cameraIntensity: 1.0,
    effectIntensity: 1.1,
    subtitleEmphasis: 0.5,
    lighting: { brightness: -0.1, warmth: -0.1 },
    colorGrading: { saturation: 0.9, tint: "#6644aa", tintStrength: 0.15 },
    audioTempoMultiplier: 0.9,
    audioGainMultiplier: 0.95,
  },
  tense: {
    cameraIntensity: 1.4,
    effectIntensity: 1.3,
    subtitleEmphasis: 0.85,
    lighting: { brightness: -0.25, warmth: -0.15 },
    colorGrading: { saturation: 0.85, tint: "#661111", tintStrength: 0.2 },
    audioTempoMultiplier: 1.2,
    audioGainMultiplier: 1.1,
  },
  sad: {
    cameraIntensity: 0.7,
    effectIntensity: 0.8,
    subtitleEmphasis: 0.5,
    lighting: { brightness: -0.15, warmth: -0.05 },
    colorGrading: { saturation: 0.75, tint: "#334466", tintStrength: 0.15 },
    audioTempoMultiplier: 0.85,
    audioGainMultiplier: 0.9,
  },
  uplifting: {
    cameraIntensity: 1.2,
    effectIntensity: 1.1,
    subtitleEmphasis: 0.6,
    lighting: { brightness: 0.2, warmth: 0.1 },
    colorGrading: { saturation: 1.1, tint: "#ffeeaa", tintStrength: 0.1 },
    audioTempoMultiplier: 1.15,
    audioGainMultiplier: 1.05,
  },
};

export function deriveEmotionProfile(mood: SceneMood): EmotionProfile {
  return { mood, ...EMOTION_PROFILES[mood] };
}
