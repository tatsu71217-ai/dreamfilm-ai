/**
 * AssetLibrary: スタイルごとに背景・人物・SE・エフェクトの既定値を切り替える。
 * sceneSplitter は語彙マッチが外れた場合、ここの既定値にフォールバックする。
 */

import type {
  AudioAsset,
  BackgroundVariant,
  CharacterVariant,
  EffectAsset,
  SoundEffectVariant,
} from "@/types/asset";
import type { MotionId } from "@/types/motion";
import type { SceneMood } from "@/types/scene";
import { getStylePreset, type StyleId } from "@/types/style";
import { generateId } from "@/utils/id";

/** 語彙が一致しない場合に使う背景（スタイルの世界観に合わせる） */
const BACKGROUND_FALLBACK: Record<StyleId, BackgroundVariant> = {
  anime: "sky",
  real: "room",
  horror: "corridor",
  cute: "field",
  beautiful: "night-sky",
  manga: "city",
  mascot: "field",
};

/** 語彙が一致しない場合に使うキャラクター */
const CHARACTER_DEFAULT: Record<StyleId, CharacterVariant> = {
  anime: "none",
  real: "none",
  horror: "silhouette",
  cute: "mascot",
  beautiful: "none",
  manga: "figure",
  mascot: "mascot",
};

/** スタイルごとのSEプール */
const SOUND_EFFECT_POOL: Record<StyleId, SoundEffectVariant[]> = {
  anime: ["whoosh", "chime"],
  real: ["whoosh"],
  horror: ["heartbeat", "impact"],
  cute: ["chime", "pop"],
  beautiful: ["chime"],
  manga: ["impact", "whoosh"],
  mascot: ["pop", "chime"],
};

export function getBackgroundFallback(styleId: StyleId): BackgroundVariant {
  return BACKGROUND_FALLBACK[styleId];
}

export function getCharacterDefault(styleId: StyleId): CharacterVariant {
  return CHARACTER_DEFAULT[styleId];
}

/** キャラクターの見た目(variant)と情感から、MotionLibraryのプリセットを1つ選ぶ */
export function pickCharacterMotion(variant: CharacterVariant, mood: SceneMood): MotionId {
  if (variant === "creature") {
    return mood === "tense" ? "run" : "turn";
  }
  if (variant === "mascot") {
    return mood === "joyful" || mood === "uplifting" ? "jump" : "idle";
  }
  if (variant === "crowd") {
    return mood === "tense" ? "run" : "walk";
  }
  // silhouette / figure など人物系
  if (mood === "tense") return "run";
  if (mood === "uplifting") return "float";
  if (mood === "sad") return "idle";
  return "walk";
}

/** シーン切り替え時に鳴らすSEを1件選ぶ */
export function pickSceneSoundEffect(
  styleId: StyleId,
  mood: SceneMood,
  sceneIndex: number,
  atTime: number,
): AudioAsset {
  const pool = SOUND_EFFECT_POOL[styleId];
  const variant = mood === "tense" && pool.includes("impact") ? "impact" : pool[sceneIndex % pool.length];

  return {
    id: generateId(),
    kind: "audio",
    label: variant,
    variant,
    atTime,
    gain: mood === "tense" ? 0.6 : 0.4,
  };
}

/** スタイルの常時エフェクトをEffectAssetへ変換する */
export function buildEffectAssets(styleId: StyleId, mood: SceneMood): EffectAsset[] {
  const style = getStylePreset(styleId);
  const intensity = mood === "tense" ? 0.85 : mood === "calm" ? 0.4 : 0.6;

  return style.effects.map((variant) => ({
    id: generateId(),
    kind: "effect" as const,
    label: variant,
    variant,
    intensity,
    color: style.palette.accent,
  }));
}
