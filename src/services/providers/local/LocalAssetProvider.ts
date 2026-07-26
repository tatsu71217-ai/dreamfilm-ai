import {
  buildEffectAssets,
  getBackgroundFallback,
  getCharacterDefault,
  pickCharacterMotion,
  pickSceneSoundEffect,
} from "@/services/assets/assetLibrary";
import type { AssetProvider } from "@/services/providers/types";

/**
 * 手続き生成の素材（背景/キャラ/モーション/SE/エフェクト）の既定値を供給する実装。
 * 実データは services/assets/assetLibrary.ts が持ち、ここはProvider契約への適合のみを担う。
 */
export const localAssetProvider: AssetProvider = {
  kind: "asset",
  id: "local-asset",
  getBackgroundFallback,
  getCharacterDefault,
  pickCharacterMotion,
  pickSceneSoundEffect,
  buildEffectAssets,
};
