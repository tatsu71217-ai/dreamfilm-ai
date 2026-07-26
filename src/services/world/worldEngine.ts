/**
 * WorldEngine: スタイル単位で「世界観」を統括するファサード。
 *
 * 実際の設定データは ThemeProvider / AssetProvider が持ち、WorldEngineは
 * それらへの単一の入口を提供するだけに徹する（具体クラスは参照しない）。
 * 呼び出し側は「スタイルIDだけ渡せば、そのスタイルの世界観に沿った
 * Background/Character/Camera/Lighting/Color/Effects/Audio の設定一式が得られる」。
 */

import { providers } from "@/services/providers/registry";
import type { AudioAsset, CharacterVariant, EffectAsset } from "@/types/asset";
import type { MotionId } from "@/types/motion";
import type { SceneMood } from "@/types/scene";
import type { StyleId } from "@/types/style";

export type {
  WorldColorBias,
  WorldConfig,
  WorldLightingBias,
} from "@/services/world/types";

/** スタイルIDから、そのスタイルの世界観設定一式を取得する（WorldEngineの唯一の入口） */
export function getWorldConfig(styleId: StyleId) {
  return providers.theme.getWorldConfig(styleId);
}

/** 選択可能なスタイル一覧 */
export function listStyleIds(): readonly StyleId[] {
  return providers.theme.listStyleIds();
}

/** キャラクターの見た目と情感からモーションを決める */
export function getCharacterMotion(variant: CharacterVariant, mood: SceneMood): MotionId {
  return providers.asset.pickCharacterMotion(variant, mood);
}

/** シーン切り替え時のSEを決める */
export function getSceneSoundEffect(
  styleId: StyleId,
  mood: SceneMood,
  sceneIndex: number,
  atTime: number,
): AudioAsset {
  return providers.asset.pickSceneSoundEffect(styleId, mood, sceneIndex, atTime);
}

/** シーンへ適用するエフェクトアセットを組み立てる */
export function getEffectAssets(styleId: StyleId, mood: SceneMood): EffectAsset[] {
  return providers.asset.buildEffectAssets(styleId, mood);
}
